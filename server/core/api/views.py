from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import generics, permissions, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import (
    Course,
    CourseCategory,
    CourseInstructorAssignment,
    CourseEnrollmentAssignment,
    CourseInstructorInvitation,
    CourseEnrollmentInvitation,
    CoursePrivacy,
    Invitation,
    InvitationStatus,
    Membership,
    Organization,
    OrganizationRole,
)
from .permissions import (
    HasOrganizationManagementAccess,
    HasOrganizationReadAccess,
    IsCourseInstructorInvitationRecipient,
    IsCourseEnrollmentInvitationRecipient,
    IsInvitationRecipient,
)
from .serializers import (
    CourseDetailManagementSerializer,
    CourseWorkspaceSerializer,
    DashboardSerializer,
    CourseInstructorInvitationDetailSerializer,
    CourseInstructorInvitationSerializer,
    CourseEnrollmentInvitationDetailSerializer,
    CourseEnrollmentInvitationSerializer,
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
from .services.invitation_service import (
    accept_course_instructor_invitation,
    accept_course_enrollment_invitation,
    accept_invitation,
    create_course_instructor_invitation,
    create_course_enrollment_invitation,
    create_invitation,
    reject_course_instructor_invitation,
    reject_course_enrollment_invitation,
    reject_invitation,
)

User = get_user_model()


def get_manageable_organizations_for_user(user):
    return Organization.objects.filter(
        memberships__user=user,
        memberships__role__in=[OrganizationRole.CREATOR, OrganizationRole.MANAGER],
    ).distinct().order_by('name')


def get_manageable_organization_ids_for_user(user):
    return set(
        get_manageable_organizations_for_user(user).values_list('id', flat=True)
    )


def get_course_role_for_user(*, user, course, manageable_ids):
    if course.created_by_id == user.id:
        return OrganizationRole.CREATOR
    if course.organizations.filter(id__in=manageable_ids).exists():
        return OrganizationRole.MANAGER
    if course.instructor_assignments.filter(user=user).exists():
        return 'instructor'
    return 'viewer'


def user_can_manage_course(*, user, course, manageable_ids):
    return course.created_by_id == user.id or course.organizations.filter(id__in=manageable_ids).exists()


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
        organization_invitations = Invitation.objects.filter(
            invited_email=request.user.email.lower(),
            status=InvitationStatus.PENDING,
        ).select_related('organization')
        course_instructor_invitations = CourseInstructorInvitation.objects.filter(
            invited_email=request.user.email.lower(),
            status=InvitationStatus.PENDING,
        ).select_related('organization', 'course')

        course_enrollment_invitations = CourseEnrollmentInvitation.objects.filter(
            invited_email=request.user.email.lower(),
            status=InvitationStatus.PENDING,
        ).select_related('organization', 'course')
        pending_invitations = [
            {
                'id': str(invitation.id),
                'token': invitation.token,
                'invitation_type': 'organization',
                'title': invitation.organization.name,
                'subtitle': f'{invitation.role} access',
                'invited_email': invitation.invited_email,
                'status': invitation.status,
                'date_sent': invitation.date_sent,
                'expires_at': invitation.expires_at,
                'role': invitation.role,
                'organization_id': str(invitation.organization_id),
                'organization_name': invitation.organization.name,
                'course_id': '',
                'course_title': '',
                'custom_message': '',
            }
            for invitation in organization_invitations
        ] + [
            {
                'id': str(invitation.id),
                'token': invitation.token,
                'invitation_type': 'course_instructor',
                'title': invitation.course.title,
                'subtitle': f'Instructor invite from {invitation.organization.name}',
                'invited_email': invitation.invited_email,
                'status': invitation.status,
                'date_sent': invitation.date_sent,
                'expires_at': invitation.expires_at,
                'role': '',
                'organization_id': str(invitation.organization_id),
                'organization_name': invitation.organization.name,
                'course_id': str(invitation.course_id),
                'course_title': invitation.course.title,
                'custom_message': invitation.custom_message,
            }
            for invitation in course_instructor_invitations
        ] + [
            {
                'id': str(invitation.id),
                'token': invitation.token,
                'invitation_type': 'course_enrollment',
                'title': invitation.course.title,
                'subtitle': f'Enrollment invite from {invitation.organization.name}',
                'invited_email': invitation.invited_email,
                'status': invitation.status,
                'date_sent': invitation.date_sent,
                'expires_at': invitation.expires_at,
                'role': '',
                'organization_id': str(invitation.organization_id),
                'organization_name': invitation.organization.name,
                'course_id': str(invitation.course_id),
                'course_title': invitation.course.title,
                'custom_message': invitation.custom_message,
            }
            for invitation in course_enrollment_invitations
        ]
        pending_invitations.sort(key=lambda invitation: invitation['date_sent'], reverse=True)
        active_org = getattr(request.user.profile, 'active_organization', None)
        payload = {
            'user': request.user,
            'organizations': [membership.organization for membership in memberships],
            'memberships': memberships,
            'pending_invitations': pending_invitations,
            'active_organization': active_org,
        }
        return Response(DashboardSerializer(payload, context={'request': request}).data)


class OrganizationViewSet(viewsets.ModelViewSet):
    queryset = Organization.objects.all().select_related('owner').annotate(member_count=Count('memberships'))

    def get_permissions(self):
        if self.action in {'list', 'create', 'switch'}:
            return [permissions.IsAuthenticated()]
        if self.action in {'retrieve', 'dashboard', 'courses', 'course_management'}:
            return [permissions.IsAuthenticated(), HasOrganizationReadAccess()]
        if self.action == 'course_instructor_invitations' and self.request.method == 'GET':
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

    @action(detail=True, methods=['get'], url_path=r'courses/(?P<course_id>[^/.]+)/detail')
    def course_management(self, request, pk=None, course_id=None):
        organization = self.get_object()
        membership = Membership.objects.get(user=request.user, organization=organization)
        course = get_object_or_404(
            Course.objects.prefetch_related(
                'categories',
                'organizations',
                'instructor_assignments__user',
                'instructor_invitations__invited_by',
            ),
            id=course_id,
            organizations=organization,
        )
        payload = {
            'course': course,
            'instructors': course.instructor_assignments.select_related('user').all(),
            'enrollments': course.enrollment_assignments.select_related('user').all(),
            'instructor_invitations': course.instructor_invitations.select_related('invited_by').all(),
            'enrollment_invitations': course.enrollment_invitations.select_related('invited_by').all(),
            'manageable_organizations': [organization],
            'role': membership.role,
            'can_manage_course': membership.role in {OrganizationRole.CREATOR, OrganizationRole.MANAGER},
        }
        return Response(
            CourseDetailManagementSerializer(
                payload,
                context={
                    'request': request,
                    'manageable_course_ids': {str(course.id)} if payload['can_manage_course'] else set(),
                    'created_course_ids': {str(course.id)} if course.created_by_id == request.user.id else set(),
                    'instructor_course_ids': {str(course.id)} if course.instructor_assignments.filter(user=request.user).exists() else set(),
                    'enrollment_course_ids': {str(course.id)} if course.enrollment_assignments.filter(user=request.user).exists() else set(),
                    'member_course_ids': {str(course.id)},
                },
            ).data
        )

    @action(detail=True, methods=['get', 'post'], url_path=r'courses/(?P<course_id>[^/.]+)/instructor-invitations')
    def course_instructor_invitations(self, request, pk=None, course_id=None):
        organization = self.get_object()
        membership = Membership.objects.get(user=request.user, organization=organization)
        course = get_object_or_404(
            Course.objects.prefetch_related('organizations'),
            id=course_id,
            organizations=organization,
        )

        if request.method == 'GET':
            invitations = course.instructor_invitations.select_related('invited_by').all()
            return Response(CourseInstructorInvitationSerializer(invitations, many=True).data)

        if membership.role not in {OrganizationRole.CREATOR, OrganizationRole.MANAGER}:
            raise serializers.ValidationError('You do not have permission to invite instructors to this course.')

        serializer = CourseInstructorInvitationSerializer(
            data=request.data,
            context={'request': request, 'organization': organization, 'course': course},
        )
        serializer.is_valid(raise_exception=True)
        invitation = create_course_instructor_invitation(
            organization=organization,
            course=course,
            invited_by=request.user,
            invited_email=serializer.validated_data['invited_email'],
            custom_message=serializer.validated_data.get('custom_message', ''),
            frontend_url=settings.FRONTEND_URL,
        )
        return Response(CourseInstructorInvitationSerializer(invitation).data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['get', 'post'], url_path=r'courses/(?P<course_id>[^/.]+)/enrollment-invitations')
    def course_enrollment_invitations(self, request, pk=None, course_id=None):
        organization = self.get_object()
        membership = Membership.objects.get(user=request.user, organization=organization)
        course = get_object_or_404(
            Course.objects.prefetch_related('organizations'),
            id=course_id,
            organizations=organization,
        )

        if request.method == 'GET':
            invitations = course.enrollment_invitations.select_related('invited_by').all()
            return Response(CourseEnrollmentInvitationSerializer(invitations, many=True).data)

        if membership.role not in {OrganizationRole.CREATOR, OrganizationRole.MANAGER}:
            raise serializers.ValidationError('You do not have permission to invite students to this course.')

        serializer = CourseEnrollmentInvitationSerializer(
            data=request.data,
            context={'request': request, 'organization': organization, 'course': course},
        )
        serializer.is_valid(raise_exception=True)
        invitation = create_course_enrollment_invitation(
            organization=organization,
            course=course,
            invited_by=request.user,
            invited_email=serializer.validated_data['invited_email'],
            custom_message=serializer.validated_data.get('custom_message', ''),
            frontend_url=settings.FRONTEND_URL,
        )
        return Response(CourseEnrollmentInvitationSerializer(invitation).data, status=status.HTTP_201_CREATED)


class CourseViewSet(viewsets.ModelViewSet):
    queryset = Course.objects.select_related('created_by').prefetch_related('categories', 'organizations').annotate(
        instructor_count=Count('instructor_assignments', distinct=True)
    )
    serializer_class = CourseSerializer
    http_method_names = ['get', 'post', 'patch', 'delete']

    def get_permissions(self):
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        return self.queryset.distinct().order_by('title')

    def list(self, request):
        courses = list(self.get_queryset())
        manageable_organizations = list(get_manageable_organizations_for_user(request.user))
        manageable_ids = {organization.id for organization in manageable_organizations}
        created_course_ids = {course.id for course in courses if course.created_by_id == request.user.id}
        instructor_course_ids = set(
            CourseInstructorAssignment.objects.filter(user=request.user).values_list('course_id', flat=True)
        )
        enrollment_ids = set(
            CourseEnrollmentAssignment.objects.filter(user=request.user).values_list('course_id', flat=True)
        )
        member_course_ids = set(
            Course.objects.filter(organizations__memberships__user=request.user).values_list('id', flat=True).distinct()
        )
        manageable_course_ids = {
            course.id for course in courses if course.created_by_id == request.user.id or course.organizations.filter(id__in=manageable_ids).exists()
        }
        payload = {
            'courses': courses,
            'course_categories': CourseCategory.objects.filter(is_active=True).order_by('name'),
            'manageable_organizations': manageable_organizations,
            'all_course_count': sum(
                1 for c in courses
                if c.privacy == CoursePrivacy.PUBLIC
                or c.id in created_course_ids
                or c.id in instructor_course_ids
                or c.id in member_course_ids
            ),
            'created_course_count': len(created_course_ids),
            'teaching_course_count': len(instructor_course_ids),
            'enrolled_course_count': len(enrollment_ids),
            'manageable_course_count': len(manageable_course_ids),
        }
        return Response(
            CourseWorkspaceSerializer(
                payload,
                context={
                    'request': request,
                    'manageable_course_ids': {str(course_id) for course_id in manageable_course_ids},
                    'created_course_ids': {str(course_id) for course_id in created_course_ids},
                    'instructor_course_ids': {str(course_id) for course_id in instructor_course_ids},
                    'enrolled_course_ids': {str(course_id) for course_id in enrollment_ids},
                    'member_course_ids': {str(course_id) for course_id in member_course_ids},
                },
            ).data
        )

    def create(self, request):
        serializer = CourseSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        course = serializer.save()
        return Response(CourseSerializer(course, context={'request': request}).data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, pk=None):
        course = self.get_object()
        manageable_ids = get_manageable_organization_ids_for_user(request.user)
        if not user_can_manage_course(user=request.user, course=course, manageable_ids=manageable_ids):
            raise serializers.ValidationError('You do not have permission to manage this course.')

        serializer = CourseSerializer(
            course,
            data=request.data,
            partial=True,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        course = serializer.save()
        return Response(CourseSerializer(course, context={'request': request}).data)

    def destroy(self, request, pk=None):
        course = self.get_object()
        manageable_ids = get_manageable_organization_ids_for_user(request.user)
        manageable_organizations = list(course.organizations.filter(id__in=manageable_ids))
        if manageable_organizations:
            course.organizations.remove(*manageable_organizations)
            if not course.organizations.exists():
                course.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

        if course.created_by_id == request.user.id:
            course.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

        raise serializers.ValidationError('You do not have permission to remove this course.')

    @action(detail=True, methods=['get'])
    def management(self, request, pk=None):
        course = self.get_object()
        manageable_organizations = list(
            course.organizations.filter(id__in=get_manageable_organization_ids_for_user(request.user))
        )
        manageable_ids = {organization.id for organization in manageable_organizations}
        payload = {
            'course': course,
            'instructors': course.instructor_assignments.select_related('user').all(),
            'instructor_invitations': course.instructor_invitations.select_related('invited_by').all(),
            'enrollments': course.enrollment_assignments.select_related('user').all(),
            'enrollment_invitations': course.enrollment_invitations.select_related('invited_by').all(),
            'manageable_organizations': manageable_organizations,
            'role': get_course_role_for_user(user=request.user, course=course, manageable_ids=manageable_ids),
            'can_manage_course': user_can_manage_course(user=request.user, course=course, manageable_ids=manageable_ids),
        }
        return Response(
            CourseDetailManagementSerializer(
                payload,
                context={
                    'request': request,
                    'manageable_course_ids': {str(course.id)} if payload['can_manage_course'] else set(),
                    'created_course_ids': {str(course.id)} if course.created_by_id == request.user.id else set(),
                    'instructor_course_ids': {str(course.id)} if course.instructor_assignments.filter(user=request.user).exists() else set(),
                    'enrollment_course_ids': {str(course.id)} if course.enrollment_assignments.filter(user=request.user).exists() else set(),
                    'member_course_ids': {str(course.id)} if course.organizations.filter(memberships__user=request.user).exists() else set(),
                },
            ).data
        )

    @action(detail=True, methods=['get', 'post'], url_path='instructor-invitations')
    def instructor_invitations(self, request, pk=None):
        course = self.get_object()
        manageable_organizations = list(
            course.organizations.filter(id__in=get_manageable_organization_ids_for_user(request.user))
        )

        if request.method == 'GET':
            invitations = course.instructor_invitations.select_related('invited_by').all()
            return Response(CourseInstructorInvitationSerializer(invitations, many=True).data)

        if not manageable_organizations and course.created_by_id != request.user.id:
            raise serializers.ValidationError('You do not have permission to invite instructors to this course.')

        selected_organization = manageable_organizations[0] if manageable_organizations else None
        organization_id = request.data.get('organization_id')
        if organization_id:
            selected_organization = next(
                (organization for organization in manageable_organizations if str(organization.id) == str(organization_id)),
                None,
            )
        if selected_organization is None:
            raise serializers.ValidationError('Select a manageable organization for this instructor invitation.')

        serializer = CourseInstructorInvitationSerializer(
            data=request.data,
            context={'request': request, 'organization': selected_organization, 'course': course},
        )
        serializer.is_valid(raise_exception=True)
        invitation = create_course_instructor_invitation(
            organization=selected_organization,
            course=course,
            invited_by=request.user,
            invited_email=serializer.validated_data['invited_email'],
            custom_message=serializer.validated_data.get('custom_message', ''),
            frontend_url=settings.FRONTEND_URL,
        )
        return Response(CourseInstructorInvitationSerializer(invitation).data, status=status.HTTP_201_CREATED)
    

    @action(detail=True, methods=['get', 'post'], url_path='enrollment-invitations')
    def enrollment_invitations(self, request, pk=None):
        course = self.get_object()
        manageable_organizations = list(
            course.organizations.filter(id__in=get_manageable_organization_ids_for_user(request.user))
        )

        if request.method == 'GET':
            invitations = course.enrollment_invitations.select_related('invited_by').all()
            return Response(CourseEnrollmentInvitationSerializer(invitations, many=True).data)

        if not manageable_organizations and course.created_by_id != request.user.id:
            raise serializers.ValidationError('You do not have permission to invite enrollments to this course.')

        selected_organization = manageable_organizations[0] if manageable_organizations else None
        organization_id = request.data.get('organization_id')
        if organization_id:
            selected_organization = next(
                (organization for organization in manageable_organizations if str(organization.id) == str(organization_id)),
                None,
            )
        if selected_organization is None:
            raise serializers.ValidationError('Select a manageable organization for this enrollment invitation.')

        serializer = CourseEnrollmentInvitationSerializer(
            data=request.data,
            context={'request': request, 'organization': selected_organization, 'course': course},
        )
        serializer.is_valid(raise_exception=True)
        invitation = create_course_enrollment_invitation(
            organization=selected_organization,
            course=course,
            invited_by=request.user,
            invited_email=serializer.validated_data['invited_email'],
            custom_message=serializer.validated_data.get('custom_message', ''),
            frontend_url=settings.FRONTEND_URL,
        )
        return Response(CourseEnrollmentInvitationSerializer(invitation).data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'], url_path='enroll')
    def enroll(self, request, pk=None):
        course = self.get_object()

        enrollment, created = CourseEnrollmentAssignment.objects.get_or_create(
            course=course,
            user=request.user,
            defaults={'invited_by': None},
        )

        if not created:
            return Response(
                {'detail': 'You are already enrolled in this course.'},
                status=status.HTTP_200_OK,
            )

        return Response(
            {'detail': 'Successfully enrolled.'},
            status=status.HTTP_201_CREATED,
        )


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


class CourseInstructorInvitationDetailView(generics.RetrieveAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = CourseInstructorInvitationDetailSerializer
    lookup_field = 'token'
    queryset = CourseInstructorInvitation.objects.select_related('organization', 'course')

class CourseEnrollmentInvitationDetailView(generics.RetrieveAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = CourseEnrollmentInvitationDetailSerializer
    lookup_field = 'token'
    queryset = CourseEnrollmentInvitation.objects.select_related('organization', 'course')


class CourseInstructorInvitationAcceptView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsCourseInstructorInvitationRecipient]

    def post(self, request, token):
        invitation = get_object_or_404(
            CourseInstructorInvitation.objects.select_related('organization', 'course'),
            token=token,
        )
        serializer = InvitationRespondSerializer(data=request.data or {})
        serializer.is_valid(raise_exception=True)
        assignment = accept_course_instructor_invitation(invitation=invitation, user=request.user)
        return Response({'status': invitation.status, 'assignment_id': assignment.id})

class CourseEnrollmentInvitationAcceptView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsCourseEnrollmentInvitationRecipient]

    def post(self, request, token):
        invitation = get_object_or_404(
            CourseEnrollmentInvitation.objects.select_related('organization', 'course'),
            token=token,
        )
        serializer = InvitationRespondSerializer(data=request.data or {})
        serializer.is_valid(raise_exception=True)
        assignment = accept_course_enrollment_invitation(invitation=invitation, user=request.user)
        return Response({'status': invitation.status, 'assignment_id': assignment.id})


class CourseInstructorInvitationRejectView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, token):
        invitation = get_object_or_404(
            CourseInstructorInvitation.objects.select_related('organization', 'course'),
            token=token,
        )
        reject_course_instructor_invitation(invitation)
        return Response({'status': invitation.status})



class CourseEnrollmentInvitationRejectView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, token):
        invitation = get_object_or_404(
            CourseEnrollmentInvitation.objects.select_related('organization', 'course'),
            token=token,
        )
        reject_course_enrollment_invitation(invitation)
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
