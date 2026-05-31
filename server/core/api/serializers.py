import json

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import (
    Course,
    CourseCategory,
    CourseEnrollmentAssignment,
    CourseInstructorAssignment,
    CourseInstructorInvitation,
    CourseEnrollmentInvitation,
    CoursePhase,
    CoursePhaseSection,
    CoursePrivacy,
    CoursePriceType,
    CourseSection,
    CourseSubsection,
    CourseSubsectionNote,
    CourseSubsectionVideo,
    Invitation,
    Membership,
    Organization,
    OrganizationRole,
    UserProfile,
)

User = get_user_model()


class UserProfileSerializer(serializers.ModelSerializer):
    active_organization_id = serializers.UUIDField(read_only=True)

    class Meta:
        model = UserProfile
        fields = ['title', 'bio', 'location', 'active_organization_id']


class UserSerializer(serializers.ModelSerializer):
    profile = serializers.SerializerMethodField()
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'full_name', 'profile']
        read_only_fields = ['id', 'email']

    def get_full_name(self, obj):
        return obj.get_full_name().strip() or obj.username

    def get_profile(self, obj):
        profile, _ = UserProfile.objects.get_or_create(user=obj)
        return UserProfileSerializer(profile).data

    def update(self, instance, validated_data):
        profile_data = validated_data.pop('profile', {})
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()

        profile, _ = UserProfile.objects.get_or_create(user=instance)
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


class OrganizationOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = ['id', 'name']


class CourseCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = CourseCategory

        fields = [
            'id',
            'name',
            'slug',
            'is_active',
            'created_at',
            'updated_at',
        ]

        read_only_fields = [
            'id',
            'created_at',
            'updated_at',
        ]


class CourseSectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CourseSection
        fields = ['id', 'name']
        read_only_fields = ['id']


class CourseSubsectionVideoSerializer(serializers.ModelSerializer):
    class Meta:
        model = CourseSubsectionVideo
        fields = ['id', 'title', 'embed_code', 'order']
        read_only_fields = ['id']


class CourseSubsectionNoteSerializer(serializers.ModelSerializer):
    file_name = serializers.SerializerMethodField()

    class Meta:
        model = CourseSubsectionNote
        fields = ['id', 'title', 'file', 'file_name', 'order']
        read_only_fields = ['id', 'file_name']

    def get_file_name(self, obj):
        return obj.file.name.split('/')[-1] if obj.file else ''


class CourseSubsectionSerializer(serializers.ModelSerializer):
    videos = CourseSubsectionVideoSerializer(many=True, read_only=True)
    notes = CourseSubsectionNoteSerializer(many=True, read_only=True)

    class Meta:
        model = CourseSubsection
        fields = ['id', 'name', 'order', 'videos', 'notes']
        read_only_fields = ['id']


class CoursePhaseSectionSerializer(serializers.ModelSerializer):
    section = CourseSectionSerializer(read_only=True)
    subsections = serializers.SerializerMethodField()

    class Meta:
        model = CoursePhaseSection
        fields = ['id', 'order', 'section', 'subsections']
        read_only_fields = ['id']

    def get_subsections(self, obj):
        subsections = getattr(obj, 'prefetched_subsections', None)
        if subsections is None:
            subsections = obj.subsections.prefetch_related('videos', 'notes').all()
        return CourseSubsectionSerializer(subsections, many=True).data


class CoursePhaseSerializer(serializers.ModelSerializer):
    sections = serializers.SerializerMethodField()

    class Meta:
        model = CoursePhase
        fields = ['id', 'name', 'description', 'order', 'sections']
        read_only_fields = ['id']

    def get_sections(self, obj):
        phase_sections = getattr(obj, 'prefetched_phase_sections', None)
        if phase_sections is None:
            phase_sections = obj.phase_sections.select_related('section').all()
        return CoursePhaseSectionSerializer(phase_sections, many=True).data


class CoursePhaseSectionWriteSerializer(serializers.Serializer):
    id = serializers.UUIDField(required=False)
    name = serializers.CharField(required=False, allow_blank=False, max_length=255)
    order = serializers.IntegerField(required=False, min_value=0)
    subsections = serializers.ListField(required=False)

    def validate(self, attrs):
        if not attrs.get('id') and not attrs.get('name'):
            raise serializers.ValidationError('Each section must include an id or a name.')
        return attrs


class CourseSubsectionVideoWriteSerializer(serializers.Serializer):
    id = serializers.UUIDField(required=False)
    title = serializers.CharField(max_length=255)
    embed_code = serializers.CharField()
    order = serializers.IntegerField(required=False, min_value=0)


class CourseSubsectionNoteWriteSerializer(serializers.Serializer):
    id = serializers.UUIDField(required=False)
    title = serializers.CharField(required=False, allow_blank=True, max_length=255)
    order = serializers.IntegerField(required=False, min_value=0)
    file_field = serializers.CharField(required=False, allow_blank=False)
    keep_existing_file = serializers.BooleanField(required=False, default=False)


class CourseSubsectionWriteSerializer(serializers.Serializer):
    id = serializers.UUIDField(required=False)
    name = serializers.CharField(max_length=255)
    order = serializers.IntegerField(required=False, min_value=0)
    videos = CourseSubsectionVideoWriteSerializer(many=True, required=False)
    notes = CourseSubsectionNoteWriteSerializer(many=True, required=False)


class CoursePhaseWriteSerializer(serializers.Serializer):
    id = serializers.UUIDField(required=False)
    name = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, allow_blank=True)
    order = serializers.IntegerField(required=False, min_value=0)
    sections = CoursePhaseSectionWriteSerializer(many=True, required=False)


class CourseSerializer(serializers.ModelSerializer):
    created_by = UserSerializer(
        read_only=True,
    )

    categories = CourseCategorySerializer(
        many=True,
        read_only=True,
    )

    organizations = OrganizationOptionSerializer(
        many=True,
        read_only=True,
    )

    category_ids = serializers.PrimaryKeyRelatedField(
        queryset=CourseCategory.objects.filter(is_active=True),
        many=True,
        write_only=True,
        source='categories',
    )

    organization_ids = serializers.PrimaryKeyRelatedField(
        queryset=Organization.objects.filter(is_verified=True),
        many=True,
        write_only=True,
        source='organizations',
    )

    can_manage = serializers.SerializerMethodField()
    is_created_by_me = serializers.SerializerMethodField()
    is_instructor = serializers.SerializerMethodField()
    is_enrolled = serializers.SerializerMethodField()
    is_member_course = serializers.SerializerMethodField()
    can_enroll = serializers.SerializerMethodField()
    is_public = serializers.SerializerMethodField()
    is_free = serializers.SerializerMethodField()
    instructor_count = serializers.IntegerField(read_only=True)
    phases = CoursePhaseSerializer(many=True, read_only=True)
    phase_data = serializers.JSONField(write_only=True, required=False)

    class Meta:
        model = Course

        fields = [
            'id',
            'title',
            'created_by',
            'description',
            'thumbnail',
            'is_visible',
            'privacy',
            'price_type',

            # Read
            'categories',
            'organizations',
            'phases',
            'can_manage',
            'is_created_by_me',
            'is_instructor',
            'is_enrolled',
            'is_member_course',
            'can_enroll',
            'is_public',
            'is_free',
            'instructor_count',

            # Write
            'category_ids',
            'organization_ids',
            'phase_data',

            'created_at',
            'updated_at',
        ]

        read_only_fields = [
            'id',
            'created_at',
            'updated_at',
        ]

    def validate_organizations(self, organizations):
        request = self.context.get('request')
        current_organization = self.context.get('organization')
        if request is None or not request.user.is_authenticated:
            return organizations

        manageable_ids = set(
            Membership.objects.filter(
                user=request.user,
                role__in=[OrganizationRole.CREATOR, OrganizationRole.MANAGER],
            ).values_list('organization_id', flat=True)
        )
        requested_ids = {organization.id for organization in organizations}
        if current_organization is not None:
            requested_ids.add(current_organization.id)

        unauthorized_ids = requested_ids - manageable_ids
        if unauthorized_ids:
            raise serializers.ValidationError(
                'You can only assign courses to organizations you manage.'
            )

        resolved_organizations = list(organizations)
        if current_organization is not None and current_organization not in resolved_organizations:
            resolved_organizations.append(current_organization)
        return resolved_organizations

    def get_can_manage(self, obj):
        manageable_course_ids = self.context.get('manageable_course_ids', set())
        return str(obj.id) in manageable_course_ids or obj.id in manageable_course_ids

    def get_is_created_by_me(self, obj):
        created_course_ids = self.context.get('created_course_ids', set())
        return str(obj.id) in created_course_ids or obj.id in created_course_ids

    def get_is_instructor(self, obj):
        instructor_course_ids = self.context.get('instructor_course_ids', set())
        return str(obj.id) in instructor_course_ids or obj.id in instructor_course_ids

    def get_is_enrolled(self, obj):
        enrolled_course_ids = self.context.get('enrolled_course_ids', set())
        return str(obj.id) in enrolled_course_ids or obj.id in enrolled_course_ids

    def get_is_member_course(self, obj):
        member_course_ids = self.context.get('member_course_ids', set())
        return str(obj.id) in member_course_ids or obj.id in member_course_ids

    def get_can_enroll(self, obj):
        if not {
            'manageable_course_ids',
            'instructor_course_ids',
            'enrolled_course_ids',
        }.intersection(self.context):
            return False
        return not self.get_can_manage(obj) and not self.get_is_instructor(obj) and not self.get_is_enrolled(obj)
    
    def get_is_public(self, obj):
        return obj.privacy == CoursePrivacy.PUBLIC

    def get_is_free(self, obj):
        return obj.price_type == CoursePriceType.FREE

    def validate_phase_data(self, value):
        if value in (None, ''):
            return []
        if isinstance(value, str):
            try:
                value = json.loads(value)
            except json.JSONDecodeError as exc:
                raise serializers.ValidationError('Phase data must be valid JSON.') from exc
        normalized_phases = []
        for phase in value:
            next_phase = dict(phase)
            normalized_sections = []
            for section in phase.get('sections', []):
                next_section = dict(section)
                subsection_serializer = CourseSubsectionWriteSerializer(
                    data=section.get('subsections', []),
                    many=True,
                )
                subsection_serializer.is_valid(raise_exception=True)
                next_section['subsections'] = subsection_serializer.validated_data
                normalized_sections.append(next_section)
            next_phase['sections'] = normalized_sections
            normalized_phases.append(next_phase)
        serializer = CoursePhaseWriteSerializer(data=normalized_phases, many=True)
        serializer.is_valid(raise_exception=True)
        return serializer.validated_data

    def _sync_phases(self, course, phase_data):
        existing_notes = {
            str(note.id): note
            for note in CourseSubsectionNote.objects.filter(subsection__course_section__phase__course=course)
        }
        course.phases.all().delete()
        request = self.context.get('request')
        uploaded_files = getattr(request, 'FILES', None)

        for phase_index, phase in enumerate(phase_data):
            course_phase = CoursePhase.objects.create(
                course=course,
                name=phase['name'].strip(),
                description=phase.get('description', '').strip(),
                order=phase.get('order', phase_index),
            )
            for section_index, section_payload in enumerate(phase.get('sections', [])):
                section = None
                section_id = section_payload.get('id')
                if section_id:
                    section = CourseSection.objects.filter(id=section_id).first()
                if section is None:
                    section_name = section_payload.get('name', '').strip()
                    if not section_name:
                        raise serializers.ValidationError(
                            {'phase_data': 'Each new section must include a name.'}
                        )
                    section = CourseSection.objects.create(name=section_name)
                else:
                    section_name = section_payload.get('name', '').strip()
                    if section_name and section.name != section_name:
                        section = CourseSection.objects.create(name=section_name)
                course_section = CoursePhaseSection.objects.create(
                    phase=course_phase,
                    section=section,
                    order=section_payload.get('order', section_index),
                )
                for subsection_index, subsection_payload in enumerate(section_payload.get('subsections', [])):
                    subsection = CourseSubsection.objects.create(
                        course_section=course_section,
                        name=subsection_payload['name'].strip(),
                        order=subsection_payload.get('order', subsection_index),
                    )
                    for video_index, video_payload in enumerate(subsection_payload.get('videos', [])):
                        CourseSubsectionVideo.objects.create(
                            subsection=subsection,
                            title=video_payload['title'].strip(),
                            embed_code=video_payload['embed_code'].strip(),
                            order=video_payload.get('order', video_index),
                        )
                    for note_index, note_payload in enumerate(subsection_payload.get('notes', [])):
                        file_field = note_payload.get('file_field')
                        note_file = uploaded_files.get(file_field) if uploaded_files is not None and file_field else None
                        existing_note = existing_notes.get(str(note_payload.get('id'))) if note_payload.get('id') else None
                        if note_file is None and existing_note is not None:
                            note_file = existing_note.file
                        if note_file is None:
                            raise serializers.ValidationError(
                                {'phase_data': 'Each class note must include a file upload.'}
                            )
                        if note_file.size > CourseSubsectionNote.MAX_FILE_SIZE:
                            raise serializers.ValidationError(
                                {'phase_data': 'Class note files must not exceed 5MB.'}
                            )
                        CourseSubsectionNote.objects.create(
                            subsection=subsection,
                            title=note_payload.get('title', '').strip(),
                            file=note_file,
                            order=note_payload.get('order', note_index),
                        )

    def create(self, validated_data):
        categories = validated_data.pop('categories', [])
        organizations = validated_data.pop('organizations', [])
        phase_data = validated_data.pop('phase_data', [])
        request = self.context.get('request')
        if request is not None and request.user.is_authenticated and 'created_by' not in validated_data:
            validated_data['created_by'] = request.user
        course = Course.objects.create(**validated_data)
        course.categories.set(categories)
        course.organizations.set(organizations)
        if phase_data:
            self._sync_phases(course, phase_data)
        return course

    def update(self, instance, validated_data):
        categories = validated_data.pop('categories', None)
        organizations = validated_data.pop('organizations', None)
        phase_data = validated_data.pop('phase_data', None)

        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()

        if categories is not None:
            instance.categories.set(categories)
        if organizations is not None:
            instance.organizations.set(organizations)
        if phase_data is not None:
            self._sync_phases(instance, phase_data)
        return instance


class CourseInstructorAssignmentSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = CourseInstructorAssignment
        fields = ['id', 'created_at', 'user']

class CourseEnrollmentAssignmentSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = CourseEnrollmentAssignment
        fields = ['id', 'created_at', 'user']

class CourseInstructorInvitationSerializer(serializers.ModelSerializer):
    invited_by = UserSerializer(read_only=True)
    course_id = serializers.UUIDField(source='course.id', read_only=True)
    course_title = serializers.CharField(source='course.title', read_only=True)
    organization_id = serializers.UUIDField(source='organization.id', read_only=True)
    organization_name = serializers.CharField(source='organization.name', read_only=True)

    class Meta:
        model = CourseInstructorInvitation
        fields = [
            'id',
            'token',
            'organization_id',
            'organization_name',
            'course_id',
            'course_title',
            'invited_email',
            'custom_message',
            'status',
            'date_sent',
            'expires_at',
            'invited_by',
        ]
        read_only_fields = [
            'id',
            'token',
            'organization_id',
            'organization_name',
            'course_id',
            'course_title',
            'status',
            'date_sent',
            'expires_at',
            'invited_by',
        ]

    def validate_invited_email(self, value):
        email = value.lower().strip()
        course = self.context.get('course')
        if course and CourseInstructorAssignment.objects.filter(course=course, user__email=email).exists():
            raise serializers.ValidationError('This user is already an instructor for the course.')
        return email

    def validate_custom_message(self, value):
        return value.strip()


class CourseEnrollmentInvitationSerializer(serializers.ModelSerializer):
    invited_by = UserSerializer(read_only=True)
    course_id = serializers.UUIDField(source='course.id', read_only=True)
    course_title = serializers.CharField(source='course.title', read_only=True)
    organization_id = serializers.UUIDField(source='organization.id', read_only=True)
    organization_name = serializers.CharField(source='organization.name', read_only=True)

    class Meta:
        model = CourseEnrollmentInvitation
        fields = [
            'id',
            'token',
            'organization_id',
            'organization_name',
            'course_id',
            'course_title',
            'invited_email',
            'custom_message',
            'status',
            'date_sent',
            'expires_at',
            'invited_by',
        ]
        read_only_fields = [
            'id',
            'token',
            'organization_id',
            'organization_name',
            'course_id',
            'course_title',
            'status',
            'date_sent',
            'expires_at',
            'invited_by',
        ]

    def validate_invited_email(self, value):
        email = value.lower().strip()
        course = self.context.get('course')
        if course and CourseInstructorAssignment.objects.filter(course=course, user__email=email).exists():
            raise serializers.ValidationError('This user is already an instructor for the course.')
        if course and CourseEnrollmentAssignment.objects.filter(course=course, user__email=email).exists():
            raise serializers.ValidationError('This user is already enrolled in the course.')
        return email

    def validate_custom_message(self, value):
        return value.strip()

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
            'token',
            'organization_id',
            'invited_email',
            'role',
            'status',
            'date_sent',
            'expires_at',
            'invited_by',
        ]
        read_only_fields = ['id', 'token', 'status', 'date_sent', 'expires_at', 'invited_by']

    def validate_invited_email(self, value):
        email = value.lower().strip()
        organization = self.context.get('organization')
        if organization and Membership.objects.filter(organization=organization, user__email=email).exists():
            raise serializers.ValidationError('This user is already a member of the organization.')
        return email


class InvitationDetailSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(read_only=True)
    token = serializers.CharField(read_only=True)
    invitation_type = serializers.SerializerMethodField()
    title = serializers.SerializerMethodField()
    subtitle = serializers.SerializerMethodField()
    organization_id = serializers.UUIDField(source='organization.id', read_only=True)
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    course_id = serializers.SerializerMethodField()
    course_title = serializers.SerializerMethodField()
    custom_message = serializers.SerializerMethodField()
    is_expired = serializers.BooleanField(read_only=True)

    class Meta:
        model = Invitation
        fields = [
            'id',
            'token',
            'invitation_type',
            'title',
            'subtitle',
            'organization_id',
            'organization_name',
            'course_id',
            'course_title',
            'invited_email',
            'role',
            'custom_message',
            'status',
            'date_sent',
            'expires_at',
            'is_expired',
        ]

    def get_invitation_type(self, _obj):
        return 'organization'

    def get_title(self, obj):
        return obj.organization.name

    def get_subtitle(self, obj):
        return f'{obj.role} access'

    def get_course_id(self, _obj):
        return ''

    def get_course_title(self, _obj):
        return ''

    def get_custom_message(self, _obj):
        return ''


class InvitationRespondSerializer(serializers.Serializer):
    pass


class CourseInstructorInvitationDetailSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(read_only=True)
    token = serializers.CharField(read_only=True)
    invitation_type = serializers.SerializerMethodField()
    title = serializers.SerializerMethodField()
    subtitle = serializers.SerializerMethodField()
    role = serializers.SerializerMethodField()
    organization_id = serializers.UUIDField(source='organization.id', read_only=True)
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    course_id = serializers.UUIDField(source='course.id', read_only=True)
    course_title = serializers.CharField(source='course.title', read_only=True)
    is_expired = serializers.BooleanField(read_only=True)

    class Meta:
        model = CourseInstructorInvitation
        fields = [
            'id',
            'token',
            'invitation_type',
            'title',
            'subtitle',
            'organization_id',
            'organization_name',
            'course_id',
            'course_title',
            'invited_email',
            'role',
            'custom_message',
            'status',
            'date_sent',
            'expires_at',
            'is_expired',
        ]

    def get_invitation_type(self, _obj):
        return 'course_instructor'

    def get_title(self, obj):
        return obj.course.title

    def get_subtitle(self, obj):
        return f'Instructor invite from {obj.organization.name}'

    def get_role(self, _obj):
        return ''


class CourseEnrollmentInvitationDetailSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(read_only=True)
    token = serializers.CharField(read_only=True)
    invitation_type = serializers.SerializerMethodField()
    title = serializers.SerializerMethodField()
    subtitle = serializers.SerializerMethodField()
    role = serializers.SerializerMethodField()
    organization_id = serializers.UUIDField(source='organization.id', read_only=True)
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    course_id = serializers.UUIDField(source='course.id', read_only=True)
    course_title = serializers.CharField(source='course.title', read_only=True)
    is_expired = serializers.BooleanField(read_only=True)

    class Meta:
        model = CourseEnrollmentInvitation
        fields = [
            'id',
            'token',
            'invitation_type',
            'title',
            'subtitle',
            'organization_id',
            'organization_name',
            'course_id',
            'course_title',
            'invited_email',
            'role',
            'custom_message',
            'status',
            'date_sent',
            'expires_at',
            'is_expired',
        ]

    def get_invitation_type(self, _obj):
        return 'course_enrollment'

    def get_title(self, obj):
        return obj.course.title

    def get_subtitle(self, obj):
        return f'Enrollment invite from {obj.organization.name}'

    def get_role(self, _obj):
        return ''


class PendingInvitationSerializer(serializers.Serializer):
    id = serializers.CharField()
    token = serializers.CharField()
    invitation_type = serializers.CharField()
    title = serializers.CharField()
    subtitle = serializers.CharField()
    invited_email = serializers.EmailField()
    status = serializers.CharField()
    date_sent = serializers.DateTimeField()
    expires_at = serializers.DateTimeField()
    role = serializers.CharField(required=False, allow_blank=True)
    course_id = serializers.CharField(required=False, allow_blank=True)
    course_title = serializers.CharField(required=False, allow_blank=True)
    organization_id = serializers.CharField(required=False, allow_blank=True)
    organization_name = serializers.CharField(required=False, allow_blank=True)
    custom_message = serializers.CharField(required=False, allow_blank=True)


class DashboardSerializer(serializers.Serializer):
    user = UserSerializer()
    organizations = OrganizationSerializer(many=True)
    memberships = serializers.SerializerMethodField()
    pending_invitations = PendingInvitationSerializer(many=True)
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
            'pending_invitation_count': len(obj['pending_invitations']),
        }


class OrganizationDashboardSerializer(serializers.Serializer):
    organization = OrganizationSerializer()
    members = MembershipSerializer(many=True)
    invitations = InvitationSerializer(many=True)
    courses = CourseSerializer(many=True)
    course_categories = CourseCategorySerializer(many=True)
    manageable_organizations = serializers.SerializerMethodField()
    permissions = serializers.SerializerMethodField()
    stats = serializers.SerializerMethodField()

    def get_manageable_organizations(self, obj):
        return OrganizationOptionSerializer(obj['manageable_organizations'], many=True).data

    def get_permissions(self, obj):
        role = obj['membership'].role
        return {
            'role': role,
            'can_manage_invitations': role in {OrganizationRole.CREATOR, OrganizationRole.MANAGER},
            'can_manage_courses': role in {OrganizationRole.CREATOR, OrganizationRole.MANAGER},
            'can_manage_members': role in {OrganizationRole.CREATOR, OrganizationRole.MANAGER},
            'can_manage_settings': role == OrganizationRole.CREATOR,
        }

    def get_stats(self, obj):
        invitations = list(obj['invitations'])
        members = list(obj['members'])
        courses = list(obj['courses'])
        return {
            'member_count': len(members),
            'pending_invitation_count': len(
                [invitation for invitation in invitations if invitation.status == 'pending']
            ),
            'course_count': len(courses),
            'manager_count': len(
                [member for member in members if member.role in {OrganizationRole.CREATOR, OrganizationRole.MANAGER}]
            ),
        }


class PublicBootstrapSerializer(serializers.Serializer):
    platform_name = serializers.CharField()
    platform_tagline = serializers.CharField()
    modules = serializers.ListField()


class CourseDetailManagementSerializer(serializers.Serializer):
    course = CourseSerializer()
    instructors = CourseInstructorAssignmentSerializer(many=True)
    enrollments = CourseEnrollmentAssignmentSerializer(many=True)
    instructor_invitations = CourseInstructorInvitationSerializer(many=True)
    enrollment_invitations = CourseEnrollmentInvitationSerializer(many=True)
    manageable_organizations = OrganizationOptionSerializer(many=True)
    permissions = serializers.SerializerMethodField()
    stats = serializers.SerializerMethodField()

    def get_permissions(self, obj):
        role = obj['role']
        return {
            'role': role,
            'can_invite_instructors': obj['can_manage_course'],
            'can_invite_enrollments': obj['can_manage_course'],
            'can_manage_course': obj['can_manage_course'],
        }

    def get_stats(self, obj):
        instructor_invitations = list(obj['instructor_invitations'])
        enrollment_invitations = list(obj['enrollment_invitations'])
        instructor_count = obj.get('instructor_count', len(obj['instructors']))
        enrollment_count = obj.get('enrollment_count', len(obj['enrollments']))
        return {
            'instructor_count': instructor_count,
            'enrollment_count': enrollment_count,
            'pending_instructor_invitation_count': len(
                [invitation for invitation in instructor_invitations if invitation.status == 'pending']
            ),
            'pending_enrollment_invitation_count': len(
                [invitation for invitation in enrollment_invitations if invitation.status == 'pending']
            ),
        }


class CourseWorkspaceSerializer(serializers.Serializer):
    courses = CourseSerializer(many=True)
    course_categories = CourseCategorySerializer(many=True)
    manageable_organizations = OrganizationOptionSerializer(many=True)
    stats = serializers.SerializerMethodField()
    filters = serializers.SerializerMethodField()

    def get_stats(self, obj):
        return {
            'visible_course_count': len(obj['courses']),
            'created_course_count': obj['created_course_count'],
            'teaching_course_count': obj['teaching_course_count'],
            'enrolled_course_count': obj['enrolled_course_count'],
            'manageable_course_count': obj['manageable_course_count'],
        }

    def get_filters(self, obj):
        return {
            'all': obj['all_course_count'],
            'created': obj['created_course_count'],
            'teaching': obj['teaching_course_count'],
            'enrolled': obj['enrolled_course_count'],
        }
