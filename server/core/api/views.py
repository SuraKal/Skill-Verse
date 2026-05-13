from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from django.db.models import Count
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import generics, permissions, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import Course, CourseCategory, Invitation, InvitationStatus, Membership, Organization, OrganizationRole
from .permissions import (
    HasOrganizationManagementAccess,
    HasOrganizationReadAccess,
    IsInvitationRecipient,
)
from .serializers import (
    DashboardSerializer,
    InvitationDetailSerializer,
    InvitationRespondSerializer,
    InvitationSerializer,
    MembershipSerializer,
    CourseSerializer,
    OrganizationDashboardSerializer,
    OrganizationCreateSerializer,
    OrganizationSerializer,
    PublicBootstrapSerializer,
    RegisterSerializer,
    UserSerializer,
)
from .services.invitation_service import accept_invitation, create_invitation, reject_invitation

User = get_user_model()


class SkillVerseTokenSerializer(TokenObtainPairSerializer):
    username_field = 'email'

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['email'] = user.email
        token['full_name'] = user.get_full_name()
        return token

    def validate(self, attrs):
        email = attrs.get('email') or attrs.get('username')
        password = attrs.get('password')
        user = User.objects.filter(email__iexact=email).first()
        if user is None:
            raise serializers.ValidationError('No account found for these credentials.')

        authenticated_user = authenticate(
            request=self.context.get('request'),
            username=user.username,
            password=password,
        )
        if authenticated_user is None:
            raise serializers.ValidationError('No account found for these credentials.')

        refresh = self.get_token(authenticated_user)
        self.user = authenticated_user
        return {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': UserSerializer(authenticated_user).data,
        }


class SkillVerseTokenView(TokenObtainPairView):
    permission_classes = [permissions.AllowAny]
    serializer_class = SkillVerseTokenSerializer


class RegisterView(generics.CreateAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user


class PublicBootstrapView(APIView):
    permission_classes = [permissions.AllowAny]

    @extend_schema(responses=PublicBootstrapSerializer)
    def get(self, request):
        data = {
            'platform_name': 'Skill Verse',
            'platform_tagline': 'Build teams, knowledge, and operating systems around the user.',
            'modules': [
                {
                    'name': 'Organizations',
                    'status': 'live',
                    'description': 'Multi-organization workspaces with secure role boundaries.',
                },
                {
                    'name': 'Invitations',
                    'status': 'live',
                    'description': 'Email-based onboarding designed for scalable team growth.',
                },
                {
                    'name': 'Learning',
                    'status': 'planned',
                    'description': 'A future-ready module space for courses, cohorts, and enablement.',
                },
                {
                    'name': 'Community',
                    'status': 'planned',
                    'description': 'Conversation and collaboration surfaces tied to user identity.',
                },
            ],
        }
        return Response(data)


class DashboardView(APIView):
    serializer_class = DashboardSerializer

    def get(self, request):
        memberships = Membership.objects.filter(user=request.user).select_related('organization').order_by('organization__name')
        invitations = Invitation.objects.filter(
            invited_email=request.user.email.lower(),
            status=InvitationStatus.PENDING,
        ).select_related('organization')
        active_org = getattr(request.user.profile, 'active_organization', None)
        payload = {
            'user': request.user,
            'organizations': [membership.organization for membership in memberships],
            'memberships': memberships,
            'pending_invitations': invitations,
            'active_organization': active_org,
        }
        return Response(DashboardSerializer(payload, context={'request': request}).data)


class OrganizationViewSet(viewsets.ModelViewSet):
    queryset = Organization.objects.all().select_related('owner').annotate(member_count=Count('memberships'))

    def get_permissions(self):
        if self.action in {'list', 'create', 'switch'}:
            return [permissions.IsAuthenticated()]
        if self.action in {'retrieve', 'dashboard', 'courses'}:
            return [permissions.IsAuthenticated(), HasOrganizationReadAccess()]
        return [permissions.IsAuthenticated(), HasOrganizationManagementAccess()]

    def get_queryset(self):
        return self.queryset.filter(memberships__user=self.request.user).distinct()

    def get_serializer_class(self):
        if self.action == 'create':
            return OrganizationCreateSerializer
        return OrganizationSerializer

    def perform_create(self, serializer):
        serializer.save()

    @action(detail=True, methods=['post'])
    def switch(self, request, pk=None):
        organization = self.get_object()
        profile = request.user.profile
        profile.active_organization = organization
        profile.save(update_fields=['active_organization', 'updated_at'])
        return Response({'active_organization_id': str(organization.id)})

    @action(detail=True, methods=['get'])
    def members(self, request, pk=None):
        organization = self.get_object()
        memberships = organization.memberships.select_related('user').order_by('user__first_name', 'user__email')
        return Response(MembershipSerializer(memberships, many=True).data)

    @action(detail=True, methods=['get'])
    def dashboard(self, request, pk=None):
        organization = self.get_object()
        membership = Membership.objects.get(user=request.user, organization=organization)
        memberships = organization.memberships.select_related('user').order_by('role', 'user__first_name', 'user__email')
        invitations = organization.invitations.select_related('invited_by').order_by('-date_sent')
        courses = (
            organization.courses.prefetch_related('categories', 'organizations')
            .order_by('title')
        )
        manageable_organizations = Organization.objects.filter(
            memberships__user=request.user,
            memberships__role__in=[OrganizationRole.CREATOR, OrganizationRole.MANAGER],
        ).distinct().order_by('name')
        payload = {
            'organization': organization,
            'membership': membership,
            'members': memberships,
            'invitations': invitations,
            'courses': courses,
            'course_categories': CourseCategory.objects.filter(is_active=True).order_by('name'),
            'manageable_organizations': manageable_organizations,
        }
        return Response(OrganizationDashboardSerializer(payload, context={'request': request}).data)

    @action(detail=True, methods=['get', 'post'])
    def invitations(self, request, pk=None):
        organization = self.get_object()
        membership = Membership.objects.get(user=request.user, organization=organization)

        if request.method == 'GET':
            invitations = organization.invitations.select_related('invited_by').all()
            return Response(InvitationSerializer(invitations, many=True).data)

        if membership.role not in {'creator', 'manager'}:
            raise serializers.ValidationError('You do not have permission to invite members to this organization.')

        serializer = InvitationSerializer(
            data=request.data,
            context={'request': request, 'organization': organization},
        )
        serializer.is_valid(raise_exception=True)
        invitation = create_invitation(
            organization=organization,
            invited_by=request.user,
            invited_email=serializer.validated_data['invited_email'],
            role=serializer.validated_data['role'],
            frontend_url=settings.FRONTEND_URL,
        )
        return Response(InvitationSerializer(invitation).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get', 'post'])
    def courses(self, request, pk=None):
        organization = self.get_object()
        membership = Membership.objects.get(user=request.user, organization=organization)

        if request.method == 'GET':
            courses = organization.courses.prefetch_related('categories', 'organizations').order_by('title')
            return Response(CourseSerializer(courses, many=True, context={'request': request}).data)

        if membership.role not in {OrganizationRole.CREATOR, OrganizationRole.MANAGER}:
            raise serializers.ValidationError(
                'You do not have permission to manage courses for this organization.'
            )

        serializer = CourseSerializer(
            data=request.data,
            context={'request': request, 'organization': organization},
        )
        serializer.is_valid(raise_exception=True)
        course = serializer.save()
        return Response(
            CourseSerializer(course, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['patch', 'delete'], url_path=r'courses/(?P<course_id>[^/.]+)')
    def course_detail(self, request, pk=None, course_id=None):
        organization = self.get_object()
        membership = Membership.objects.get(user=request.user, organization=organization)
        if membership.role not in {OrganizationRole.CREATOR, OrganizationRole.MANAGER}:
            raise serializers.ValidationError(
                'You do not have permission to manage courses for this organization.'
            )

        course = get_object_or_404(
            Course.objects.prefetch_related('categories', 'organizations'),
            id=course_id,
            organizations=organization,
        )

        if request.method == 'DELETE':
            course.organizations.remove(organization)
            if not course.organizations.exists():
                course.delete()
                return Response(status=status.HTTP_204_NO_CONTENT)
            return Response(status=status.HTTP_204_NO_CONTENT)

        serializer = CourseSerializer(
            course,
            data=request.data,
            partial=True,
            context={'request': request, 'organization': organization},
        )
        serializer.is_valid(raise_exception=True)
        course = serializer.save()
        return Response(CourseSerializer(course, context={'request': request}).data)


class InvitationDetailView(generics.RetrieveAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = InvitationDetailSerializer
    lookup_field = 'token'
    queryset = Invitation.objects.select_related('organization')


class InvitationAcceptView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsInvitationRecipient]

    def post(self, request, token):
        invitation = get_object_or_404(Invitation.objects.select_related('organization'), token=token)
        serializer = InvitationRespondSerializer(data=request.data or {})
        serializer.is_valid(raise_exception=True)
        membership = accept_invitation(invitation=invitation, user=request.user)
        return Response({'status': invitation.status, 'membership_id': membership.id})


class InvitationRejectView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, token):
        invitation = get_object_or_404(Invitation.objects.select_related('organization'), token=token)
        reject_invitation(invitation)
        return Response({'status': invitation.status})


class AuthRoutesView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response(
            {
                'register': '/api/auth/register/',
                'token': '/api/auth/token/',
                'token_refresh': '/api/auth/token/refresh/',
                'me': '/api/auth/me/',
            }
        )
