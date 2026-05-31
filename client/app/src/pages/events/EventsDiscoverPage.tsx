import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { fetchPublicBootstrap } from '../../lib/api'
import { fetchPublicEvents, registerForPublicEvent } from '../../lib/api/events'
import { EventDiscoveryCard } from '../../components/events/EventDiscoveryCard'
import { EventEmptyState, EventErrorState, EventSkeletonGrid } from '../../components/events/EventStates'
import { isOnlineEventLocation } from '../../components/events/eventUtils'
import type { EventModel, PlatformBootstrap } from '../../types'
import '../../styles/Dashboard.css'
import '../../styles/LandingPage.css'
import '../../styles/SitePages.css'

type DiscoveryFilter = 'all' | 'week' | 'month' | 'online' | 'in_person'

const FILTERS: Array<{ value: DiscoveryFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'online', label: 'Online' },
  { value: 'in_person', label: 'In-person' },
]

function isWithinDays(value: string, maxDays: number) {
  const start = new Date(value).getTime()
  const now = Date.now()
  return start >= now && start <= now + maxDays * 24 * 60 * 60 * 1000
}

export function EventsDiscoverPage({ token }: { token: string | null }) {
  const navigate = useNavigate()
  const [bootstrap, setBootstrap] = useState<PlatformBootstrap | null>(null)
  const [events, setEvents] = useState<EventModel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<DiscoveryFilter>('all')
  const [registeringId, setRegisteringId] = useState<string | null>(null)
  const [registeredIds, setRegisteredIds] = useState<Set<string>>(new Set())

  const loadEvents = async () => {
    setLoading(true)
    setError(null)

    try {
      const [nextBootstrap, nextEvents] = await Promise.all([fetchPublicBootstrap(), fetchPublicEvents()])
      setBootstrap(nextBootstrap)
      setEvents(nextEvents.results)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load public events.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadEvents()
  }, [])

  const filteredEvents = useMemo(() => {
    const query = search.trim().toLowerCase()
    return events.filter((event) => {
      const matchesQuery =
        !query ||
        event.title.toLowerCase().includes(query) ||
        event.organization.name.toLowerCase().includes(query)

      const matchesFilter =
        filter === 'all'
          ? true
          : filter === 'week'
            ? isWithinDays(event.start_datetime, 7)
            : filter === 'month'
              ? isWithinDays(event.start_datetime, 31)
              : filter === 'online'
                ? isOnlineEventLocation(event.location)
                : !isOnlineEventLocation(event.location)

      return matchesQuery && matchesFilter
    })
  }, [events, filter, search])

  const handleRegister = async (eventId: string) => {
    if (!token) {
      navigate(`/register?return_to=${encodeURIComponent('/events/discover')}`)
      return
    }

    setRegisteringId(eventId)
    setError(null)

    try {
      await registerForPublicEvent(token, eventId)
      setRegisteredIds((current) => new Set(current).add(eventId))
    } catch (registerError) {
      setError(registerError instanceof Error ? registerError.message : 'Unable to register for event.')
    } finally {
      setRegisteringId(null)
    }
  }

  const platformName = bootstrap?.platform_name ?? 'SkillVerse'

  return (
    <div className="sv-public-shell">
      <header className="sv-nav">
        <Link to="/" className="sv-nav__logo">
          <div className="sv-nav__mark" aria-hidden>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1L13 4.5V9.5L7 13L1 9.5V4.5L7 1Z" fill="hsl(0,0%,8%)" />
            </svg>
          </div>
          {platformName}
        </Link>
        <div className="sv-nav__actions">
          {token ? (
            <Link className="btn btn--ghost" to="/dashboard">
              Open dashboard
            </Link>
          ) : (
            <>
              <Link className="btn btn--ghost" to="/login?return_to=%2Fevents%2Fdiscover">
                Sign in
              </Link>
              <Link className="btn btn--solid" to="/register?return_to=%2Fevents%2Fdiscover">
                Get started
              </Link>
            </>
          )}
        </div>
      </header>

      <main className="sv-public-main">
        <div className="sv-page-header" style={{ maxWidth: 1200, margin: '0 auto 18px' }}>
          <p className="sv-section__eyebrow">Public events</p>
          <h1 className="sv-page-header__title">Upcoming Events</h1>
          <p className="sv-page-header__sub">Discover public events from organizations on SkillVerse.</p>
        </div>

        <div className="sv-panel" style={{ maxWidth: 1200, margin: '0 auto 16px' }}>
          <div className="sv-dashboard-form">
            <label className="sv-field">
              <span>Search events by name or organization...</span>
              <div className="sv-field__input-wrap">
                <input
                  className="sv-input"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search events by name or organization..."
                />
              </div>
            </label>
          </div>

          <div className="sv-workspace-nav" style={{ marginTop: 14 }}>
            {FILTERS.map((item) => (
              <button
                key={item.value}
                type="button"
                className={`sv-workspace-nav__item${filter === item.value ? ' sv-workspace-nav__item--active' : ''}`}
                onClick={() => setFilter(item.value)}
              >
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {error && <EventErrorState title="Unable to load events" error={error} onRetry={() => void loadEvents()} />}

        {loading ? (
          <EventSkeletonGrid columns={3} cards={6} />
        ) : filteredEvents.length === 0 ? (
          <EventEmptyState
            icon="calendar"
            title="No public events found."
            subtitle="Try a different search term or filter."
          />
        ) : (
          <div className="sv-grid-3" style={{ maxWidth: 1200, margin: '0 auto' }}>
            {filteredEvents.map((event) => (
              <EventDiscoveryCard
                key={event.id}
                event={event}
                registered={registeredIds.has(event.id)}
                registerLoading={registeringId === event.id}
                onRegister={handleRegister}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
