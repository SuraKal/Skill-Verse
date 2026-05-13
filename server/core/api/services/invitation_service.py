from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from ..models import (
    CourseInstructorAssignment,
    CourseInstructorInvitation,
    Invitation,
    InvitationStatus,
    Membership,
    OrganizationRole,
)
from .email_service import send_course_instructor_invitation_email, send_organization_invitation_email


def create_invitation(*, organization, invited_by, invited_email, role, frontend_url):
    if Invitation.objects.filter(
        organization=organization,
        invited_email=invited_email.lower().strip(),
        status=InvitationStatus.PENDING,
    ).exists():
        raise serializers.ValidationError('A pending invitation already exists for this email.')

    invitation = Invitation.objects.create(
        organization=organization,
        invited_by=invited_by,
        invited_email=invited_email,
        role=role,
    )
    accept_url = f'{frontend_url.rstrip("/")}/invite/organization/{invitation.token}?action=accept'
    reject_url = f'{frontend_url.rstrip("/")}/invite/organization/{invitation.token}?action=reject'
    send_organization_invitation_email(
        invited_email=invitation.invited_email,
        organization_name=organization.name,
        role=invitation.role,
        accept_url=accept_url,
        reject_url=reject_url,
    )
    return invitation


@transaction.atomic
def accept_invitation(*, invitation, user):
    if invitation.status != InvitationStatus.PENDING:
        raise serializers.ValidationError('This invitation is no longer pending.')
    if invitation.is_expired:
        invitation.status = InvitationStatus.EXPIRED
        invitation.responded_at = timezone.now()
        invitation.save(update_fields=['status', 'responded_at', 'updated_at'])
        raise serializers.ValidationError('This invitation has expired.')
    if invitation.invited_email.lower() != user.email.lower():
        raise serializers.ValidationError('This invitation was sent to a different email address.')

    membership, _ = Membership.objects.update_or_create(
        user=user,
        organization=invitation.organization,
        defaults={'role': invitation.role},
    )
    invitation.status = InvitationStatus.ACCEPTED
    invitation.responded_at = timezone.now()
    invitation.save(update_fields=['status', 'responded_at', 'updated_at'])

    profile = user.profile
    if profile.active_organization_id is None:
        profile.active_organization = invitation.organization
        profile.save(update_fields=['active_organization', 'updated_at'])
    return membership


def reject_invitation(invitation):
    if invitation.status != InvitationStatus.PENDING:
        return invitation
    invitation.status = InvitationStatus.REJECTED
    invitation.responded_at = timezone.now()
    invitation.save(update_fields=['status', 'responded_at', 'updated_at'])
    return invitation


def create_course_instructor_invitation(
    *,
    organization,
    course,
    invited_by,
    invited_email,
    custom_message,
    frontend_url,
):
    normalized_email = invited_email.lower().strip()
    if CourseInstructorAssignment.objects.filter(course=course, user__email=normalized_email).exists():
        raise serializers.ValidationError('This user is already an instructor for the course.')

    if CourseInstructorInvitation.objects.filter(
        course=course,
        invited_email=normalized_email,
        status=InvitationStatus.PENDING,
    ).exists():
        raise serializers.ValidationError('A pending instructor invitation already exists for this email.')

    invitation = CourseInstructorInvitation.objects.create(
        organization=organization,
        course=course,
        invited_by=invited_by,
        invited_email=normalized_email,
        custom_message=custom_message,
    )
    accept_url = f'{frontend_url.rstrip("/")}/invite/course/{invitation.token}?action=accept'
    reject_url = f'{frontend_url.rstrip("/")}/invite/course/{invitation.token}?action=reject'
    send_course_instructor_invitation_email(
        invited_email=invitation.invited_email,
        organization_name=organization.name,
        course_title=course.title,
        invited_by_name=invited_by.get_full_name().strip() or invited_by.username,
        custom_message=invitation.custom_message,
        accept_url=accept_url,
        reject_url=reject_url,
    )
    return invitation


@transaction.atomic
def accept_course_instructor_invitation(*, invitation, user):
    if invitation.status != InvitationStatus.PENDING:
        raise serializers.ValidationError('This invitation is no longer pending.')
    if invitation.is_expired:
        invitation.status = InvitationStatus.EXPIRED
        invitation.responded_at = timezone.now()
        invitation.save(update_fields=['status', 'responded_at', 'updated_at'])
        raise serializers.ValidationError('This invitation has expired.')
    if invitation.invited_email.lower() != user.email.lower():
        raise serializers.ValidationError('This invitation was sent to a different email address.')

    assignment, _ = CourseInstructorAssignment.objects.update_or_create(
        course=invitation.course,
        user=user,
        defaults={'invited_by': invitation.invited_by},
    )
    invitation.status = InvitationStatus.ACCEPTED
    invitation.responded_at = timezone.now()
    invitation.save(update_fields=['status', 'responded_at', 'updated_at'])
    return assignment


def reject_course_instructor_invitation(invitation):
    if invitation.status != InvitationStatus.PENDING:
        return invitation
    invitation.status = InvitationStatus.REJECTED
    invitation.responded_at = timezone.now()
    invitation.save(update_fields=['status', 'responded_at', 'updated_at'])
    return invitation
