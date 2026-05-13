import secrets
import uuid
from datetime import timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
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

    class Meta:
        ordering = ['title']

    def __str__(self):
        return self.title


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

# Create your models here.
