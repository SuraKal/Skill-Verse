import { Icon } from '../DashboardLayout'
import type { EventInvitationDetail } from '../../types'
import { EventBadge } from './EventBadge'
import { formatEventDateRange } from './eventUtils'

export function EventInvitationCard({
  invitation,
  working,
  onAccept,
  onDecline,
}: {
  invitation: EventInvitationDetail
  working: boolean
  onAccept: (invitation: EventInvitationDetail) => void
  onDecline: (invitation: EventInvitationDetail) => void
}) {
  const isPending = invitation.status === 'pending'
  const infoLine =
    invitation.event_invitation_type === 'co_organizer'
      ? `You've been invited to co-organize as ${invitation.organization_name || invitation.invite_email}`
      : invitation.organization_name

  return (
    <div className="sv-invite-card">
      <div className="sv-invite-card__icon">
        <Icon.Mail />
      </div>
      <div className="sv-invite-card__info">
        <div className="sv-invite-card__org">{invitation.event_name}</div>
        <div className="sv-invite-card__meta">{infoLine}</div>
        <div className="sv-invite-card__meta">
          {formatEventDateRange(invitation.event_start_datetime, invitation.event_end_datetime)}
        </div>
        <div className="sv-invite-card__meta">{invitation.event_location}</div>
        <div className="sv-tag-group" style={{ marginTop: 8 }}>
          <EventBadge type="role" value={invitation.event_invitation_type === 'co_organizer' ? 'co_organizer' : invitation.event_role || 'attendee'} />
          <EventBadge type="status" value={invitation.status} />
        </div>
      </div>
      {isPending && (
        <div className="sv-invite-card__actions">
          <button
            className="btn btn--ghost btn--sm"
            type="button"
            onClick={() => onDecline(invitation)}
            disabled={working}
          >
            Decline
          </button>
          <button
            className="btn btn--blue btn--sm"
            type="button"
            onClick={() => onAccept(invitation)}
            disabled={working}
          >
            {working ? 'Updating...' : 'Accept'}
          </button>
        </div>
      )}
    </div>
  )
}
