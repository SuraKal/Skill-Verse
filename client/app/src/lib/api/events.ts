import { API_BASE_URL, authorizedFetch, parseJson } from '../api'
import type {
  CoOrganizerStatus,
  EventCoOrganizerRecord,
  EventInviteStatus,
  EventModel,
  EventParticipantRecord,
  EventRole,
  EventStatus,
  EventVisibility,
  PaginationResponse,
} from '../../types'

export type EventUpsertPayload = {
  organization_id: string
  title: string
  description: string
  cover_image?: string | null
  location: string
  start_datetime: string
  end_datetime: string
  timezone: string
  visibility: EventVisibility
}

export type EventParticipantInvitePayload = {
  email: string
  event_role: EventRole
}

export type EventCoOrganizerInvitePayload = {
  contact_email: string
  organization_id?: string | null
}

export type EventRejectPayload = {
  rejection_note: string
}

export type EventInvitationKind = 'participant' | 'co_organizer'

export type EventInvitationAcceptPayload = {
  organization_id?: string | null
}

async function fetchPaged<T>(response: Response): Promise<PaginationResponse<T>> {
  return parseJson<PaginationResponse<T>>(response)
}

export async function fetchPublicEvents(): Promise<PaginationResponse<EventModel>> {
  const response = await fetch(`${API_BASE_URL}/events/?page_size=100`)
  return fetchPaged<EventModel>(response)
}

export async function fetchOrganizationEvents(token: string, organizationId: string): Promise<PaginationResponse<EventModel>> {
  const response = await authorizedFetch(`${API_BASE_URL}/events/org/${organizationId}/`, {}, token)
  return fetchPaged<EventModel>(response)
}

export async function fetchEvent(token: string, eventId: string): Promise<EventModel> {
  const response = await authorizedFetch(`${API_BASE_URL}/events/${eventId}/`, {}, token)
  return parseJson<EventModel>(response)
}

export async function createEvent(token: string, payload: EventUpsertPayload): Promise<EventModel> {
  const response = await authorizedFetch(`${API_BASE_URL}/events/`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token)
  return parseJson<EventModel>(response)
}

export async function updateEvent(token: string, eventId: string, payload: Partial<EventUpsertPayload>): Promise<EventModel> {
  const response = await authorizedFetch(`${API_BASE_URL}/events/${eventId}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }, token)
  return parseJson<EventModel>(response)
}

export async function archiveEvent(token: string, eventId: string): Promise<EventModel> {
  const response = await authorizedFetch(`${API_BASE_URL}/events/${eventId}/`, {
    method: 'DELETE',
  }, token)
  return parseJson<EventModel>(response)
}

export async function submitEventForApproval(token: string, eventId: string): Promise<EventModel> {
  const response = await authorizedFetch(`${API_BASE_URL}/events/${eventId}/submit/`, {
    method: 'POST',
  }, token)
  return parseJson<EventModel>(response)
}

export async function approveEvent(token: string, eventId: string): Promise<EventModel> {
  const response = await authorizedFetch(`${API_BASE_URL}/events/${eventId}/approve/`, {
    method: 'POST',
  }, token)
  return parseJson<EventModel>(response)
}

export async function rejectEvent(
  token: string,
  eventId: string,
  payload: EventRejectPayload,
): Promise<EventModel> {
  const response = await authorizedFetch(`${API_BASE_URL}/events/${eventId}/reject/`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token)
  return parseJson<EventModel>(response)
}

export async function fetchEventParticipants(
  token: string,
  eventId: string,
): Promise<PaginationResponse<EventParticipantRecord>> {
  const response = await authorizedFetch(
    `${API_BASE_URL}/events/${eventId}/participants/?page_size=100`,
    {},
    token,
  )
  return fetchPaged<EventParticipantRecord>(response)
}

export async function fetchEventCoOrganizers(
  token: string,
  eventId: string,
): Promise<PaginationResponse<EventCoOrganizerRecord>> {
  const response = await authorizedFetch(
    `${API_BASE_URL}/events/${eventId}/co-organizers/?page_size=100`,
    {},
    token,
  )
  return fetchPaged<EventCoOrganizerRecord>(response)
}

export async function createEventParticipantInvite(
  token: string,
  eventId: string,
  payload: EventParticipantInvitePayload,
): Promise<EventParticipantRecord> {
  const response = await authorizedFetch(`${API_BASE_URL}/events/${eventId}/invite/`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token)
  return parseJson<EventParticipantRecord>(response)
}

export async function updateEventParticipantRole(
  token: string,
  eventId: string,
  participantId: string,
  payload: { event_role: EventRole },
): Promise<EventParticipantRecord> {
  const response = await authorizedFetch(
    `${API_BASE_URL}/events/${eventId}/participants/${participantId}/role/`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
    token,
  )
  return parseJson<EventParticipantRecord>(response)
}

export async function deleteEventParticipant(
  token: string,
  eventId: string,
  participantId: string,
): Promise<void> {
  const response = await authorizedFetch(
    `${API_BASE_URL}/events/${eventId}/participants/${participantId}/`,
    {
      method: 'DELETE',
    },
    token,
  )
  if (!response.ok) {
    await parseJson<Record<string, unknown>>(response)
  }
}

export async function createEventCoOrganizerInvite(
  token: string,
  eventId: string,
  payload: EventCoOrganizerInvitePayload,
): Promise<EventCoOrganizerRecord> {
  const response = await authorizedFetch(`${API_BASE_URL}/events/${eventId}/co-organizers/invite/`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token)
  return parseJson<EventCoOrganizerRecord>(response)
}

export async function deleteEventCoOrganizer(
  token: string,
  eventId: string,
  coOrganizerId: string,
): Promise<void> {
  const response = await authorizedFetch(
    `${API_BASE_URL}/events/${eventId}/co-organizers/${coOrganizerId}/`,
    {
      method: 'DELETE',
    },
    token,
  )
  if (!response.ok) {
    await parseJson<Record<string, unknown>>(response)
  }
}

export async function registerForPublicEvent(token: string, eventId: string): Promise<EventParticipantRecord> {
  const response = await authorizedFetch(
    `${API_BASE_URL}/events/${eventId}/register/`,
    { method: 'POST' },
    token,
  )
  return parseJson<EventParticipantRecord>(response)
}

export async function acceptEventInvitation(
  accessToken: string,
  invitationToken: string,
  invitationType: EventInvitationKind,
  payload: EventInvitationAcceptPayload = {},
): Promise<Record<string, unknown>> {
  const path =
    invitationType === 'co_organizer'
      ? `${API_BASE_URL}/invitations/co-organizer/${invitationToken}/accept/`
      : `${API_BASE_URL}/invitations/participant/${invitationToken}/accept/`
  const response = await authorizedFetch(
    path,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    accessToken,
  )
  return parseJson<Record<string, unknown>>(response)
}

export async function rejectEventInvitation(
  invitationToken: string,
  invitationType: EventInvitationKind,
): Promise<Record<string, unknown>> {
  const path =
    invitationType === 'co_organizer'
      ? `${API_BASE_URL}/invitations/co-organizer/${invitationToken}/decline/`
      : `${API_BASE_URL}/invitations/participant/${invitationToken}/decline/`
  const response = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  })
  return parseJson<Record<string, unknown>>(response)
}

export function isEventStatus(value: string): value is EventStatus {
  return [
    'draft',
    'pending_approval',
    'active',
    'ongoing',
    'completed',
    'archived',
    'rejected',
  ].includes(value)
}

export function isEventInviteStatus(value: string): value is EventInviteStatus {
  return ['pending', 'accepted', 'declined'].includes(value)
}

export function isCoOrganizerStatus(value: string): value is CoOrganizerStatus {
  return ['pending', 'accepted', 'declined'].includes(value)
}
