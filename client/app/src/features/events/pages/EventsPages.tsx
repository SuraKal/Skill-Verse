import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import {
  approveEvent,
  createEvent,
  createEventCoOrganizerInvite,
  createEventParticipantInvite,
  deleteEventCoOrganizer,
  deleteEventParticipant,
  fetchEvent,
  fetchEventCoOrganizers,
  fetchEventParticipants,
  fetchOrganizationEvents,
  fetchPublicEvents,
  rejectEvent,
  updateEvent,
  updateEventParticipantRole,
} from '../../../lib/api/events'
import { fetchDashboard } from '../../../lib/api'
import { Avatar, Icon } from '../../../components/DashboardLayout'
import { EventBadge } from '../../../components/events/EventBadge'
import { EventEmptyState, EventErrorState, EventSkeletonGrid, EventTableSkeleton } from '../../../components/events/EventStates'
import { useEventPermissions } from '../../../components/events/useEventPermissions'
import type {
  DashboardData,
  EventCoOrganizerRecord,
  EventModel,
  EventParticipantRecord,
  EventRole,
  EventVisibility,
  OrganizationOption,
} from '../../../types'
import '../../../styles/Dashboard.css'
import '../../../styles/SitePages.css'

type EventWorkspaceTab = 'all' | 'mine' | 'co-organizing' | 'attending'
type EventManagementTab = 'details' | 'participants' | 'co-organizers' | 'invitations'

type ManagedOrganization = OrganizationOption & {
  role: 'creator' | 'manager'
}

type EventWorkspaceCard = EventModel & {
  role_label: string | null
  is_mine: boolean
  is_co_organizing: boolean
  is_attending: boolean
  participant_count: number
  co_organizer_count: number
  pending_invite_count: number
}

type EventFormState = {
  organizationId: string
  title: string
  description: string
  cover_image: string
  location: string
  start_datetime: string
  end_datetime: string
  timezone: string
  visibility: EventVisibility
}

type EventDetailFormState = EventFormState

const VISIBILITY_OPTIONS: Array<{ value: EventVisibility; label: string; icon: ReactNode }> = [
  { value: 'private', label: 'Private', icon: <Icon.Lock /> },
  { value: 'org_private', label: 'Org Private', icon: <Icon.Building /> },
  { value: 'public', label: 'Public', icon: <Icon.Globe /> },
]

function capitalizeWords(value: string) {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function formatDateRange(startValue: string, endValue: string) {
  const start = new Date(startValue)
  const end = new Date(endValue)
  const startDate = start.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const endDate = end.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  if (startDate === endDate) {
    return `${startDate} · ${start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })} - ${end.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
  }

  return `${startDate} - ${endDate}`
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatInputDateTime(value: string) {
  if (!value) return ''
  const date = new Date(value)
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60 * 1000)
  return local.toISOString().slice(0, 16)
}

function parseInputDateTime(value: string) {
  return new Date(value).toISOString()
}

function getVisibilityLabel(value: EventVisibility) {
  return capitalizeWords(value)
}

function getRoleLabel(value: EventRole) {
  return capitalizeWords(value)
}

function getRoleClass(value: string) {
  return value.toLowerCase().replace(/[\s-]+/g, '_')
}

function getManagedOrganizations(dashboard: DashboardData | null): ManagedOrganization[] {
  if (!dashboard) {
    return []
  }

  return dashboard.organizations
    .map((organization) => {
      const membership = dashboard.memberships.find(
        (item) => item.organization_id === organization.id,
      )
      if (!membership || (membership.role !== 'creator' && membership.role !== 'manager')) {
        return null
      }

      return {
        id: organization.id,
        name: organization.name,
        role: membership.role as 'creator' | 'manager',
      }
    })
    .filter((organization): organization is ManagedOrganization => organization !== null)
}

function getManagedOrganizationIds(dashboard: DashboardData | null) {
  return new Set(getManagedOrganizations(dashboard).map((organization) => organization.id))
}

function getUserParticipantRecord(
  participants: EventParticipantRecord[],
  dashboard: DashboardData | null,
) {
  if (!dashboard) return null
  return participants.find(
    (participant) =>
      participant.user?.id === dashboard.user.id ||
      participant.email.toLowerCase() === dashboard.user.email.toLowerCase(),
  ) ?? null
}

function getUserCoOrganizerRecord(
  coOrganizers: EventCoOrganizerRecord[],
  dashboard: DashboardData | null,
) {
  if (!dashboard) return null

  const managedOrganizationIds = getManagedOrganizationIds(dashboard)
  return (
    coOrganizers.find(
      (coOrganizer) =>
        coOrganizer.status === 'accepted' &&
        coOrganizer.organization_id != null &&
        managedOrganizationIds.has(coOrganizer.organization_id),
    ) ?? null
  )
}

function deriveCardRoleLabel(
  event: EventModel,
  dashboard: DashboardData | null,
  participant: EventParticipantRecord | null,
  coOrganizer: EventCoOrganizerRecord | null,
) {
  if (!dashboard) return null
  if (event.created_by.id === dashboard.user.id) return 'Initiator'
  if (participant?.invite_status === 'accepted') return getRoleLabel(participant.event_role)
  if (coOrganizer?.status === 'accepted') return 'Co-organizer'
  return null
}

function deriveVisibilityLabel(value: EventVisibility) {
  return value === 'org_private' ? 'Org Private' : capitalizeWords(value)
}

function buildEmptyForm(defaultManagedOrganizationId = ''): EventFormState {
  return {
    organizationId: defaultManagedOrganizationId,
    title: '',
    description: '',
    cover_image: '',
    location: '',
    start_datetime: '',
    end_datetime: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    visibility: 'public',
  }
}

function getCreateEventValidationMessage(form: EventFormState) {
  const title = form.title.trim()
  const description = form.description.trim()
  const location = form.location.trim()
  const timezone = form.timezone.trim()

  if (!form.organizationId) return 'Select an organization to host the event.'
  if (!title) return 'Title is required.'
  if (!location) return 'Location is required.'
  if (!form.start_datetime) return 'Start date and time are required.'
  if (!form.end_datetime) return 'End date and time are required.'
  if (!description) return 'Description is required.'
  if (!timezone) return 'Timezone is required.'

  const start = new Date(form.start_datetime)
  const end = new Date(form.end_datetime)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 'Please enter valid start and end date and time values.'
  }
  if (end <= start) {
    return 'End date and time must be after the start date and time.'
  }

  return null
}

function getInviteEmailValidationMessage(email: string) {
  const value = email.trim()
  if (!value) return 'Email is required.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return 'Enter a valid email address.'
  }
  return null
}

function EventStatCard({
  label,
  value,
  note,
  icon,
}: {
  label: string
  value: string | number | ReactNode
  note: string
  icon: ReactNode
}) {
  return (
    <div className="sv-metric">
      <div className="sv-metric__header">
        <span className="sv-metric__label">{label}</span>
        <span className="sv-metric__icon" aria-hidden>{icon}</span>
      </div>
      <div className="sv-metric__value">{value}</div>
      <div className="sv-metric__note">{note}</div>
    </div>
  )
}

function EventFormSegmentedVisibility({
  value,
  onChange,
  disabled,
}: {
  value: EventVisibility
  onChange: (value: EventVisibility) => void
  disabled?: boolean
}) {
  return (
    <div className="sv-workspace-nav sv-event-visibility-nav" role="group" aria-label="Event visibility">
      {VISIBILITY_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`sv-workspace-nav__item sv-event-visibility-nav__item${value === option.value ? ' sv-workspace-nav__item--active' : ''}`}
          onClick={() => onChange(option.value)}
          disabled={disabled}
        >
          <span className="sv-event-visibility-nav__icon" aria-hidden>{option.icon}</span>
          <span>{option.label}</span>
        </button>
      ))}
    </div>
  )
}

function EventCatalogCard({
  event,
  onOpen,
}: {
  event: EventWorkspaceCard
  onOpen: (eventId: string) => void
}) {
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
              {event.organization.name} · {deriveVisibilityLabel(event.visibility)}
            </div>
            <div className="sv-course-card__meta">
              <EventBadge type="status" value={event.status} />
              {event.role_label && (
                <span className={`sv-role-badge sv-role-badge--${getRoleClass(event.role_label)}`}>
                  {event.role_label}
                </span>
              )}
            </div>
          </div>
          <div className="sv-course-card__actions">
            <button className="btn btn--ghost btn--sm" type="button" onClick={() => onOpen(event.id)}>
              Details
            </button>
          </div>
        </div>
        <p className="sv-course-card__description">
          {event.description || 'No description added yet.'}
        </p>
        <div className="sv-event-card__meta">
          <span className="sv-mini-pill">{formatDateRange(event.start_datetime, event.end_datetime)}</span>
          <span className="sv-mini-pill">{event.participant_count} participants</span>
          <span className="sv-mini-pill">{event.co_organizer_count} co-organizers</span>
        </div>
      </div>
    </article>
  )
}

function EventTabs({
  activeTab,
  onChange,
  permissions,
}: {
  activeTab: EventManagementTab
  onChange: (tab: EventManagementTab) => void
  permissions: ReturnType<typeof useEventPermissions>
}) {
  return (
    <div className="sv-panel" style={{ marginBottom: 12 }}>
      <div className="sv-workspace-nav">
        <button
          type="button"
          className={`sv-workspace-nav__item${activeTab === 'details' ? ' sv-workspace-nav__item--active' : ''}`}
          onClick={() => onChange('details')}
        >
          <span>Details</span>
        </button>
        {permissions.canViewParticipantsTab && (
          <button
            type="button"
            className={`sv-workspace-nav__item${activeTab === 'participants' ? ' sv-workspace-nav__item--active' : ''}`}
            onClick={() => onChange('participants')}
          >
            <span>Participants</span>
          </button>
        )}
        {permissions.canViewCoOrganizersTab && (
          <button
            type="button"
            className={`sv-workspace-nav__item${activeTab === 'co-organizers' ? ' sv-workspace-nav__item--active' : ''}`}
            onClick={() => onChange('co-organizers')}
          >
            <span>Co-organizers</span>
          </button>
        )}
        {permissions.canViewInvitationsTab && (
          <button
            type="button"
            className={`sv-workspace-nav__item${activeTab === 'invitations' ? ' sv-workspace-nav__item--active' : ''}`}
            onClick={() => onChange('invitations')}
          >
            <span>Invitations</span>
          </button>
        )}
      </div>
    </div>
  )
}

function EventApprovalBanner({
  event,
  permissions,
  onApprove,
  onReject,
  rejectionNote,
  setRejectionNote,
  rejectionError,
  setRejectionError,
  showRejectInput,
  setShowRejectInput,
  saving,
}: {
  event: EventModel
  permissions: ReturnType<typeof useEventPermissions>
  onApprove: () => void
  onReject: () => void
  rejectionNote: string
  setRejectionNote: (value: string) => void
  rejectionError: string | null
  setRejectionError: (value: string | null) => void
  showRejectInput: boolean
  setShowRejectInput: (value: boolean) => void
  saving: boolean
}) {
  if (permissions.showCreatorApprovalBanner) {
    return (
      <div className="sv-banner sv-banner--warning">
        <div>
          <strong>This event is awaiting your approval.</strong>
          <p>Review the details, then approve or reject it from here.</p>
        </div>
        <div className="sv-banner__actions">
          <button className="btn btn--blue btn--sm" type="button" onClick={onApprove} disabled={saving}>
            Approve
          </button>
          <button
            className="btn btn--ghost btn--sm"
            type="button"
            onClick={() => {
              setRejectionError(null)
              setShowRejectInput(!showRejectInput)
            }}
            disabled={saving}
          >
            Reject
          </button>
        </div>
        {showRejectInput && (
          <div className="sv-banner__inline-form">
            <textarea
              className="sv-textarea"
              rows={3}
              value={rejectionNote}
              onChange={(event) => {
                setRejectionError(null)
                setRejectionNote(event.target.value)
              }}
              placeholder="Explain why the event was rejected."
            />
            <div className="sv-form-actions" style={{ marginTop: 10 }}>
              <button className="btn btn--blue btn--sm" type="button" onClick={onReject} disabled={saving}>
                {saving ? 'Rejecting...' : 'Confirm rejection'}
              </button>
            </div>
            {rejectionError && (
              <p className="sv-inline-error" role="alert" style={{ marginTop: 8 }}>
                {rejectionError}
              </p>
            )}
          </div>
        )}
      </div>
    )
  }

  if (permissions.showManagerPendingBanner) {
    return (
      <div className="sv-banner sv-banner--info">
        <div>
          <strong>This event is pending Creator approval.</strong>
          <p>You can keep editing it below while it waits for review.</p>
        </div>
      </div>
    )
  }

  if (permissions.showManagerRejectedBanner) {
    return (
      <div className="sv-banner sv-banner--danger">
        <div>
          <strong>This event was rejected.</strong>
          <p>{event.rejection_note || 'No rejection note was provided.'}</p>
        </div>
      </div>
    )
  }

  return null
}

function EventDetailsPanel({
  event,
  permissions,
  onSave,
}: {
  event: EventModel
  permissions: ReturnType<typeof useEventPermissions>
  onSave: (payload: EventFormState) => Promise<void>
}) {
  const [form, setForm] = useState<EventDetailFormState>(() => ({
    organizationId: event.organization.id,
    title: event.title,
    description: event.description,
    cover_image: event.cover_image ?? '',
    location: event.location,
    start_datetime: formatInputDateTime(event.start_datetime),
    end_datetime: formatInputDateTime(event.end_datetime),
    timezone: event.timezone,
    visibility: event.visibility,
  }))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setForm({
      organizationId: event.organization.id,
      title: event.title,
      description: event.description,
      cover_image: event.cover_image ?? '',
      location: event.location,
      start_datetime: formatInputDateTime(event.start_datetime),
      end_datetime: formatInputDateTime(event.end_datetime),
      timezone: event.timezone,
      visibility: event.visibility,
    })
  }, [event])

  const canEdit = permissions.canEditEventDetails
  const visibilityLocked = event.status === 'active' || event.status === 'ongoing'
  const showSaveButton = event.status !== 'archived' && event.status !== 'completed'

  const handleSave = async () => {
    const validationMessage = getCreateEventValidationMessage(form)
    if (validationMessage) {
      setError(validationMessage)
      return
    }

    setSaving(true)
    setError(null)
    try {
      await onSave({
        ...form,
        start_datetime: parseInputDateTime(form.start_datetime),
        end_datetime: parseInputDateTime(form.end_datetime),
      })
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save event.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="sv-grid-2">
      <div className="sv-panel">
        <div className="sv-panel__head">
          <span className="sv-panel__title">Edit event</span>
          <EventBadge type="status" value={event.status} />
        </div>

        <div className="sv-dashboard-form">
          <label className="sv-field">
            <span>Title</span>
            <input
              className="sv-input"
              value={form.title}
              onChange={(eventInput) => setForm((current) => ({ ...current, title: eventInput.target.value }))}
              disabled={!canEdit}
              placeholder="Annual Developer Summit"
            />
          </label>

          <label className="sv-field">
            <span>Location</span>
            <input
              className="sv-input"
              value={form.location}
              onChange={(eventInput) => setForm((current) => ({ ...current, location: eventInput.target.value }))}
              disabled={!canEdit}
              placeholder="Kenya Conference Center"
            />
          </label>

          <label className="sv-field">
            <span>Start date & time</span>
            <input
              className="sv-input"
              type="datetime-local"
              value={form.start_datetime}
              onChange={(eventInput) => setForm((current) => ({ ...current, start_datetime: eventInput.target.value }))}
              disabled={!canEdit}
            />
          </label>

          <label className="sv-field">
            <span>End date & time</span>
            <input
              className="sv-input"
              type="datetime-local"
              value={form.end_datetime}
              onChange={(eventInput) => setForm((current) => ({ ...current, end_datetime: eventInput.target.value }))}
              disabled={!canEdit}
            />
          </label>

          <label className="sv-field">
            <span>Timezone</span>
            <input
              className="sv-input"
              value={form.timezone}
              onChange={(eventInput) => setForm((current) => ({ ...current, timezone: eventInput.target.value }))}
              disabled={!canEdit}
              placeholder="Africa/Nairobi"
            />
          </label>

          <label className="sv-field">
            <span>Description</span>
            <textarea
              className="sv-textarea"
              rows={5}
              value={form.description}
              onChange={(eventInput) => setForm((current) => ({ ...current, description: eventInput.target.value }))}
              disabled={!canEdit}
              placeholder="Brief summary of what attendees can expect."
            />
          </label>

          <label className="sv-field">
            <span>Cover image URL</span>
            <input
              className="sv-input"
              value={form.cover_image}
              onChange={(eventInput) => setForm((current) => ({ ...current, cover_image: eventInput.target.value }))}
              disabled={!canEdit}
              placeholder="https://example.com/event-cover.jpg"
            />
          </label>

          <label className="sv-field">
            <span>Visibility</span>
            <EventFormSegmentedVisibility
              value={form.visibility}
              onChange={(value) => setForm((current) => ({ ...current, visibility: value }))}
              disabled={!canEdit || visibilityLocked}
            />
            {visibilityLocked && (
              <span className="sv-inline-note">Visibility cannot be changed after the event is active.</span>
            )}
          </label>

          {showSaveButton && (
            <div className="sv-form-actions">
              <button className="btn btn--blue btn--sm" type="button" onClick={handleSave} disabled={saving || !canEdit}>
                {saving ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          )}

          {error && (
            <p className="sv-inline-error" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>

      <div className="sv-panel">
        <div className="sv-panel__head">
          <span className="sv-panel__title">Event summary</span>
        </div>
        <div className="sv-course-detail-hero">
          <div className="sv-course-detail-hero__media">
            {event.cover_image ? (
              <img src={event.cover_image} alt={event.title} className="sv-course-card__image" />
            ) : (
              <div className="sv-course-card__placeholder" aria-hidden>
                <Icon.Calendar />
              </div>
            )}
          </div>
          <div className="sv-course-detail-hero__body">
            <div className="sv-course-detail-hero__title">{event.title}</div>
            <div className="sv-tag-group" style={{ marginTop: 10 }}>
              <span className="sv-tag">{event.organization.name}</span>
              <span className="sv-tag">{formatDateRange(event.start_datetime, event.end_datetime)}</span>
              <span className="sv-tag">{event.location}</span>
            </div>
            <div className="sv-tag-group" style={{ marginTop: 10 }}>
              <EventBadge type="status" value={event.status} />
              <span className="sv-mini-pill">{getVisibilityLabel(event.visibility)}</span>
            </div>
            <p className="sv-course-card__description">{event.description || 'No description added yet.'}</p>
          </div>
        </div>
        <div className="sv-divider" />
        <div className="sv-analytics-stack">
          <div className="sv-analytics-row">
            <div>
              <strong>Host organization</strong>
              <p>{event.organization.name}</p>
            </div>
            <Avatar name={event.organization.name} size="sm" />
          </div>
          <div className="sv-analytics-row">
            <div>
              <strong>Created by</strong>
              <p>{event.created_by.full_name || event.created_by.username}</p>
            </div>
            <Avatar name={event.created_by.full_name || event.created_by.username} size="sm" />
          </div>
          <div className="sv-analytics-row">
            <div>
              <strong>Timezone</strong>
              <p>{event.timezone}</p>
            </div>
            <Icon.Calendar />
          </div>
        </div>
      </div>
    </div>
  )
}

function ParticipantsTab({
  event,
  participants,
  permissions,
  loading = false,
  onInvite,
  onRemove,
  onRoleChange,
}: {
  event: EventModel
  participants: EventParticipantRecord[]
  permissions: ReturnType<typeof useEventPermissions>
  loading?: boolean
  onInvite: (payload: { email: string; event_role: EventRole }) => Promise<void>
  onRemove: (participantId: string) => Promise<void>
  onRoleChange: (participantId: string, role: EventRole) => Promise<void>
}) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<EventRole>('attendee')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingRoleChanges, setPendingRoleChanges] = useState<Record<string, EventRole>>({})
  const [actionError, setActionError] = useState<string | null>(null)
  const canInvite = permissions.canInviteParticipants
  const canManageRows = permissions.canManageParticipantRows

  const invitedParticipants = participants.filter((participant) => participant.invite_origin === 'invited')
  const selfRegisteredParticipants = participants.filter(
    (participant) => participant.invite_origin === 'self_registered',
  )

  if (loading) {
    return <EventTableSkeleton rows={5} columns={6} />
  }

  const handleInvite = async () => {
    const validationMessage = getInviteEmailValidationMessage(email)
    if (validationMessage) {
      setError(validationMessage)
      return
    }

    setSaving(true)
    setError(null)
    try {
      await onInvite({ email: email.trim(), event_role: role })
      setEmail('')
      setRole('attendee')
    } catch (inviteError) {
      setError(inviteError instanceof Error ? inviteError.message : 'Failed to send invite.')
    } finally {
      setSaving(false)
    }
  }

  const rowAction = (participant: EventParticipantRecord) => {
    if (!canManageRows) return null
    const isInitiatorRow = participant.event_role === 'initiator'
    return (
      <div className="sv-participant-actions">
        <select
          className="sv-select"
          value={pendingRoleChanges[participant.id] ?? participant.event_role}
          disabled={isInitiatorRow}
          onChange={(eventInput) =>
            setPendingRoleChanges((current) => ({
              ...current,
              [participant.id]: eventInput.target.value as EventRole,
            }))
          }
        >
          <option value="initiator" disabled title="Initiator role is permanent">
            Initiator
          </option>
          {(['admin', 'attendee', 'speaker', 'volunteer', 'guest'] as EventRole[]).map((nextRole) => (
            <option key={nextRole} value={nextRole}>
              {getRoleLabel(nextRole)}
            </option>
          ))}
        </select>
        <button
          className="btn btn--blue btn--sm"
          type="button"
          disabled={isInitiatorRow}
          onClick={() => {
            void (async () => {
              try {
                setActionError(null)
                await onRoleChange(participant.id, pendingRoleChanges[participant.id] ?? participant.event_role)
              } catch (roleError) {
                setActionError(roleError instanceof Error ? roleError.message : 'Failed to change role.')
              }
            })()
          }}
        >
          Change role
        </button>
        {!isInitiatorRow ? (
          <button
            className="btn btn--ghost btn--sm"
            type="button"
            onClick={() => {
              void (async () => {
                try {
                  setActionError(null)
                  await onRemove(participant.id)
                } catch (removeError) {
                  setActionError(removeError instanceof Error ? removeError.message : 'Failed to remove participant.')
                }
              })()
            }}
          >
            Remove
          </button>
        ) : (
          <span className="sv-inline-note">Initiator role is permanent.</span>
        )}
      </div>
    )
  }

  const renderTable = (rows: EventParticipantRecord[]) => (
    <div className="sv-table-wrap">
      <table className="sv-table" aria-label="Event participants">
        <thead>
          <tr>
            <th>User</th>
            <th>Role</th>
            <th>Status</th>
            <th>Origin</th>
            <th>Joined / Invited</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((participant) => (
            <tr key={participant.id}>
              <td>
                <div className="sv-table__user">
                  <Avatar
                    name={participant.user?.full_name || participant.user?.username || participant.email}
                    size="sm"
                  />
                  <div>
                    <div className="sv-table__user-name">
                      {participant.user
                        ? participant.user.full_name || participant.user.username
                        : 'Invited, not yet registered'}
                    </div>
                    <div className="sv-table__user-email">
                      {participant.user?.email ?? participant.email}
                    </div>
                  </div>
                </div>
              </td>
              <td>
                <EventBadge type="role" value={participant.event_role} />
              </td>
              <td>
                <EventBadge type="status" value={participant.invite_status} />
              </td>
              <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                {participant.invite_origin === 'self_registered' ? 'Self-registered' : 'Invited'}
              </td>
              <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                {participant.invite_status === 'pending'
                  ? formatDateTime(participant.invited_at)
                  : participant.responded_at
                    ? formatDateTime(participant.responded_at)
                    : '—'}
              </td>
              <td>{rowAction(participant)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  return (
    <div className="sv-grid-2">
      <div className="sv-panel">
        <div className="sv-panel__head">
          <div>
            <span className="sv-panel__title">Invite participant</span>
            <div className="sv-panel__sub">Speaker, Volunteer, and Guest are always invitation-only.</div>
          </div>
        </div>
        <div className="sv-dashboard-form">
          <label className="sv-field">
            <span>Email</span>
            <input
              className="sv-input"
              type="email"
              value={email}
              onChange={(eventInput) => setEmail(eventInput.target.value)}
              disabled={!canInvite}
              placeholder="person@example.com"
            />
          </label>
          <label className="sv-field">
            <span>Role</span>
            <select
              className="sv-select"
              value={role}
              onChange={(eventInput) => setRole(eventInput.target.value as EventRole)}
              disabled={!canInvite}
            >
              <option value="attendee">Attendee</option>
              <option value="speaker">Speaker / Presenter</option>
              <option value="volunteer">Volunteer</option>
              <option value="guest">Guest</option>
            </select>
            <span className="sv-inline-note">Speaker, Volunteer, and Guest are always invitation-only.</span>
          </label>
          <div className="sv-form-actions">
            <button className="btn btn--blue btn--sm" type="button" onClick={handleInvite} disabled={!canInvite || saving || !email.trim()}>
              {saving ? 'Sending...' : 'Send invite'}
            </button>
          </div>
          {!canInvite && <p className="sv-inline-note">You do not have participant invite rights for this event.</p>}
          {error && (
            <p className="sv-inline-error" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>

      <div className="sv-panel">
        <div className="sv-panel__head">
          <span className="sv-panel__title">Participants</span>
          <span className="sv-page-header__sub">{participants.filter((participant) => participant.invite_status === 'accepted').length} confirmed</span>
        </div>
        {actionError && (
          <p className="sv-inline-error" role="alert">
            {actionError}
          </p>
        )}
        {invitedParticipants.length === 0 && selfRegisteredParticipants.length === 0 ? (
          <div className="sv-empty" style={{ padding: '28px 0' }}>
            <div className="sv-empty__icon" aria-hidden>
              <Icon.Users />
            </div>
            <div className="sv-empty__title">No participants yet</div>
            <div className="sv-empty__sub">Send your first invite to start building the attendee list.</div>
          </div>
        ) : (
          <>
            {invitedParticipants.length > 0 && renderTable(invitedParticipants)}
            {event.visibility === 'public' && selfRegisteredParticipants.length > 0 && (
              <>
                <div className="sv-panel__head" style={{ marginTop: 18 }}>
                  <span className="sv-panel__title">Self-registered attendees</span>
                </div>
                {renderTable(selfRegisteredParticipants)}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function CoOrganizersTab({
  dashboard,
  coOrganizers,
  permissions,
  loading = false,
  onInvite,
  onRemove,
}: {
  dashboard: DashboardData | null
  coOrganizers: EventCoOrganizerRecord[]
  permissions: ReturnType<typeof useEventPermissions>
  loading?: boolean
  onInvite: (payload: { contact_email: string; organization_id?: string | null }) => Promise<void>
  onRemove: (coOrganizerId: string) => Promise<void>
}) {
  const [email, setEmail] = useState('')
  const [organizationId, setOrganizationId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const managedOrganizations = useMemo(() => getManagedOrganizations(dashboard), [dashboard])
  const canInvite = permissions.canInviteCoOrganizers
  const canRemove = permissions.canManageCoOrganizers

  useEffect(() => {
    if (!organizationId && managedOrganizations.length > 0) {
      setOrganizationId(managedOrganizations[0].id)
    }
  }, [managedOrganizations, organizationId])

  if (loading) {
    return <EventTableSkeleton rows={4} columns={4} />
  }

  const handleInvite = async () => {
    const validationMessage = getInviteEmailValidationMessage(email)
    if (validationMessage) {
      setError(validationMessage)
      return
    }

    setSaving(true)
    setError(null)
    try {
      await onInvite({ contact_email: email.trim(), organization_id: organizationId || null })
      setEmail('')
    } catch (inviteError) {
      setError(inviteError instanceof Error ? inviteError.message : 'Failed to send co-organizer invite.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="sv-grid-2">
      <div className="sv-panel">
        <div className="sv-panel__head">
          <div>
            <span className="sv-panel__title">Invite co-organizer</span>
            <div className="sv-panel__sub">
              Invite another organization to help organize this event. Their managers and creators can invite attendees.
            </div>
          </div>
        </div>
        <div className="sv-dashboard-form">
          <label className="sv-field">
            <span>Contact email</span>
            <input
              className="sv-input"
              type="email"
              value={email}
              onChange={(eventInput) => setEmail(eventInput.target.value)}
              disabled={!canInvite}
              placeholder="manager@otherorg.com"
            />
          </label>

          <label className="sv-field">
            <span>Organization name (optional)</span>
            <select
              className="sv-select"
              value={organizationId}
              onChange={(eventInput) => setOrganizationId(eventInput.target.value)}
              disabled={!canInvite || managedOrganizations.length === 0}
            >
              <option value="">If known</option>
              {managedOrganizations.map((organization) => (
                <option key={organization.id} value={organization.id}>
                  {organization.name}
                </option>
              ))}
            </select>
          </label>

          <div className="sv-form-actions">
            <button className="btn btn--blue btn--sm" type="button" onClick={handleInvite} disabled={!canInvite || saving || !email.trim()}>
              {saving ? 'Sending...' : 'Send co-organizer invite'}
            </button>
          </div>
          {!canInvite && <p className="sv-inline-note">Co-organizer invites are not available for this event.</p>}
          {error && (
            <p className="sv-inline-error" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>

      <div className="sv-panel">
        <div className="sv-panel__head">
          <span className="sv-panel__title">Co-organizers</span>
          <span className="sv-page-header__sub">{coOrganizers.length} organizations</span>
        </div>
        {actionError && (
          <p className="sv-inline-error" role="alert">
            {actionError}
          </p>
        )}
        {coOrganizers.length === 0 ? (
          <div className="sv-empty" style={{ padding: '28px 0' }}>
            <div className="sv-empty__icon" aria-hidden>
              <Icon.Building />
            </div>
            <div className="sv-empty__title">No co-organizers yet</div>
            <div className="sv-empty__sub">Invite another organization to collaborate on this event.</div>
          </div>
        ) : (
          <div className="sv-table-wrap">
            <table className="sv-table" aria-label="Event co-organizers">
              <thead>
                <tr>
                  <th>Organization</th>
                  <th>Status</th>
                  <th>Invited</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {coOrganizers.map((coOrganizer) => (
                  <tr key={coOrganizer.id}>
                    <td>
                      <div className="sv-table__user">
                        <Avatar name={coOrganizer.organization_name || coOrganizer.invite_email} size="sm" />
                        <div>
                          <div className="sv-table__user-name">{coOrganizer.organization_name || 'Unlinked organization'}</div>
                          <div className="sv-table__user-email">{coOrganizer.invite_email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <EventBadge type="status" value={coOrganizer.status} />
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                      {formatDateTime(coOrganizer.invited_at)}
                    </td>
                      <td>
                        {canRemove ? (
                        <button
                          className="btn btn--ghost btn--sm"
                          type="button"
                          onClick={() => {
                            void (async () => {
                              try {
                                setActionError(null)
                                await onRemove(coOrganizer.id)
                              } catch (removeError) {
                                setActionError(removeError instanceof Error ? removeError.message : 'Failed to remove co-organizer.')
                              }
                            })()
                          }}
                        >
                          Remove
                        </button>
                      ) : (
                        <span className="sv-inline-note">No actions</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function InvitationsTab({
  participants,
  coOrganizers,
  loading = false,
}: {
  participants: EventParticipantRecord[]
  coOrganizers: EventCoOrganizerRecord[]
  loading?: boolean
}) {
  if (loading) {
    return <EventTableSkeleton rows={5} columns={6} />
  }

  const invitationRows = [
    ...participants.map((participant) => ({
      id: participant.id,
      recipient: participant.user?.full_name || participant.user?.username || participant.email,
      email: participant.user?.email ?? participant.email,
      role: getRoleLabel(participant.event_role),
      type: 'Participant',
      status: participant.invite_status,
      sent: participant.invited_at,
      responded: participant.responded_at,
    })),
    ...coOrganizers.map((coOrganizer) => ({
      id: coOrganizer.id,
      recipient: coOrganizer.organization_name || coOrganizer.invite_email,
      email: coOrganizer.invite_email,
      role: 'Co-organizer',
      type: 'Co-organizer',
      status: coOrganizer.status,
      sent: coOrganizer.invited_at,
      responded: coOrganizer.responded_at,
    })),
  ]

  if (invitationRows.length === 0) {
    return (
      <div className="sv-panel">
        <EventEmptyState icon="mail" title="No invitations sent." />
      </div>
    )
  }

  return (
    <div className="sv-panel">
      <div className="sv-panel__head">
        <span className="sv-panel__title">Invitation log</span>
        <span className="sv-page-header__sub">{invitationRows.length} total</span>
      </div>
      <div className="sv-table-wrap">
        <table className="sv-table" aria-label="Event invitations">
          <thead>
            <tr>
              <th>Recipient</th>
              <th>Role</th>
              <th>Type</th>
              <th>Status</th>
              <th>Sent</th>
              <th>Responded</th>
            </tr>
          </thead>
          <tbody>
            {invitationRows.map((row) => (
              <tr key={row.id}>
                <td>
                  <div className="sv-table__user">
                    <Avatar name={row.recipient} size="sm" />
                    <div>
                      <div className="sv-table__user-name">{row.recipient}</div>
                      <div className="sv-table__user-email">{row.email}</div>
                    </div>
                  </div>
                </td>
                <td>{row.role === 'Co-organizer' ? <span className="sv-mini-pill">Co-organizer</span> : <EventBadge type="role" value={row.role.toLowerCase() as EventRole} />}</td>
                <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{row.type}</td>
                <td>
                  <EventBadge type="status" value={row.status} />
                </td>
                <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{formatDateTime(row.sent)}</td>
                <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{row.responded ? formatDateTime(row.responded) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function EventsPage({ token }: { token: string }) {
  const navigate = useNavigate()
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [events, setEvents] = useState<EventWorkspaceCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeScope, setActiveScope] = useState<EventWorkspaceTab>('all')
  const [saving, setSaving] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [form, setForm] = useState<EventFormState>(buildEmptyForm())

  const workspacePermissions = useEventPermissions(null, dashboard)
  const managedOrganizations = useMemo(() => getManagedOrganizations(dashboard), [dashboard])
  const selectedManagedRole = useMemo(
    () => managedOrganizations.find((organization) => organization.id === form.organizationId)?.role ?? null,
    [form.organizationId, managedOrganizations],
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const nextDashboard = await fetchDashboard(token)
      const managedOrgIds = new Set(
        nextDashboard.memberships
          .filter((membership) => membership.role === 'creator' || membership.role === 'manager')
          .map((membership) => membership.organization_id),
      )

      const publicEvents = await fetchPublicEvents()
      const orgResults: EventModel[][] = []
      for (const organization of nextDashboard.organizations) {
        try {
          const response = await fetchOrganizationEvents(token, organization.id)
          orgResults.push(response.results)
        } catch {
          orgResults.push([])
        }
      }

      const mergedEvents: EventModel[] = [...publicEvents.results]
      for (const list of orgResults) {
        mergedEvents.push(...list)
      }

      const merged = new Map<string, EventModel>()
      mergedEvents.forEach((event) => {
        merged.set(event.id, event)
      })

      const enriched = await Promise.all(
        Array.from(merged.values()).map(async (event) => {
          let participants: EventParticipantRecord[] = []
          let coOrganizers: EventCoOrganizerRecord[] = []

          if (event.organization.id === nextDashboard.active_organization?.id || managedOrgIds.has(event.organization.id) || event.created_by.id === nextDashboard.user.id) {
            try {
              participants = (await fetchEventParticipants(token, event.id)).results
            } catch {
              participants = []
            }

            try {
              coOrganizers = (await fetchEventCoOrganizers(token, event.id)).results
            } catch {
              coOrganizers = []
            }
          }

          const participant = getUserParticipantRecord(participants, nextDashboard)
          const coOrganizer = getUserCoOrganizerRecord(coOrganizers, nextDashboard)
          const roleLabel = deriveCardRoleLabel(event, nextDashboard, participant, coOrganizer)

          return {
            ...event,
            role_label: roleLabel,
            is_mine: event.created_by.id === nextDashboard.user.id,
            is_co_organizing: Boolean(coOrganizer),
            is_attending: participant?.invite_status === 'accepted',
            participant_count: participants.filter((participantItem) => participantItem.invite_status === 'accepted').length,
            co_organizer_count: coOrganizers.filter((coOrganizerItem) => coOrganizerItem.status === 'accepted').length,
            pending_invite_count: participants.filter((participantItem) => participantItem.invite_status === 'pending').length +
              coOrganizers.filter((coOrganizerItem) => coOrganizerItem.status === 'pending').length,
          } as EventWorkspaceCard
        }),
      )

      setDashboard(nextDashboard)
      setEvents(enriched.sort((left, right) => new Date(left.start_datetime).getTime() - new Date(right.start_datetime).getTime()))
      setForm((current) => ({
        ...current,
        organizationId: current.organizationId || managedOrgIds.values().next().value || '',
      }))
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load events.')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    void load()
  }, [load])

  const visibleEvents = useMemo(() => {
    switch (activeScope) {
      case 'mine':
        return events.filter((event) => event.is_mine)
      case 'co-organizing':
        return events.filter((event) => event.is_co_organizing)
      case 'attending':
        return events.filter((event) => event.is_attending)
      case 'all':
      default:
        return events
    }
  }, [activeScope, events])

  const formCanCreate = workspacePermissions.canCreateEvent && managedOrganizations.length > 0

  const handleCreate = async () => {
    const validationMessage = getCreateEventValidationMessage(form)
    if (validationMessage) {
      setCreateError(validationMessage)
      return
    }

    setSaving(true)
    setCreateError(null)
    try {
      await createEvent(token, {
        organization_id: form.organizationId,
        title: form.title.trim(),
        description: form.description.trim(),
        cover_image: form.cover_image.trim() || null,
        location: form.location.trim(),
        start_datetime: parseInputDateTime(form.start_datetime),
        end_datetime: parseInputDateTime(form.end_datetime),
        timezone: form.timezone.trim() || 'UTC',
        visibility: form.visibility,
      })
      setForm(buildEmptyForm(form.organizationId))
      void load()
    } catch (createError) {
      setCreateError(createError instanceof Error ? createError.message : 'Failed to create event.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div>
        <div className="sv-skeleton" style={{ height: 26, width: 220, marginBottom: 8 }} />
        <div className="sv-skeleton" style={{ height: 14, width: 360, marginBottom: 24 }} />
        <div className="sv-metrics">
          {[1, 2, 3, 4].map((index) => (
            <div key={index} className="sv-metric">
              <div className="sv-skeleton" style={{ height: 56 }} />
            </div>
          ))}
        </div>
        <EventSkeletonGrid columns={2} cards={2} />
      </div>
    )
  }

  if (error) {
    return <EventErrorState title="Failed to load events" error={error} onRetry={() => void load()} />
  }

  return (
    <>
      <div className="sv-page-header">
        <p className="sv-section__eyebrow">Events / Event workspace</p>
        <h1 className="sv-page-header__title">Events</h1>
        <p className="sv-page-header__sub">
          Browse all events, manage the ones you organize, and track your attendances across organizations.
        </p>
      </div>

      <div className="sv-metrics" style={{ marginBottom: 16 }}>
        <EventStatCard
          label="Visible events"
          value={events.length}
          note="Across all organizations"
          icon={<Icon.Calendar />}
        />
        <EventStatCard
          label="My events"
          value={events.filter((event) => event.is_mine).length}
          note="Events you started"
          icon={<Icon.Plus />}
        />
        <EventStatCard
          label="Co-organizing"
          value={events.filter((event) => event.is_co_organizing).length}
          note="Active co-organizer role"
          icon={<Icon.Users />}
        />
        <EventStatCard
          label="Attending"
          value={events.filter((event) => event.is_attending).length}
          note="Confirmed attendance"
          icon={<Icon.CheckCircle />}
        />
      </div>

      <div className="sv-panel" style={{ marginBottom: 12 }}>
        <div className="sv-workspace-nav">
          {([
            ['all', 'All events', events.length],
            ['mine', 'My events', events.filter((event) => event.is_mine).length],
            ['co-organizing', 'Co-organizing', events.filter((event) => event.is_co_organizing).length],
            ['attending', 'Attending', events.filter((event) => event.is_attending).length],
          ] as Array<[EventWorkspaceTab, string, number]>).map(([key, label, count]) => (
            <button
              key={key}
              type="button"
              className={`sv-workspace-nav__item${activeScope === key ? ' sv-workspace-nav__item--active' : ''}`}
              onClick={() => setActiveScope(key)}
            >
              <span>{label}</span>
              <span className="sv-workspace-nav__count">{count}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="sv-grid-2">
        {formCanCreate ? (
          <div className="sv-panel" id="sv-event-create-panel">
            <div className="sv-panel__head">
              <div>
                <span className="sv-panel__title">Create event</span>
                <div className="sv-panel__sub">Events are tied to an organization you manage.</div>
              </div>
              {selectedManagedRole === 'manager' && <span className="sv-status sv-status--pending">Approval required</span>}
            </div>

            {selectedManagedRole === 'manager' && (
              <div className="sv-banner sv-banner--info" style={{ marginBottom: 14 }}>
                <div>
                  <strong>Your event will require Creator approval before going live.</strong>
                </div>
              </div>
            )}

            <div className="sv-dashboard-form">
              <label className="sv-field">
                <span>Title</span>
                <input
                  className="sv-input"
                  value={form.title}
                  onChange={(eventInput) => setForm((current) => ({ ...current, title: eventInput.target.value }))}
                  placeholder="Annual Developer Summit"
                  required
                />
              </label>

              <label className="sv-field">
                <span>Organization</span>
                <select
                  className="sv-select"
                  value={form.organizationId}
                  onChange={(eventInput) => setForm((current) => ({ ...current, organizationId: eventInput.target.value }))}
                  required
                >
                  {managedOrganizations.map((organization) => (
                    <option key={organization.id} value={organization.id}>
                    {organization.name}
                  </option>
                ))}
              </select>
            </label>

              <label className="sv-field">
                <span>Location</span>
                <input
                  className="sv-input"
                  value={form.location}
                  onChange={(eventInput) => setForm((current) => ({ ...current, location: eventInput.target.value }))}
                  placeholder="Kenya Conference Center"
                  required
                />
              </label>

              <label className="sv-field">
                <span>Visibility</span>
                <EventFormSegmentedVisibility
                  value={form.visibility}
                  onChange={(value) => setForm((current) => ({ ...current, visibility: value }))}
                />
              </label>

              <label className="sv-field">
                <span>Start date &amp; time</span>
                <input
                  className="sv-input"
                  type="datetime-local"
                  value={form.start_datetime}
                  onChange={(eventInput) => setForm((current) => ({ ...current, start_datetime: eventInput.target.value }))}
                  required
                />
              </label>

              <label className="sv-field">
                <span>End date &amp; time</span>
                <input
                  className="sv-input"
                  type="datetime-local"
                  value={form.end_datetime}
                  onChange={(eventInput) => setForm((current) => ({ ...current, end_datetime: eventInput.target.value }))}
                  required
                />
              </label>

              <label className="sv-field">
                <span>Timezone</span>
                <input
                  className="sv-input"
                  value={form.timezone}
                  onChange={(eventInput) => setForm((current) => ({ ...current, timezone: eventInput.target.value }))}
                  placeholder="Africa/Nairobi"
                />
              </label>

              <label className="sv-field">
                <span>Description</span>
                <textarea
                  className="sv-textarea"
                  rows={5}
                  value={form.description}
                  onChange={(eventInput) => setForm((current) => ({ ...current, description: eventInput.target.value }))}
                  placeholder="Brief summary of what attendees can expect."
                  required
                />
              </label>

              <label className="sv-field">
                <span>Cover image URL</span>
                <input
                  className="sv-input"
                  type="url"
                  value={form.cover_image}
                  onChange={(eventInput) => setForm((current) => ({ ...current, cover_image: eventInput.target.value }))}
                  placeholder="https://example.com/event-cover.jpg"
                />
              </label>

              <div className="sv-form-actions">
                <button className="btn btn--blue btn--sm" type="button" onClick={handleCreate} disabled={saving}>
                  {saving ? 'Creating...' : 'Create event'}
                </button>
              </div>
              {createError && (
                <p className="sv-inline-error" role="alert">
                  {createError}
                </p>
              )}
            </div>
          </div>
        ) : null}

        <div className="sv-panel" style={!formCanCreate ? { gridColumn: '1 / -1' } : undefined}>
          <div className="sv-panel__head">
            <span className="sv-panel__title">Event catalog</span>
            <span className="sv-page-header__sub">{visibleEvents.length} shown</span>
          </div>
          {visibleEvents.length === 0 ? (
            <EventEmptyState
              icon="calendar"
              title="No events yet."
              subtitle="Create the first one or switch filters to browse your workspace events."
              action={
                formCanCreate ? (
                  <button
                    className="btn btn--blue btn--sm"
                    type="button"
                    onClick={() =>
                      document.getElementById('sv-event-create-panel')?.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start',
                      })
                    }
                  >
                    Create event
                  </button>
                ) : (
                  <button
                    className="btn btn--ghost btn--sm"
                    type="button"
                    onClick={() => setActiveScope('all')}
                  >
                    View all events
                  </button>
                )
              }
            />
          ) : (
            <div className="sv-course-list">
              {visibleEvents.map((event) => (
                <EventCatalogCard key={event.id} event={event} onOpen={(eventId) => navigate(`/events/${eventId}`)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export function EventManagementPage({ token }: { token: string }) {
  const { eventId } = useParams<{ eventId: string }>()
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [event, setEvent] = useState<EventModel | null>(null)
  const [participants, setParticipants] = useState<EventParticipantRecord[]>([])
  const [coOrganizers, setCoOrganizers] = useState<EventCoOrganizerRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<EventManagementTab>('details')
  const [saving, setSaving] = useState(false)
  const [rejectionNote, setRejectionNote] = useState('')
  const [rejectionError, setRejectionError] = useState<string | null>(null)
  const [showRejectInput, setShowRejectInput] = useState(false)

  const load = useCallback(async () => {
    if (!eventId) return
    setLoading(true)
    setError(null)
    try {
      const [nextDashboard, nextEvent] = await Promise.all([
        fetchDashboard(token),
        fetchEvent(token, eventId),
      ])
      const [participantResponse, coOrganizerResponse] = await Promise.all([
        fetchEventParticipants(token, eventId).catch(() => ({ results: [] as EventParticipantRecord[] })),
        fetchEventCoOrganizers(token, eventId).catch(() => ({ results: [] as EventCoOrganizerRecord[] })),
      ])
      setDashboard(nextDashboard)
      setEvent(nextEvent)
      setParticipants(participantResponse.results)
      setCoOrganizers(coOrganizerResponse.results)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load event.')
    } finally {
      setLoading(false)
    }
  }, [eventId, token])

  useEffect(() => {
    void load()
  }, [load])

  const permissions = useEventPermissions(event, dashboard, participants, coOrganizers)

  useEffect(() => {
    if (activeTab === 'participants' && !permissions.canViewParticipantsTab) {
      setActiveTab('details')
    }
    if (activeTab === 'co-organizers' && !permissions.canViewCoOrganizersTab) {
      setActiveTab('details')
    }
    if (activeTab === 'invitations' && !permissions.canViewInvitationsTab) {
      setActiveTab('details')
    }
  }, [
    activeTab,
    permissions.canViewCoOrganizersTab,
    permissions.canViewInvitationsTab,
    permissions.canViewParticipantsTab,
  ])

  const loadParticipants = async () => {
    if (!eventId) return
    try {
      const next = await fetchEventParticipants(token, eventId)
      setParticipants(next.results)
    } catch {
      setParticipants([])
    }
  }

  const loadCoOrganizers = async () => {
    if (!eventId) return
    try {
      const next = await fetchEventCoOrganizers(token, eventId)
      setCoOrganizers(next.results)
    } catch {
      setCoOrganizers([])
    }
  }

  if (loading) {
    return (
      <div>
        <div className="sv-skeleton" style={{ height: 26, width: 260, marginBottom: 8 }} />
        <div className="sv-skeleton" style={{ height: 14, width: 220, marginBottom: 24 }} />
        <div className="sv-metrics">
          {[1, 2, 3].map((index) => (
            <div key={index} className="sv-metric">
              <div className="sv-skeleton" style={{ height: 56 }} />
            </div>
          ))}
        </div>
        <EventSkeletonGrid columns={2} cards={2} />
      </div>
    )
  }

  if (error || !event || !dashboard) {
    return (
      <EventErrorState
        title="Failed to load event"
        error={error ?? 'The selected event could not be loaded.'}
        onRetry={() => void load()}
      />
    )
  }

  const handleSaveDetails = async (payload: EventFormState) => {
    if (!eventId) return
    setSaving(true)
    try {
      const next = await updateEvent(token, eventId, payload)
      setEvent(next)
      await load()
    } finally {
      setSaving(false)
    }
  }

  const handleApprove = async () => {
    if (!eventId) return
    setSaving(true)
    try {
      const next = await approveEvent(token, eventId)
      setEvent(next)
      await load()
    } finally {
      setSaving(false)
      setShowRejectInput(false)
      setRejectionError(null)
    }
  }

  const handleReject = async () => {
    if (!eventId) return
    if (!rejectionNote.trim()) {
      setRejectionError('Rejection note is required.')
      setRejectionNote('')
      return
    }
    setRejectionError(null)
    setSaving(true)
    try {
      const next = await rejectEvent(token, eventId, { rejection_note: rejectionNote.trim() })
      setEvent(next)
      await load()
    } finally {
      setSaving(false)
      setShowRejectInput(false)
      setRejectionNote('')
      setRejectionError(null)
    }
  }

  const handleInviteParticipant = async (payload: { email: string; event_role: EventRole }) => {
    if (!eventId) return
    await createEventParticipantInvite(token, eventId, payload)
    await loadParticipants()
  }

  const handleChangeParticipantRole = async (participantId: string, role: EventRole) => {
    if (!eventId) return
    await updateEventParticipantRole(token, eventId, participantId, { event_role: role })
    await loadParticipants()
  }

  const handleRemoveParticipant = async (participantId: string) => {
    if (!eventId) return
    if (!window.confirm('Remove this participant from the event?')) return
    await deleteEventParticipant(token, eventId, participantId)
    await loadParticipants()
  }

  const handleInviteCoOrganizer = async (payload: { contact_email: string; organization_id?: string | null }) => {
    if (!eventId) return
    await createEventCoOrganizerInvite(token, eventId, payload)
    await loadCoOrganizers()
  }

  const handleRemoveCoOrganizer = async (coOrganizerId: string) => {
    if (!eventId) return
    if (!window.confirm('Remove this co-organizer organization?')) return
    await deleteEventCoOrganizer(token, eventId, coOrganizerId)
    await loadCoOrganizers()
  }

  const participantCount = participants.filter((participant) => participant.invite_status === 'accepted').length
  const pendingInviteCount = participants.filter((participant) => participant.invite_status === 'pending').length + coOrganizers.filter((coOrganizer) => coOrganizer.status === 'pending').length
  const coOrganizerCount = coOrganizers.filter((coOrganizer) => coOrganizer.status === 'accepted').length

  return (
    <>
      <div className="sv-page-header">
        <div className="sv-breadcrumb-link">
          <Link to="/events" className="sv-panel__action">
            Back to events
          </Link>
        </div>
        <p className="sv-section__eyebrow">Events / Event management</p>
        <h1 className="sv-page-header__title">{event.title}</h1>
        <p className="sv-page-header__sub">Manage event details, participants, and co-organizers.</p>
      </div>

      <div className="sv-metrics" style={{ marginBottom: 16 }}>
        <EventStatCard
          label="Participants"
          value={participantCount}
          note="Total confirmed count"
          icon={<Icon.Users />}
        />
        <EventStatCard
          label="Pending invites"
          value={pendingInviteCount}
          note="Open invitation count"
          icon={<Icon.Mail />}
        />
        <EventStatCard
          label="Co-organizers"
          value={coOrganizerCount}
          note="Active co-organizer orgs"
          icon={<Icon.Building />}
        />
        <EventStatCard
          label="Status"
          value={<EventBadge type="status" value={event.status} />}
          note="Current event lifecycle state"
          icon={<Icon.Calendar />}
        />
      </div>

      <EventApprovalBanner
        event={event}
        permissions={permissions}
        onApprove={() => void handleApprove()}
        onReject={() => void handleReject()}
        rejectionNote={rejectionNote}
        setRejectionNote={setRejectionNote}
        rejectionError={rejectionError}
        setRejectionError={setRejectionError}
        showRejectInput={showRejectInput}
        setShowRejectInput={setShowRejectInput}
        saving={saving}
      />

      {event.status === 'rejected' && permissions.isManager && permissions.isInitiator && (
        <div className="sv-banner sv-banner--danger" style={{ marginBottom: 12 }}>
          <div>
            <strong>Rejection note:</strong> {event.rejection_note || 'No note provided.'}
          </div>
          <div className="sv-banner__actions">
            <button className="btn btn--blue btn--sm" type="button" onClick={() => setActiveTab('details')} disabled={saving}>
              Edit & Resubmit
            </button>
          </div>
        </div>
      )}

      <EventTabs activeTab={activeTab} onChange={setActiveTab} permissions={permissions} />

      {activeTab === 'details' && (
        <EventDetailsPanel
          event={event}
          permissions={permissions}
          onSave={handleSaveDetails}
        />
      )}

      {activeTab === 'participants' && permissions.canViewParticipantsTab && (
        <ParticipantsTab
          event={event}
          participants={participants}
          permissions={permissions}
          onInvite={handleInviteParticipant}
          onRemove={handleRemoveParticipant}
          onRoleChange={handleChangeParticipantRole}
        />
      )}

      {activeTab === 'co-organizers' && permissions.canViewCoOrganizersTab && (
        <CoOrganizersTab
          dashboard={dashboard}
          coOrganizers={coOrganizers}
          permissions={permissions}
          onInvite={handleInviteCoOrganizer}
          onRemove={handleRemoveCoOrganizer}
        />
      )}

      {activeTab === 'invitations' && permissions.canViewInvitationsTab && (
        <InvitationsTab participants={participants} coOrganizers={coOrganizers} />
      )}
    </>
  )
}
