import secrets
from datetime import timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.exceptions import PermissionDenied
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers
from rest_framework.exceptions import APIException

from ...models import (
    CoOrganizerStatus,
    Event,
    EventCoOrganizer,
    EventInviteStatus,
    EventParticipant,
    EventRole,
    EventStatus,
    EventVisibility,
    InvitationToken,
    InviteOrigin,
    Membership,
    Organization,
    OrganizationRole,
)
from ...services.email_service import (
    send_event_approval_request_email,
    send_event_approval_result_email,
    send_event_co_organizer_invitation_email,
    send_event_participant_invitation_email,
)
from .permissions import (
    can_approve_or_reject_event,
    can_create_event,
    can_edit_event_details,
    can_cancel_or_archive_event,
    can_invite_co_organizer,
    can_invite_participant,
    can_change_participant_role,
    is_organization_creator,
)

User = get_user_model()


class EventInvitationConflict(APIException):
    status_code = 409
    default_detail = 'A matching invitation already exists for this email.'
    default_code = 'event_invitation_conflict'


class EventInvitationExpired(APIException):
    status_code = 410
    default_detail = 'This invitation has expired. Request a new invitation.'
    default_code = 'event_invitation_expired'


def _format_event_datetime(event):
    return f'{event.start_datetime:%Y-%m-%d %H:%M %Z}'


def _normalize_email(email):
    return (email or '').lower().strip()


def _get_creator_emails(organization):
    return list(
        Membership.objects.filter(
            organization=organization,
            role=OrganizationRole.CREATOR,
        ).select_related('user').values_list('user__email', flat=True)
    )


def _ensure_editable_event(event):
    if event.status in {EventStatus.ARCHIVED, EventStatus.COMPLETED}:
        raise PermissionDenied('An event cannot be edited after it has been archived or completed.')


def _create_invitation_token(*, event_participant=None, event_co_organizer=None):
    token_record = InvitationToken.objects.create(
        token=secrets.token_urlsafe(32),
        event_participant=event_participant,
        event_co_organizer=event_co_organizer,
        expires_at=timezone.now() + timedelta(days=settings.INVITATION_EXPIRY_DAYS),
    )
    if event_participant is not None:
        event_participant._prefetched_invitation_token = token_record
    if event_co_organizer is not None:
        event_co_organizer._prefetched_invitation_token = token_record
    return token_record


def _get_active_invitation_token(invitation):
    token = getattr(invitation, '_prefetched_invitation_token', None)
    if token is not None:
        return token
    return invitation.tokens.order_by('-created_at').first()


def _get_token_invitation(token, *, kind):
    query = InvitationToken.objects.select_related(
        'event_participant__event__organization',
        'event_participant__invited_by',
        'event_participant__user',
        'event_co_organizer__event__organization',
        'event_co_organizer__invited_by_user',
    ).filter(token=token)
    invitation_token = query.first()
    if invitation_token is None:
        raise serializers.ValidationError('Invitation not found.')
    if invitation_token.revoked:
        raise serializers.ValidationError('This invitation has been revoked.')
    if invitation_token.expires_at <= timezone.now():
        raise EventInvitationExpired()

    if kind == 'participant':
        invitation = invitation_token.event_participant
    else:
        invitation = invitation_token.event_co_organizer

    if invitation is None:
        raise serializers.ValidationError('Invitation is not linked to an event invite.')
    return invitation_token, invitation


def _ensure_invitation_token_is_active(invitation_token):
    if invitation_token.revoked:
        raise serializers.ValidationError('This invitation has been revoked.')
    if invitation_token.expires_at <= timezone.now():
        raise EventInvitationExpired()


def _select_co_organizer_organization(*, invitation, user, organization_id=None):
    if invitation.organization_id:
        if organization_id and str(organization_id) != str(invitation.organization_id):
            raise serializers.ValidationError(
                {'organization_id': 'This invitation is tied to a different organization.'}
            )
        membership = Membership.objects.filter(
            user=user,
            organization=invitation.organization,
            role__in={OrganizationRole.CREATOR, OrganizationRole.MANAGER},
        ).first()
        if membership is None:
            raise PermissionDenied('You do not have permission to accept this invitation for that organization.')
        return invitation.organization

    if organization_id:
        organization = Organization.objects.filter(id=organization_id).first()
        if organization is None:
            raise serializers.ValidationError({'organization_id': 'Selected organization was not found.'})
        membership = Membership.objects.filter(
            user=user,
            organization=organization,
            role__in={OrganizationRole.CREATOR, OrganizationRole.MANAGER},
        ).first()
        if membership is None:
            raise PermissionDenied('You do not have permission to accept this invitation for that organization.')
        return organization

    manageable_organizations = list(
        Organization.objects.filter(
            memberships__user=user,
            memberships__role__in={OrganizationRole.CREATOR, OrganizationRole.MANAGER},
        ).distinct()
    )
    if len(manageable_organizations) == 1:
        return manageable_organizations[0]

    raise serializers.ValidationError(
        {'organization_id': 'Select the organization that should co-organize this event.'}
    )


@transaction.atomic
def submit_event_for_approval(*, event, submitted_by):
    _ensure_editable_event(event)
    if not can_create_event(submitted_by, event.organization) and not can_edit_event_details(submitted_by, event):
        raise PermissionDenied('You do not have permission to submit this event for approval.')

    event.status = EventStatus.PENDING_APPROVAL
    event.rejection_note = None
    event.save(update_fields=['status', 'rejection_note', 'updated_at'])

    creator_emails = _get_creator_emails(event.organization)
    review_url = f'{settings.FRONTEND_URL.rstrip("/")}/dashboard/events/{event.id}'
    approve_url = f'{review_url}?action=approve'
    reject_url = f'{review_url}?action=reject'
    for creator_email in creator_emails:
        send_event_approval_request_email(
            invited_email=creator_email,
            manager_name=submitted_by.get_full_name().strip() or submitted_by.username,
            organization_name=event.organization.name,
            event_name=event.title,
            event_datetime=_format_event_datetime(event),
            location=event.location,
            review_url=review_url,
            approve_url=approve_url,
            reject_url=reject_url,
        )

    return event


@transaction.atomic
def approve_event(*, event, approved_by):
    if not can_approve_or_reject_event(approved_by, event):
        raise PermissionDenied('Only the organization creator can approve this event.')
    if event.status != EventStatus.PENDING_APPROVAL:
        raise serializers.ValidationError('Only events pending approval can be approved.')

    event.status = EventStatus.ACTIVE
    event.rejection_note = None
    event.save(update_fields=['status', 'rejection_note', 'updated_at'])

    send_event_approval_result_email(
        invited_email=event.created_by.email,
        organization_name=event.organization.name,
        event_name=event.title,
        event_datetime=_format_event_datetime(event),
        location=event.location,
        approved=True,
    )
    return event


@transaction.atomic
def reject_event(*, event, rejected_by, rejection_note):
    if not can_approve_or_reject_event(rejected_by, event):
        raise PermissionDenied('Only the organization creator can reject this event.')
    if event.status != EventStatus.PENDING_APPROVAL:
        raise serializers.ValidationError('Only events pending approval can be rejected.')

    note = (rejection_note or '').strip()
    if not note:
        raise serializers.ValidationError({'rejection_note': 'Rejection note is required.'})

    event.status = EventStatus.REJECTED
    event.rejection_note = note
    event.save(update_fields=['status', 'rejection_note', 'updated_at'])

    send_event_approval_result_email(
        invited_email=event.created_by.email,
        organization_name=event.organization.name,
        event_name=event.title,
        event_datetime=_format_event_datetime(event),
        location=event.location,
        approved=False,
        rejection_note=note,
    )
    return event


@transaction.atomic
def create_event(*, organization, created_by, title, description, cover_image, location, start_datetime, end_datetime, timezone, visibility):
    if not can_create_event(created_by, organization):
        raise PermissionDenied('You do not have permission to create an event for this organization.')

    is_creator = is_organization_creator(created_by, organization)
    event = Event.objects.create(
        organization=organization,
        created_by=created_by,
        title=title,
        description=description,
        cover_image=cover_image or None,
        location=location,
        start_datetime=start_datetime,
        end_datetime=end_datetime,
        timezone=timezone,
        visibility=visibility,
        status=EventStatus.ACTIVE if is_creator else EventStatus.DRAFT,
    )
    if not is_creator:
        submit_event_for_approval(event=event, submitted_by=created_by)
    return event


@transaction.atomic
def update_event(*, event, updated_by, title=None, description=None, cover_image=None, location=None, start_datetime=None, end_datetime=None, timezone=None, visibility=None):
    _ensure_editable_event(event)
    if not can_edit_event_details(updated_by, event):
        raise PermissionDenied('You do not have permission to edit this event.')

    if title is not None:
        event.title = title
    if description is not None:
        event.description = description
    if cover_image is not None:
        event.cover_image = cover_image or None
    if location is not None:
        event.location = location
    if start_datetime is not None:
        event.start_datetime = start_datetime
    if end_datetime is not None:
        event.end_datetime = end_datetime
    if timezone is not None:
        event.timezone = timezone
    if visibility is not None:
        event.visibility = visibility
    event.save()

    if event.status in {EventStatus.PENDING_APPROVAL, EventStatus.REJECTED} and updated_by and updated_by.is_authenticated:
        if not is_organization_creator(updated_by, event.organization):
            submit_event_for_approval(event=event, submitted_by=updated_by)
    return event


@transaction.atomic
def archive_event(*, event, archived_by):
    if not can_cancel_or_archive_event(archived_by, event):
        raise PermissionDenied('You do not have permission to archive this event.')
    if event.status not in {EventStatus.ACTIVE, EventStatus.COMPLETED}:
        raise serializers.ValidationError('Only active or completed events can be archived.')

    event.status = EventStatus.ARCHIVED
    event.save(update_fields=['status', 'updated_at'])
    return event


@transaction.atomic
def register_public_event(*, event, user):
    if not getattr(user, 'is_authenticated', False):
        raise PermissionDenied('You must create an account to register for this event.')
    if not (event.visibility == EventVisibility.PUBLIC and event.status in {EventStatus.ACTIVE, EventStatus.ONGOING}):
        raise serializers.ValidationError('Public event self-registration is only available when the event is active or ongoing.')

    existing_participant = EventParticipant.objects.filter(event=event, email__iexact=user.email).first()
    if existing_participant is not None:
        if existing_participant.invite_status == EventInviteStatus.ACCEPTED:
            return existing_participant
        raise EventInvitationConflict('You are already registered or invited to this event.')

    participant = EventParticipant.objects.create(
        event=event,
        user=user,
        email=_normalize_email(user.email),
        event_role=EventRole.ATTENDEE,
        invite_status=EventInviteStatus.ACCEPTED,
        invite_origin=InviteOrigin.SELF_REGISTERED,
        invited_by=event.created_by,
        responded_at=timezone.now(),
    )
    return participant


@transaction.atomic
def remove_event_participant(*, event, participant, removed_by):
    if participant.event_id != event.id:
        raise serializers.ValidationError('This participant does not belong to the event.')
    if participant.event_role == EventRole.INITIATOR:
        raise serializers.ValidationError('The initiator cannot be removed from the event.')
    if not can_change_participant_role(removed_by, event):
        raise PermissionDenied('You do not have permission to remove participants from this event.')
    participant.delete()
    return True


@transaction.atomic
def remove_event_co_organizer(*, event, co_organizer, removed_by):
    if co_organizer.event_id != event.id:
        raise serializers.ValidationError('This co-organizer does not belong to the event.')
    if not can_invite_co_organizer(removed_by, event):
        raise PermissionDenied('You do not have permission to remove co-organizers from this event.')
    co_organizer.delete()
    return True


@transaction.atomic
def create_event_participant_invitation(*, event, invited_by, email, event_role, frontend_url):
    normalized_email = _normalize_email(email)
    if event.visibility == EventVisibility.ORG_PRIVATE:
        is_host_member = Membership.objects.filter(
            organization=event.organization,
            user__email__iexact=normalized_email,
        ).exists()
        if not is_host_member:
            raise serializers.ValidationError(
                'ORG_PRIVATE event invitations can only be sent to host organization members.'
            )

    if EventParticipant.objects.filter(
        event=event,
        email__iexact=normalized_email,
        invite_status__in={EventInviteStatus.PENDING, EventInviteStatus.ACCEPTED},
    ).exists():
        raise EventInvitationConflict()

    participant_user = User.objects.filter(email__iexact=normalized_email).first()
    participant = EventParticipant.objects.create(
        event=event,
        user=participant_user,
        email=normalized_email,
        event_role=event_role,
        invite_status=EventInviteStatus.PENDING,
        invite_origin=InviteOrigin.INVITED,
        invited_by=invited_by,
    )
    invitation_token = _create_invitation_token(event_participant=participant)

    accept_url = f'{frontend_url.rstrip("/")}/invitations/participant/{invitation_token.token}/accept'
    decline_url = f'{frontend_url.rstrip("/")}/invitations/participant/{invitation_token.token}/decline'
    registration_url = (
        f'{frontend_url.rstrip("/")}/register?event_invitation_token={invitation_token.token}&type=participant'
    )
    send_event_participant_invitation_email(
        invited_email=participant.email,
        organization_name=event.organization.name,
        event_name=event.title,
        event_datetime=_format_event_datetime(event),
        location=event.location,
        event_role=event_role,
        accept_url=accept_url,
        decline_url=decline_url,
        registration_url=registration_url,
        needs_registration=participant_user is None,
    )
    return participant


@transaction.atomic
def create_event_co_organizer_invitation(*, event, invited_by, contact_email, organization_id, frontend_url):
    if event.visibility == EventVisibility.ORG_PRIVATE:
        raise serializers.ValidationError('ORG_PRIVATE events cannot have co-organizer organizations.')
    if not can_invite_co_organizer(invited_by, event):
        raise PermissionDenied('You do not have permission to invite co-organizers to this event.')

    normalized_email = _normalize_email(contact_email)
    organization = None
    if organization_id:
        organization = Organization.objects.filter(id=organization_id).first()
        if organization is None:
            raise serializers.ValidationError({'organization_id': 'Selected organization was not found.'})

    duplicate_qs = EventCoOrganizer.objects.filter(
        event=event,
        invite_email__iexact=normalized_email,
        status__in={CoOrganizerStatus.PENDING, CoOrganizerStatus.ACCEPTED},
    )
    if duplicate_qs.exists():
        raise EventInvitationConflict('A co-organizer invitation already exists for this email.')

    co_organizer = EventCoOrganizer.objects.create(
        event=event,
        organization=organization,
        invited_by_user=invited_by,
        invite_email=normalized_email,
        status=CoOrganizerStatus.PENDING,
    )
    invitation_token = _create_invitation_token(event_co_organizer=co_organizer)

    accept_url = f'{frontend_url.rstrip("/")}/invitations/co-organizer/{invitation_token.token}/accept'
    decline_url = f'{frontend_url.rstrip("/")}/invitations/co-organizer/{invitation_token.token}/decline'
    registration_url = (
        f'{frontend_url.rstrip("/")}/register?event_invitation_token={invitation_token.token}&type=co_organizer'
    )
    send_event_co_organizer_invitation_email(
        invited_email=co_organizer.invite_email,
        organization_name=event.organization.name,
        event_name=event.title,
        event_datetime=_format_event_datetime(event),
        location=event.location,
        accept_url=accept_url,
        decline_url=decline_url,
        registration_url=registration_url,
        needs_registration=User.objects.filter(email__iexact=normalized_email).exists() is False,
    )
    return co_organizer


@transaction.atomic
def accept_event_participant_invitation(*, invitation_token, invitation, user):
    _ensure_invitation_token_is_active(invitation_token)
    if invitation.invite_status != EventInviteStatus.PENDING:
        raise serializers.ValidationError('This invitation is no longer pending.')
    if invitation_token.used_at is not None:
        raise serializers.ValidationError('This invitation has already been used.')
    if invitation.email.lower() != user.email.lower():
        raise serializers.ValidationError('This invitation was sent to a different email address.')

    invitation.user = user
    invitation.invite_status = EventInviteStatus.ACCEPTED
    invitation.responded_at = timezone.now()
    invitation.save(update_fields=['user', 'invite_status', 'responded_at', 'updated_at'])
    invitation_token.used_at = timezone.now()
    invitation_token.save(update_fields=['used_at', 'updated_at'])
    return invitation


@transaction.atomic
def decline_event_participant_invitation(*, invitation_token, invitation):
    _ensure_invitation_token_is_active(invitation_token)
    if invitation.invite_status != EventInviteStatus.PENDING:
        raise serializers.ValidationError('This invitation is no longer pending.')
    if invitation_token.used_at is not None:
        raise serializers.ValidationError('This invitation has already been used.')

    invitation.invite_status = EventInviteStatus.DECLINED
    invitation.responded_at = timezone.now()
    invitation.save(update_fields=['invite_status', 'responded_at', 'updated_at'])
    invitation_token.used_at = timezone.now()
    invitation_token.save(update_fields=['used_at', 'updated_at'])
    return invitation


@transaction.atomic
def accept_event_co_organizer_invitation(*, invitation_token, invitation, user, organization_id=None):
    _ensure_invitation_token_is_active(invitation_token)
    if invitation.status != CoOrganizerStatus.PENDING:
        raise serializers.ValidationError('This invitation is no longer pending.')
    if invitation_token.used_at is not None:
        raise serializers.ValidationError('This invitation has already been used.')
    if invitation.invite_email.lower() != user.email.lower():
        raise serializers.ValidationError('This invitation was sent to a different email address.')

    organization = _select_co_organizer_organization(
        invitation=invitation,
        user=user,
        organization_id=organization_id,
    )
    invitation.organization = organization
    invitation.status = CoOrganizerStatus.ACCEPTED
    invitation.responded_at = timezone.now()
    invitation.save(update_fields=['organization', 'status', 'responded_at', 'updated_at'])
    invitation_token.used_at = timezone.now()
    invitation_token.save(update_fields=['used_at', 'updated_at'])
    return invitation


@transaction.atomic
def decline_event_co_organizer_invitation(*, invitation_token, invitation):
    _ensure_invitation_token_is_active(invitation_token)
    if invitation.status != CoOrganizerStatus.PENDING:
        raise serializers.ValidationError('This invitation is no longer pending.')
    if invitation_token.used_at is not None:
        raise serializers.ValidationError('This invitation has already been used.')

    invitation.status = CoOrganizerStatus.DECLINED
    invitation.responded_at = timezone.now()
    invitation.save(update_fields=['status', 'responded_at', 'updated_at'])
    invitation_token.used_at = timezone.now()
    invitation_token.save(update_fields=['used_at', 'updated_at'])
    return invitation


def preview_event_participant_invitation(*, token):
    invitation_token, invitation = _get_token_invitation(token, kind='participant')
    return invitation_token, invitation


def preview_event_co_organizer_invitation(*, token):
    invitation_token, invitation = _get_token_invitation(token, kind='co_organizer')
    return invitation_token, invitation


def auto_accept_pending_event_invitation_for_user(*, user, token, organization_id=None):
    try:
        invitation_token = InvitationToken.objects.select_related(
            'event_participant',
            'event_co_organizer',
        ).get(token=token)
    except InvitationToken.DoesNotExist:
        return None

    if invitation_token.revoked or invitation_token.expires_at <= timezone.now():
        return None

    if invitation_token.event_participant_id:
        try:
            return accept_event_participant_invitation(
                invitation_token=invitation_token,
                invitation=invitation_token.event_participant,
                user=user,
            )
        except (serializers.ValidationError, EventInvitationExpired):
            return None

    if invitation_token.event_co_organizer_id:
        try:
            return accept_event_co_organizer_invitation(
                invitation_token=invitation_token,
                invitation=invitation_token.event_co_organizer,
                user=user,
                organization_id=organization_id,
            )
        except (serializers.ValidationError, EventInvitationExpired):
            return None

    return None


@transaction.atomic
def activate_due_events(*, now=None):
    current_time = now or timezone.now()
    events = Event.objects.filter(status=EventStatus.ACTIVE, start_datetime__lte=current_time)
    updated_events = []
    for event in events.select_related('organization', 'created_by'):
        event.status = EventStatus.ONGOING
        event.save(update_fields=['status', 'updated_at'])
        updated_events.append(event)
    return updated_events


@transaction.atomic
def complete_due_events(*, now=None):
    current_time = now or timezone.now()
    events = Event.objects.filter(status=EventStatus.ONGOING, end_datetime__lte=current_time)
    updated_events = []
    for event in events.select_related('organization', 'created_by'):
        event.status = EventStatus.COMPLETED
        event.save(update_fields=['status', 'updated_at'])
        updated_events.append(event)
    return updated_events


def run_event_lifecycle_jobs(*, now=None):
    activated = activate_due_events(now=now)
    completed = complete_due_events(now=now)
    return {
        'activated': len(activated),
        'completed': len(completed),
    }
