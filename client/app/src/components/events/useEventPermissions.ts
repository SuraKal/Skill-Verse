import { useMemo } from 'react'

import type {
  DashboardData,
  EventCoOrganizerRecord,
  EventModel,
  EventParticipantRecord,
} from '../../types'

export interface EventPermissions {
  hostRole: 'creator' | 'manager' | 'member' | null
  isCreator: boolean
  isManager: boolean
  isInitiator: boolean
  isAdmin: boolean
  canCreateEvent: boolean
  canEditEventDetails: boolean
  canInviteParticipants: boolean
  canManageParticipantRows: boolean
  canInviteCoOrganizers: boolean
  canManageCoOrganizers: boolean
  canViewParticipantsTab: boolean
  canViewCoOrganizersTab: boolean
  canViewInvitationsTab: boolean
  canRegisterPublicEvent: boolean
  showCreatorApprovalBanner: boolean
  showManagerPendingBanner: boolean
  showManagerRejectedBanner: boolean
}

function getMembershipRole(dashboard: DashboardData | null, organizationId: string) {
  return dashboard?.memberships.find((membership) => membership.organization_id === organizationId)?.role ?? null
}

function getUserParticipantRecord(
  participants: EventParticipantRecord[],
  dashboard: DashboardData | null,
) {
  if (!dashboard) {
    return null
  }

  return (
    participants.find(
      (participant) =>
        participant.user?.id === dashboard.user.id ||
        participant.email.toLowerCase() === dashboard.user.email.toLowerCase(),
    ) ?? null
  )
}

function getUserCoOrganizerRecord(
  coOrganizers: EventCoOrganizerRecord[],
  dashboard: DashboardData | null,
) {
  if (!dashboard) {
    return null
  }

  const acceptedOrganizationIds = new Set(
    coOrganizers
      .filter(
        (coOrganizer) =>
          coOrganizer.status === 'accepted' && coOrganizer.organization_id != null,
      )
      .map((coOrganizer) => coOrganizer.organization_id as string),
  )

  return dashboard.memberships.find(
    (membership) =>
      acceptedOrganizationIds.has(membership.organization_id) &&
      (membership.role === 'creator' || membership.role === 'manager'),
  ) ?? null
}

export function useEventPermissions(
  event: EventModel | null,
  dashboard: DashboardData | null,
  participants: EventParticipantRecord[] = [],
  coOrganizers: EventCoOrganizerRecord[] = [],
): EventPermissions {
  return useMemo(() => {
    if (!event) {
      const canCreateEvent = Boolean(
        dashboard?.memberships.some(
          (membership) => membership.role === 'creator' || membership.role === 'manager',
        ),
      )

      return {
        hostRole: null,
        isCreator: false,
        isManager: false,
        isInitiator: false,
        isAdmin: false,
        canCreateEvent,
        canEditEventDetails: false,
        canInviteParticipants: false,
        canManageParticipantRows: false,
        canInviteCoOrganizers: false,
        canManageCoOrganizers: false,
        canViewParticipantsTab: false,
        canViewCoOrganizersTab: false,
        canViewInvitationsTab: false,
        canRegisterPublicEvent: false,
        showCreatorApprovalBanner: false,
        showManagerPendingBanner: false,
        showManagerRejectedBanner: false,
      }
    }

    const hostRole = getMembershipRole(dashboard, event.organization.id) as
      | 'creator'
      | 'manager'
      | 'member'
      | null
    const participant = getUserParticipantRecord(participants, dashboard)
    const coOrganizerMembership = getUserCoOrganizerRecord(coOrganizers, dashboard)

    const isInitiator = Boolean(dashboard && event.created_by.id === dashboard.user.id)
    const isAdmin =
      participant?.invite_status === 'accepted' && participant.event_role === 'admin'
    const isCreator = hostRole === 'creator'
    const isManager = hostRole === 'manager'
    const isAcceptedCoOrgManager = Boolean(coOrganizerMembership)
    const canAcceptedCoOrgManageParticipants =
      event.visibility !== 'org_private' && isAcceptedCoOrgManager
    const canCreateEvent = Boolean(
      dashboard?.memberships.some(
        (membership) => membership.role === 'creator' || membership.role === 'manager',
      ),
    )
    const canInviteParticipants = Boolean(
      isCreator ||
        isManager ||
        isInitiator ||
        isAdmin ||
        canAcceptedCoOrgManageParticipants,
    )
    const canManageParticipantRows = Boolean(
      isCreator || isManager || isInitiator || isAdmin,
    )
    const canInviteCoOrganizers = Boolean(
      event.visibility !== 'org_private' && (isCreator || isManager || isInitiator),
    )
    const canManageCoOrganizers = Boolean(
      event.visibility !== 'org_private' && (isCreator || isManager || isInitiator),
    )
    const canViewParticipantsTab = Boolean(
      isCreator ||
        isManager ||
        isInitiator ||
        isAdmin ||
        canAcceptedCoOrgManageParticipants,
    )
    const canViewCoOrganizersTab = Boolean(
      event.visibility !== 'org_private' && (isCreator || isManager || isInitiator),
    )
    const canViewInvitationsTab = Boolean(
      isCreator ||
        isManager ||
        isInitiator ||
        isAdmin ||
        canAcceptedCoOrgManageParticipants,
    )
    const canEditEventDetails = Boolean(
      event.status !== 'archived' &&
        event.status !== 'completed' &&
        (isCreator ||
          ((event.status === 'pending_approval' || event.status === 'rejected') && isManager) ||
          ((event.status === 'active' || event.status === 'ongoing') && (isInitiator || isAdmin))),
    )
    const canRegisterPublicEvent =
      event.visibility === 'public' &&
      (event.status === 'active' || event.status === 'ongoing')

    return {
      hostRole,
      isCreator,
      isManager,
      isInitiator,
      isAdmin,
      canCreateEvent,
      canEditEventDetails,
      canInviteParticipants,
      canManageParticipantRows,
      canInviteCoOrganizers,
      canManageCoOrganizers,
      canViewParticipantsTab,
      canViewCoOrganizersTab,
      canViewInvitationsTab,
      canRegisterPublicEvent,
      showCreatorApprovalBanner:
        event.status === 'pending_approval' && isCreator,
      showManagerPendingBanner:
        event.status === 'pending_approval' && isManager && isInitiator,
      showManagerRejectedBanner:
        event.status === 'rejected' && isManager && isInitiator,
    }
  }, [coOrganizers, dashboard, event, participants])
}
