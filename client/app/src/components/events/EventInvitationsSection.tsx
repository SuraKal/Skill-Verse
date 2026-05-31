import type { EventInvitationDetail } from '../../types'
import { EventInvitationCard } from './EventInvitationCard'
import { EventEmptyState, EventErrorState, EventSkeletonGrid } from './EventStates'

export function EventInvitationsSection({
  invitations,
  workingId,
  loading = false,
  error = null,
  onRetry,
  onAccept,
  onDecline,
}: {
  invitations: EventInvitationDetail[]
  workingId: string | null
  loading?: boolean
  error?: string | null
  onRetry?: () => void
  onAccept: (invitation: EventInvitationDetail) => void
  onDecline: (invitation: EventInvitationDetail) => void
}) {
  if (loading) {
    return (
      <div className="sv-panel" style={{ marginTop: 16 }}>
        <div className="sv-panel__head">
          <span className="sv-panel__title">Event invitations</span>
          <span className="sv-page-header__sub">Loading...</span>
        </div>
        <EventSkeletonGrid columns={2} cards={3} />
      </div>
    )
  }

  if (error) {
    return (
      <EventErrorState
        title="Unable to load event invitations"
        error={error}
        onRetry={onRetry}
      />
    )
  }

  return (
    <div className="sv-panel" style={{ marginTop: 16 }}>
      <div className="sv-panel__head">
        <span className="sv-panel__title">Event invitations</span>
        <span className="sv-page-header__sub">{invitations.length} total</span>
      </div>

      {invitations.length === 0 ? (
        <EventEmptyState
          icon="mail"
          title="No invitations sent."
          subtitle="Invites to events will appear here automatically."
        />
      ) : (
        <div className="sv-invite-list">
          {invitations.map((invitation) => (
            <EventInvitationCard
              key={invitation.id}
              invitation={invitation}
              working={workingId === invitation.id}
              onAccept={onAccept}
              onDecline={onDecline}
            />
          ))}
        </div>
      )}
    </div>
  )
}
