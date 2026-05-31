import { Avatar, Icon } from '../DashboardLayout'
import type { EventModel } from '../../types'
import { formatEventDateRange, isOnlineEventLocation } from './eventUtils'
import { useEventPermissions } from './useEventPermissions'

export function EventDiscoveryCard({
  event,
  registered,
  registerLoading,
  onRegister,
}: {
  event: EventModel
  registered: boolean
  registerLoading: boolean
  onRegister: (eventId: string) => void
}) {
  const locationLabel = isOnlineEventLocation(event.location) ? 'Online' : event.location
  const permissions = useEventPermissions(event, null)

  return (
    <article className="sv-course-card">
      <div className="sv-course-card__media">
        {event.cover_image ? (
          <img src={event.cover_image} alt={event.title} className="sv-course-card__image" />
        ) : (
          <div className="sv-course-card__placeholder" aria-hidden>
            <Icon.Calendar />
          </div>
        )}
      </div>
      <div className="sv-course-card__body">
        <div className="sv-course-card__header">
          <div>
            <div className="sv-course-card__title">{event.title}</div>
            <div className="sv-course-card__meta">
              <Avatar name={event.organization.name} size="sm" />
              <span>{event.organization.name}</span>
            </div>
            <div className="sv-course-card__meta">
              <span className="sv-status sv-status--public">Public</span>
              <span>{formatEventDateRange(event.start_datetime, event.end_datetime)}</span>
            </div>
            <div className="sv-course-card__meta">
              <span>{locationLabel}</span>
            </div>
          </div>
        </div>
        <p className="sv-course-card__description">
          {event.description || 'No description added yet.'}
        </p>
        <div className="sv-course-card__actions">
          {permissions.canRegisterPublicEvent ? (
            <button
              type="button"
              className="btn btn--blue btn--sm"
              onClick={() => onRegister(event.id)}
              disabled={registered || registerLoading}
            >
              {registered ? 'Registered' : registerLoading ? 'Registering...' : 'Register'}
            </button>
          ) : (
            <span className="sv-inline-note">Registration not open yet.</span>
          )}
        </div>
      </div>
    </article>
  )
}
