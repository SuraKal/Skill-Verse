from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from ..models import Invitation, InvitationStatus, Membership, OrganizationRole
from .email_service import send_organization_invitation_email


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
    accept_url = f'{frontend_url.rstrip("/")}/invite/{invitation.token}?action=accept'
    reject_url = f'{frontend_url.rstrip("/")}/invite/{invitation.token}?action=reject'
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
