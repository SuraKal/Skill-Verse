from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import Invitation, Membership, Organization, OrganizationRole, UserProfile

User = get_user_model()


class UserProfileSerializer(serializers.ModelSerializer):
    active_organization_id = serializers.UUIDField(read_only=True)

    class Meta:
        model = UserProfile
        fields = ['title', 'bio', 'location', 'active_organization_id']


class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(required=False)
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'full_name', 'profile']
        read_only_fields = ['id', 'email']

    def get_full_name(self, obj):
        return obj.get_full_name().strip() or obj.username

    def update(self, instance, validated_data):
        profile_data = validated_data.pop('profile', {})
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()

        profile = instance.profile
        for field, value in profile_data.items():
            setattr(profile, field, value)
        profile.save()
        return instance


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ['email', 'username', 'first_name', 'last_name', 'password', 'confirm_password']

    def validate_email(self, value):
        email = value.lower().strip()
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError('A user with this email already exists.')
        return email

    def validate(self, attrs):
        if attrs['password'] != attrs['confirm_password']:
            raise serializers.ValidationError({'confirm_password': 'Passwords do not match.'})
        validate_password(attrs['password'])
        return attrs

    def create(self, validated_data):
        validated_data.pop('confirm_password')
        return User.objects.create_user(**validated_data)


class MembershipSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = Membership
        fields = ['id', 'role', 'created_at', 'user']


class OrganizationSerializer(serializers.ModelSerializer):
    owner = UserSerializer(read_only=True)
    membership_role = serializers.SerializerMethodField()
    member_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Organization
        fields = [
            'id',
            'name',
            'is_verified',
            'email',
            'phone',
            'logo',
            'description',
            'member_count',
            'membership_role',
            'owner',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'owner', 'created_at', 'updated_at']

    def get_membership_role(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return None
        membership = Membership.objects.filter(user=request.user, organization=obj).only('role').first()
        return membership.role if membership else None


class OrganizationCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = ['name', 'is_verified', 'email', 'phone', 'logo', 'description']

    def create(self, validated_data):
        owner = self.context['request'].user
        organization = Organization.objects.create(owner=owner, **validated_data)
        Membership.objects.create(user=owner, organization=organization, role=OrganizationRole.CREATOR)
        profile = owner.profile
        if profile.active_organization_id is None:
            profile.active_organization = organization
            profile.save(update_fields=['active_organization', 'updated_at'])
        return organization


class InvitationSerializer(serializers.ModelSerializer):
    invited_by = UserSerializer(read_only=True)
    organization_id = serializers.UUIDField(source='organization.id', read_only=True)

    class Meta:
        model = Invitation
        fields = [
            'id',
            'organization_id',
            'invited_email',
            'role',
            'status',
            'date_sent',
            'expires_at',
            'invited_by',
        ]
        read_only_fields = ['id', 'status', 'date_sent', 'expires_at', 'invited_by']

    def validate_invited_email(self, value):
        email = value.lower().strip()
        organization = self.context.get('organization')
        if organization and Membership.objects.filter(organization=organization, user__email=email).exists():
            raise serializers.ValidationError('This user is already a member of the organization.')
        return email


class InvitationDetailSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(read_only=True)
    organization_id = serializers.UUIDField(source='organization.id', read_only=True)
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    is_expired = serializers.BooleanField(read_only=True)

    class Meta:
        model = Invitation
        fields = [
            'id',
            'organization_id',
            'organization_name',
            'invited_email',
            'role',
            'status',
            'date_sent',
            'expires_at',
            'is_expired',
        ]


class InvitationRespondSerializer(serializers.Serializer):
    pass


class DashboardSerializer(serializers.Serializer):
    user = UserSerializer()
    organizations = OrganizationSerializer(many=True)
    memberships = serializers.SerializerMethodField()
    pending_invitations = InvitationDetailSerializer(many=True)
    active_organization = OrganizationSerializer(allow_null=True)
    stats = serializers.SerializerMethodField()

    def get_memberships(self, obj):
        return [
            {
                'organization_id': str(membership.organization_id),
                'organization_name': membership.organization.name,
                'role': membership.role,
            }
            for membership in obj['memberships']
        ]

    def get_stats(self, obj):
        memberships = list(obj['memberships'])
        return {
            'organization_count': len(memberships),
            'managed_organization_count': len(
                [m for m in memberships if m.role in {OrganizationRole.CREATOR, OrganizationRole.MANAGER}]
            ),
            'pending_invitation_count': obj['pending_invitations'].count(),
        }


class OrganizationDashboardSerializer(serializers.Serializer):
    organization = OrganizationSerializer()
    members = MembershipSerializer(many=True)
    invitations = InvitationSerializer(many=True)
    permissions = serializers.SerializerMethodField()
    stats = serializers.SerializerMethodField()

    def get_permissions(self, obj):
        role = obj['membership'].role
        return {
            'role': role,
            'can_manage_invitations': role in {OrganizationRole.CREATOR, OrganizationRole.MANAGER},
            'can_manage_members': role in {OrganizationRole.CREATOR, OrganizationRole.MANAGER},
            'can_manage_settings': role == OrganizationRole.CREATOR,
        }

    def get_stats(self, obj):
        invitations = list(obj['invitations'])
        members = list(obj['members'])
        return {
            'member_count': len(members),
            'pending_invitation_count': len(
                [invitation for invitation in invitations if invitation.status == 'pending']
            ),
            'manager_count': len(
                [member for member in members if member.role in {OrganizationRole.CREATOR, OrganizationRole.MANAGER}]
            ),
        }


class PublicBootstrapSerializer(serializers.Serializer):
    platform_name = serializers.CharField()
    platform_tagline = serializers.CharField()
    modules = serializers.ListField()
