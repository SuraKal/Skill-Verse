import secrets
import uuid
from datetime import timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.core.validators import MinLengthValidator
from django.db import models
from django.utils import timezone

User = get_user_model()


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class OrganizationRole(models.TextChoices):
    CREATOR = 'creator', 'Creator'
    MANAGER = 'manager', 'Manager'
    MEMBER = 'member', 'Member'


class InvitationStatus(models.TextChoices):
    PENDING = 'pending', 'Pending'
    ACCEPTED = 'accepted', 'Accepted'
    REJECTED = 'rejected', 'Rejected'
    EXPIRED = 'expired', 'Expired'


class CoursePrivacy(models.TextChoices):
    PUBLIC = 'public', 'Public'
    PRIVATE = 'private', 'Private'


class CoursePriceType(models.TextChoices):
    FREE = 'free', 'Free'
    PAID = 'paid', 'Paid'


class EventVisibility(models.TextChoices):
    PRIVATE = 'private', 'Private'
    ORG_PRIVATE = 'org_private', 'Organization Private'
    PUBLIC = 'public', 'Public'


class EventStatus(models.TextChoices):
    DRAFT = 'draft', 'Draft'
    PENDING_APPROVAL = 'pending_approval', 'Pending Approval'
    ACTIVE = 'active', 'Active'
    ONGOING = 'ongoing', 'Ongoing'
    COMPLETED = 'completed', 'Completed'
    ARCHIVED = 'archived', 'Archived'
    REJECTED = 'rejected', 'Rejected'


class EventRole(models.TextChoices):
    INITIATOR = 'initiator', 'Initiator'
    ADMIN = 'admin', 'Admin'
    ATTENDEE = 'attendee', 'Attendee'
    SPEAKER = 'speaker', 'Speaker'
    VOLUNTEER = 'volunteer', 'Volunteer'
    GUEST = 'guest', 'Guest'


class EventInviteStatus(models.TextChoices):
    PENDING = 'pending', 'Pending'
    ACCEPTED = 'accepted', 'Accepted'
    DECLINED = 'declined', 'Declined'


class InviteOrigin(models.TextChoices):
    INVITED = 'invited', 'Invited'
    SELF_REGISTERED = 'self_registered', 'Self Registered'


class CoOrganizerStatus(models.TextChoices):
    PENDING = 'pending', 'Pending'
    ACCEPTED = 'accepted', 'Accepted'
    DECLINED = 'declined', 'Declined'

class Organization(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='owned_organizations')
    name = models.CharField(max_length=180)
    is_verified = models.BooleanField(default=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=30, blank=True)
    logo = models.ImageField(upload_to='organization-logos/', blank=True, null=True)
    description = models.TextField(blank=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class CourseCategory(TimeStampedModel):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    name = models.CharField(
        max_length=180,
        unique=True,
    )

    slug = models.SlugField(
        unique=True,
    )

    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class Course(TimeStampedModel):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    title = models.CharField(max_length=255)

    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name='created_courses',
        blank=True,
        null=True,
    )

    description = models.TextField(blank=True)

    thumbnail = models.ImageField(
        upload_to='course_thumbnails/',
        blank=True,
        null=True,
    )

    categories = models.ManyToManyField(
        CourseCategory,
        related_name='courses',
        blank=True,
    )

    organizations = models.ManyToManyField(
        Organization,
        related_name='courses',
        blank=True,
    )

    is_visible = models.BooleanField(default=True)
    privacy = models.CharField(max_length=20, choices=CoursePrivacy.choices, default=CoursePrivacy.PRIVATE)
    price_type = models.CharField(max_length=20, choices=CoursePriceType.choices, default=CoursePriceType.FREE)

    class Meta:
        ordering = ['title']

    def __str__(self):
        return self.title


class CourseSection(TimeStampedModel):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    name = models.CharField(max_length=255)

    class Meta:
        ordering = ['name', 'created_at']

    def __str__(self):
        return self.name


class CoursePhase(TimeStampedModel):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name='phases',
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    order = models.PositiveIntegerField(default=0)
    sections = models.ManyToManyField(
        CourseSection,
        through='CoursePhaseSection',
        related_name='phases',
        blank=True,
    )

    class Meta:
        ordering = ['order', 'created_at']
        constraints = [
            models.UniqueConstraint(fields=['course', 'order'], name='unique_course_phase_order'),
        ]

    def __str__(self):
        return f'{self.course.title}: {self.name}'


class CoursePhaseSection(TimeStampedModel):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    phase = models.ForeignKey(
        CoursePhase,
        on_delete=models.CASCADE,
        related_name='phase_sections',
    )
    section = models.ForeignKey(
        CourseSection,
        on_delete=models.CASCADE,
        related_name='phase_links',
    )
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order', 'created_at']
        constraints = [
            models.UniqueConstraint(fields=['phase', 'order'], name='unique_course_phase_section_order'),
            models.UniqueConstraint(fields=['phase', 'section'], name='unique_course_phase_section'),
        ]

    def __str__(self):
        return f'{self.phase.name}: {self.section.name}'


class CourseSubsection(TimeStampedModel):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    course_section = models.ForeignKey(
        CoursePhaseSection,
        on_delete=models.CASCADE,
        related_name='subsections',
    )
    name = models.CharField(max_length=255)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order', 'created_at']
        constraints = [
            models.UniqueConstraint(fields=['course_section', 'order'], name='unique_course_subsection_order'),
        ]

    def __str__(self):
        return f'{self.course_section.section.name}: {self.name}'


class CourseSubsectionVideo(TimeStampedModel):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    subsection = models.ForeignKey(
        CourseSubsection,
        on_delete=models.CASCADE,
        related_name='videos',
    )
    title = models.CharField(max_length=255)
    embed_code = models.TextField()
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order', 'created_at']
        constraints = [
            models.UniqueConstraint(fields=['subsection', 'order'], name='unique_course_subsection_video_order'),
        ]

    def __str__(self):
        return f'{self.subsection.name}: {self.title}'


class CourseSubsectionNote(TimeStampedModel):
    MAX_FILE_SIZE = 5 * 1024 * 1024

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    subsection = models.ForeignKey(
        CourseSubsection,
        on_delete=models.CASCADE,
        related_name='notes',
    )
    title = models.CharField(max_length=255, blank=True)
    file = models.FileField(upload_to='course_notes/')
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order', 'created_at']
        constraints = [
            models.UniqueConstraint(fields=['subsection', 'order'], name='unique_course_subsection_note_order'),
        ]

    def clean(self):
        super().clean()
        if self.file and self.file.size > self.MAX_FILE_SIZE:
            raise ValidationError({'file': 'File size must not exceed 5MB.'})

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.subsection.name}: {self.title or self.file.name}'


class CourseInstructorAssignment(TimeStampedModel):
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name='instructor_assignments',
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='course_instructor_assignments',
    )
    invited_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name='course_instructors_added',
        blank=True,
        null=True,
    )

    class Meta:
        ordering = ['user__first_name', 'user__email']
        constraints = [
            models.UniqueConstraint(fields=['course', 'user'], name='unique_course_instructor_assignment')
        ]

    def __str__(self):
        return f'{self.user.get_username()} teaches {self.course.title}'
    

class CourseEnrollmentAssignment(TimeStampedModel):
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name='enrollment_assignments',
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='course_enrollment_assignments',
    )
    invited_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name='course_enrollments_added',
        blank=True,
        null=True,
    )

    class Meta:
        ordering = ['user__first_name', 'user__email']
        constraints = [
            models.UniqueConstraint(fields=['course', 'user'], name='unique_course_enrollment_assignment')
        ]

    def __str__(self):
        return f'{self.user.get_username()} is enrolled in {self.course.title}'


class UserProfile(TimeStampedModel):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    title = models.CharField(max_length=120, blank=True)
    bio = models.TextField(blank=True)
    location = models.CharField(max_length=120, blank=True)
    avatar = models.ImageField(upload_to='user-avatars/', blank=True, null=True)
    active_organization = models.ForeignKey(
        Organization,
        on_delete=models.SET_NULL,
        related_name='active_members',
        blank=True,
        null=True,
    )

    def __str__(self):
        return f'{self.user.get_username()} profile'


class Membership(TimeStampedModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='memberships')
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='memberships')
    role = models.CharField(max_length=20, choices=OrganizationRole.choices, default=OrganizationRole.MEMBER)

    class Meta:
        ordering = ['organization__name', 'user__email']
        constraints = [
            models.UniqueConstraint(fields=['user', 'organization'], name='unique_user_organization_membership')
        ]

    def __str__(self):
        return f'{self.user.get_username()} @ {self.organization.name} ({self.role})'

    @property
    def can_manage_organization(self):
        return self.role in {OrganizationRole.CREATOR, OrganizationRole.MANAGER}


class Invitation(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='invitations')
    invited_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_invitations')
    invited_email = models.EmailField()
    role = models.CharField(max_length=20, choices=OrganizationRole.choices, default=OrganizationRole.MEMBER)
    status = models.CharField(max_length=20, choices=InvitationStatus.choices, default=InvitationStatus.PENDING)
    token = models.CharField(max_length=96, unique=True, db_index=True, validators=[MinLengthValidator(24)])
    date_sent = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    responded_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ['-date_sent']

    def __str__(self):
        return f'{self.invited_email} -> {self.organization.name} ({self.status})'

    def save(self, *args, **kwargs):
        if not self.token:
            self.token = secrets.token_urlsafe(32)
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(days=settings.INVITATION_EXPIRY_DAYS)
        self.invited_email = self.invited_email.lower().strip()
        super().save(*args, **kwargs)

    @property
    def is_expired(self):
        return timezone.now() >= self.expires_at


class CourseInstructorInvitation(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='course_instructor_invitations',
    )
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name='instructor_invitations',
    )
    invited_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='sent_course_instructor_invitations',
    )
    invited_email = models.EmailField()
    custom_message = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=InvitationStatus.choices, default=InvitationStatus.PENDING)
    token = models.CharField(max_length=96, unique=True, db_index=True, validators=[MinLengthValidator(24)])
    date_sent = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    responded_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ['-date_sent']

    def __str__(self):
        return f'{self.invited_email} -> {self.course.title} ({self.status})'

    def save(self, *args, **kwargs):
        if not self.token:
            self.token = secrets.token_urlsafe(32)
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(days=settings.INVITATION_EXPIRY_DAYS)
        self.invited_email = self.invited_email.lower().strip()
        self.custom_message = self.custom_message.strip()
        super().save(*args, **kwargs)

    @property
    def is_expired(self):
        return timezone.now() >= self.expires_at
    


class CourseEnrollmentInvitation(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='course_enrollment_invitations',
    )
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name='enrollment_invitations',
    )
    invited_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='sent_course_enrollment_invitations',
    )
    invited_email = models.EmailField()
    custom_message = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=InvitationStatus.choices, default=InvitationStatus.PENDING)
    token = models.CharField(max_length=96, unique=True, db_index=True, validators=[MinLengthValidator(24)])
    date_sent = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    responded_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ['-date_sent']

    def __str__(self):
        return f'{self.invited_email} -> {self.course.title} ({self.status})'

    def save(self, *args, **kwargs):
        if not self.token:
            self.token = secrets.token_urlsafe(32)
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(days=settings.INVITATION_EXPIRY_DAYS)
        self.invited_email = self.invited_email.lower().strip()
        self.custom_message = self.custom_message.strip()
        super().save(*args, **kwargs)

    @property
    def is_expired(self):
        return timezone.now() >= self.expires_at


class SkillSwapProfile(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='skill_swap_profile')
    teach_skills = models.TextField(blank=True)
    learn_skills = models.TextField(blank=True)
    summary = models.TextField(blank=True)

    class Meta:
        ordering = ['user__first_name', 'user__email']

    def __str__(self):
        return f'{self.user.get_username()} skill swap profile'


class SkillMatch(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    teaching_user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='skill_swap_teaching_matches',
    )
    learning_user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='skill_swap_learning_matches',
    )
    matched_skill = models.CharField(max_length=120)
    teaching_text = models.CharField(max_length=255, blank=True)
    learning_text = models.CharField(max_length=255, blank=True)
    match_score = models.PositiveIntegerField(default=100)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['-updated_at', 'matched_skill']
        constraints = [
            models.UniqueConstraint(
                fields=['teaching_user', 'learning_user', 'matched_skill'],
                name='unique_skill_swap_match',
            )
        ]

    def __str__(self):
        return f'{self.teaching_user.get_username()} teaches {self.matched_skill} to {self.learning_user.get_username()}'


class SkillChatThread(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    match = models.OneToOneField(
        SkillMatch,
        on_delete=models.CASCADE,
        related_name='thread',
    )
    last_message_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ['-last_message_at', '-created_at']

    def __str__(self):
        return f'Chat thread for {self.match.matched_skill}'


class SkillChatMessage(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    thread = models.ForeignKey(
        SkillChatThread,
        on_delete=models.CASCADE,
        related_name='messages',
    )
    sender = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='skill_swap_messages',
    )
    body = models.TextField()

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f'{self.sender.get_username()} in {self.thread_id}'


class Event(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='events',
    )
    title = models.CharField(max_length=255)
    description = models.TextField()
    cover_image = models.URLField(blank=True, null=True)
    location = models.CharField(max_length=255)
    start_datetime = models.DateTimeField()
    end_datetime = models.DateTimeField()
    timezone = models.CharField(max_length=64)
    visibility = models.CharField(max_length=20, choices=EventVisibility.choices)
    status = models.CharField(max_length=30, choices=EventStatus.choices, default=EventStatus.DRAFT)
    rejection_note = models.TextField(blank=True, null=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='created_events',
    )

    class Meta:
        ordering = ['start_datetime', 'created_at']

    def __str__(self):
        return self.title


class EventParticipant(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event = models.ForeignKey(
        Event,
        on_delete=models.CASCADE,
        related_name='participants',
    )
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name='event_participations',
        blank=True,
        null=True,
    )
    email = models.EmailField()
    event_role = models.CharField(max_length=20, choices=EventRole.choices)
    invite_status = models.CharField(max_length=20, choices=EventInviteStatus.choices, default=EventInviteStatus.PENDING)
    invite_origin = models.CharField(max_length=20, choices=InviteOrigin.choices, default=InviteOrigin.INVITED)
    invited_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name='event_participant_invites_sent',
        blank=True,
        null=True,
    )
    invited_at = models.DateTimeField(auto_now_add=True)
    responded_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ['-invited_at', 'email']

    def __str__(self):
        return f'{self.email} -> {self.event.title} ({self.event_role})'


class EventCoOrganizer(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event = models.ForeignKey(
        Event,
        on_delete=models.CASCADE,
        related_name='co_organizers',
    )
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='event_co_organizer_invitations',
        blank=True,
        null=True,
    )
    invited_by_user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='sent_event_co_organizer_invites',
    )
    invite_email = models.EmailField()
    status = models.CharField(max_length=20, choices=CoOrganizerStatus.choices, default=CoOrganizerStatus.PENDING)
    invited_at = models.DateTimeField(auto_now_add=True)
    responded_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ['-invited_at', 'organization__name']

    def __str__(self):
        organization_name = self.organization.name if self.organization_id else self.invite_email
        return f'{organization_name} co-organizing {self.event.title}'


class InvitationToken(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    token = models.CharField(max_length=255, unique=True, db_index=True)
    event_participant = models.ForeignKey(
        EventParticipant,
        on_delete=models.CASCADE,
        related_name='tokens',
        blank=True,
        null=True,
    )
    event_co_organizer = models.ForeignKey(
        EventCoOrganizer,
        on_delete=models.CASCADE,
        related_name='tokens',
        blank=True,
        null=True,
    )
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(blank=True, null=True)
    revoked = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.token

    @property
    def is_expired(self):
        return timezone.now() >= self.expires_at
