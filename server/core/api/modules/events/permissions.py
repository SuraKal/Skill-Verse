from enum import Enum

from ...models import (
    CoOrganizerStatus,
    Event,
    EventCoOrganizer,
    EventParticipant,
    EventInviteStatus,
    EventRole,
    EventStatus,
    EventVisibility,
    Membership,
    OrganizationRole,
)


class EventAction(str, Enum):
    CREATE_EVENT = 'create_event'
    APPROVE_REJECT_EVENT = 'approve_reject_event'
    EDIT_EVENT_DETAILS = 'edit_event_details'
    INVITE_CO_ORGANIZER = 'invite_co_organizer'
    INVITE_PARTICIPANT = 'invite_participant'
    ASSIGN_REMOVE_EVENT_ADMIN = 'assign_remove_event_admin'
    CHANGE_PARTICIPANT_ROLE = 'change_participant_role'
    CANCEL_ARCHIVE_EVENT = 'cancel_archive_event'
    VIEW_PRIVATE_EVENT = 'view_private_event'
    VIEW_ORG_PRIVATE_EVENT = 'view_org_private_event'
    VIEW_PUBLIC_EVENT = 'view_public_event'
    SELF_REGISTER_PUBLIC_EVENT = 'self_register_public_event'


HOST_ORG_MANAGER_ROLES = {OrganizationRole.CREATOR, OrganizationRole.MANAGER}
SPECIAL_INVITABLE_EVENT_ROLES = {EventRole.ATTENDEE, EventRole.SPEAKER, EventRole.VOLUNTEER, EventRole.GUEST}
IMMUTABLE_PARTICIPANT_ROLES = {EventRole.INITIATOR}
ARCHIVED_OR_COMPLETED_STATUSES = {EventStatus.ARCHIVED, EventStatus.COMPLETED}
ACTIVE_EDIT_STATUSES = {EventStatus.ACTIVE, EventStatus.ONGOING}


def get_organization_membership(user, organization):
    if not getattr(user, 'is_authenticated', False):
        return None
    return Membership.objects.filter(user=user, organization=organization).first()


def is_organization_creator_or_manager(user, organization):
    membership = get_organization_membership(user, organization)
    return bool(membership and membership.role in HOST_ORG_MANAGER_ROLES)


def is_organization_creator(user, organization):
    membership = get_organization_membership(user, organization)
    return bool(membership and membership.role == OrganizationRole.CREATOR)


def is_organization_manager(user, organization):
    membership = get_organization_membership(user, organization)
    return bool(membership and membership.role == OrganizationRole.MANAGER)


def is_event_initiator(user, event):
    return bool(getattr(user, 'is_authenticated', False) and isinstance(event, Event) and event.created_by_id == user.id)


def get_event_participant_for_user(user, event):
    if not getattr(user, 'is_authenticated', False):
        return None
    return EventParticipant.objects.filter(event=event, user=user).first()


def is_event_admin(user, event):
    participant = get_event_participant_for_user(user, event)
    return bool(
        participant
        and participant.invite_status == EventInviteStatus.ACCEPTED
        and participant.event_role == EventRole.ADMIN
    )


def is_event_host_member(user, event):
    return bool(get_organization_membership(user, event.organization))


def get_accepted_co_organizer_membership(user, event):
    if not getattr(user, 'is_authenticated', False):
        return None

    accepted_organizations = EventCoOrganizer.objects.filter(
        event=event,
        status=CoOrganizerStatus.ACCEPTED,
    ).values_list('organization_id', flat=True)
    if not accepted_organizations:
        return None

    return Membership.objects.filter(
        user=user,
        organization_id__in=accepted_organizations,
        role__in=HOST_ORG_MANAGER_ROLES,
    ).first()


def is_co_organizer_manager_or_creator(user, event):
    return get_accepted_co_organizer_membership(user, event) is not None


def is_co_organizer_member(user, event):
    if not getattr(user, 'is_authenticated', False):
        return False

    accepted_organizations = EventCoOrganizer.objects.filter(
        event=event,
        status=CoOrganizerStatus.ACCEPTED,
    ).values_list('organization_id', flat=True)
    if not accepted_organizations:
        return False

    return Membership.objects.filter(
        user=user,
        organization_id__in=accepted_organizations,
        role=OrganizationRole.MEMBER,
    ).exists()


def can_create_event(user, organization):
    return is_organization_creator_or_manager(user, organization)


def can_approve_or_reject_event(user, event):
    return is_organization_creator(user, event.organization)


def can_edit_event_details(user, event):
    if event.status in ARCHIVED_OR_COMPLETED_STATUSES:
        return False

    if is_organization_creator(user, event.organization):
        return True

    if event.status in {EventStatus.PENDING_APPROVAL, EventStatus.REJECTED} and is_organization_manager(user, event.organization):
        return True

    if event.status in ACTIVE_EDIT_STATUSES and (is_event_initiator(user, event) or is_event_admin(user, event)):
        return True

    return False


def can_invite_co_organizer(user, event):
    if event.visibility == EventVisibility.ORG_PRIVATE:
        return False
    return is_organization_creator_or_manager(user, event.organization) or is_event_initiator(user, event)


def can_invite_participant(user, event, event_role):
    if event_role not in SPECIAL_INVITABLE_EVENT_ROLES:
        return False

    if is_organization_creator_or_manager(user, event.organization):
        return True

    if is_event_initiator(user, event):
        return True

    if is_event_admin(user, event):
        return True

    if event.visibility in {EventVisibility.PRIVATE, EventVisibility.PUBLIC}:
        return is_co_organizer_manager_or_creator(user, event)

    return False


def can_assign_or_remove_event_admin(user, event):
    return is_organization_creator(user, event.organization) or is_event_initiator(user, event)


def can_change_participant_role(user, event):
    return (
        is_organization_creator_or_manager(user, event.organization)
        or is_event_initiator(user, event)
        or is_event_admin(user, event)
    )


def can_cancel_or_archive_event(user, event):
    return is_organization_creator(user, event.organization) or is_event_initiator(user, event)


def can_view_event_participants(user, event):
    return can_change_participant_role(user, event) or can_invite_participant(user, event, EventRole.ATTENDEE)


def can_view_event_co_organizers(user, event):
    return can_invite_co_organizer(user, event)


def can_view_private_event(user, event, *, email=None):
    if event.visibility != EventVisibility.PRIVATE:
        return False

    allowed_statuses = {EventInviteStatus.PENDING, EventInviteStatus.ACCEPTED}

    if getattr(user, 'is_authenticated', False):
        if EventParticipant.objects.filter(
            event=event,
            user=user,
            invite_status__in=allowed_statuses,
        ).exists():
            return True
        email = email or getattr(user, 'email', None)

    if email:
        return EventParticipant.objects.filter(
            event=event,
            email__iexact=email,
            invite_status__in=allowed_statuses,
        ).exists()

    return False


def can_view_org_private_event(user, event):
    if event.visibility != EventVisibility.ORG_PRIVATE:
        return False

    return (
        is_event_host_member(user, event)
        or is_event_initiator(user, event)
        or is_event_admin(user, event)
    )


def can_view_public_event(event):
    return event.visibility == EventVisibility.PUBLIC


def can_view_event(user, event, *, email=None):
    if can_view_public_event(event):
        return True
    if event.visibility == EventVisibility.ORG_PRIVATE:
        return can_view_org_private_event(user, event)
    if event.visibility == EventVisibility.PRIVATE:
        return can_view_private_event(user, event, email=email)
    return False


def can_self_register_public_event(user, event):
    return (
        event.visibility == EventVisibility.PUBLIC
        and event.status in {EventStatus.ACTIVE, EventStatus.ONGOING}
    )


def _normalize_event_action(action):
    if isinstance(action, EventAction):
        return action
    try:
        return EventAction(action)
    except ValueError:
        return None


def can_user_perform_event_action(user, action, *, event=None, organization=None, event_role=None, email=None):
    action = _normalize_event_action(action)
    if action is None:
        return False

    if action == EventAction.CREATE_EVENT:
        return organization is not None and can_create_event(user, organization)
    if event is None:
        return False

    if action == EventAction.APPROVE_REJECT_EVENT:
        return can_approve_or_reject_event(user, event)
    if action == EventAction.EDIT_EVENT_DETAILS:
        return can_edit_event_details(user, event)
    if action == EventAction.INVITE_CO_ORGANIZER:
        return can_invite_co_organizer(user, event)
    if action == EventAction.INVITE_PARTICIPANT:
        return event_role is not None and can_invite_participant(user, event, event_role)
    if action == EventAction.ASSIGN_REMOVE_EVENT_ADMIN:
        return can_assign_or_remove_event_admin(user, event)
    if action == EventAction.CHANGE_PARTICIPANT_ROLE:
        return event_role not in IMMUTABLE_PARTICIPANT_ROLES and can_change_participant_role(user, event)
    if action == EventAction.CANCEL_ARCHIVE_EVENT:
        return can_cancel_or_archive_event(user, event)
    if action == EventAction.VIEW_PRIVATE_EVENT:
        return can_view_private_event(user, event, email=email)
    if action == EventAction.VIEW_ORG_PRIVATE_EVENT:
        return can_view_org_private_event(user, event)
    if action == EventAction.VIEW_PUBLIC_EVENT:
        return can_view_public_event(event)
    if action == EventAction.SELF_REGISTER_PUBLIC_EVENT:
        return can_self_register_public_event(user, event)

    return False
