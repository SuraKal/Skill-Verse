// Api.ts    
import type {
  DashboardData,
  InvitationDetail,
  LoginPayload,
  LoginResponse,
  OrganizationDashboardData,
  PlatformBootstrap,
  RegisterPayload,
  User,
  UserProfileUpdatePayload,
} from '../types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000/api'
const AUTH_SESSION_EVENT = 'skillverse:auth-session'

const jsonHeaders = (token?: string) => ({
  'Content-Type': 'application/json',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
})

function notifyAuthSession(accessToken: string | null) {
  window.dispatchEvent(
    new CustomEvent<string | null>(AUTH_SESSION_EVENT, {
      detail: accessToken,
    }),
  )
}

function clearStoredSession() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('session_user')
  notifyAuthSession(null)
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem('refresh_token')
  if (!refreshToken) {
    clearStoredSession()
    return null
  }

  const response = await fetch(`${API_BASE_URL}/auth/token/refresh/`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({ refresh: refreshToken }),
  })

  if (!response.ok) {
    clearStoredSession()
    return null
  }

  const payload = (await response.json()) as { access?: string; refresh?: string }
  if (!payload.access) {
    clearStoredSession()
    return null
  }

  localStorage.setItem('access_token', payload.access)
  if (payload.refresh) {
    localStorage.setItem('refresh_token', payload.refresh)
  }
  notifyAuthSession(payload.access)
  return payload.access
}

async function authorizedFetch(input: string, init: RequestInit, token: string): Promise<Response> {
  const response = await fetch(input, {
    ...init,
    headers: jsonHeaders(token),
  })

  if (response.status !== 401) {
    return response
  }

  const nextAccessToken = await refreshAccessToken()
  if (!nextAccessToken) {
    return response
  }

  return fetch(input, {
    ...init,
    headers: jsonHeaders(nextAccessToken),
  })
}

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | Record<string, string | string[] | undefined>
      | null
    const firstMessage =
      typeof payload?.detail === 'string'
        ? payload.detail
        : Array.isArray(payload?.non_field_errors) && typeof payload.non_field_errors[0] === 'string'
          ? payload.non_field_errors[0]
          : Object.values(payload ?? {}).find((value) =>
              typeof value === 'string' || (Array.isArray(value) && typeof value[0] === 'string'),
            )
    const message =
      typeof firstMessage === 'string'
        ? firstMessage
        : Array.isArray(firstMessage) && typeof firstMessage[0] === 'string'
          ? firstMessage[0]
          : 'Request failed.'
    throw new Error(message)
  }
  return (await response.json()) as T
}

export async function fetchPublicBootstrap(): Promise<PlatformBootstrap> {
  const response = await fetch(`${API_BASE_URL}/bootstrap/public/`)
  return parseJson<PlatformBootstrap>(response)
}

export async function registerUser(payload: RegisterPayload): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/auth/register/`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify(payload),
  })
  return parseJson<User>(response)
}

export async function loginUser(payload: LoginPayload): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/token/`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify(payload),
  })
  const session = await parseJson<LoginResponse>(response)
  notifyAuthSession(session.access)
  return session
}

export async function fetchDashboard(token: string): Promise<DashboardData> {
  const response = await authorizedFetch(`${API_BASE_URL}/dashboard/`, {}, token)
  return parseJson<DashboardData>(response)
}

export async function fetchOrganizationDashboard(
  token: string,
  organizationId: string,
): Promise<OrganizationDashboardData> {
  const response = await authorizedFetch(
    `${API_BASE_URL}/organizations/${organizationId}/dashboard/`,
    {},
    token,
  )
  return parseJson<OrganizationDashboardData>(response)
}

export async function updateProfile(token: string, payload: UserProfileUpdatePayload): Promise<User> {
  const response = await authorizedFetch(`${API_BASE_URL}/auth/me/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }, token)
  return parseJson<User>(response)
}

export async function createOrganization(
  token: string,
  payload: { name: string; email: string; description: string },
): Promise<Record<string, unknown>> {
  const response = await authorizedFetch(`${API_BASE_URL}/organizations/`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token)
  return parseJson<Record<string, unknown>>(response)
}

export async function switchOrganization(
  token: string,
  organizationId: string,
): Promise<Record<string, unknown>> {
  const response = await authorizedFetch(`${API_BASE_URL}/organizations/${organizationId}/switch/`, {
    method: 'POST',
  }, token)
  return parseJson<Record<string, unknown>>(response)
}

export async function sendOrganizationInvitation(
  token: string,
  organizationId: string,
  payload: { invited_email: string; role: string },
): Promise<Record<string, unknown>> {
  const response = await authorizedFetch(`${API_BASE_URL}/organizations/${organizationId}/invitations/`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token)
  return parseJson<Record<string, unknown>>(response)
}

export async function fetchInvitation(token: string): Promise<InvitationDetail> {
  const response = await fetch(`${API_BASE_URL}/invitations/${token}/`)
  return parseJson<InvitationDetail>(response)
}

export async function acceptInvitation(
  accessToken: string,
  invitationToken: string,
): Promise<Record<string, unknown>> {
  const response = await authorizedFetch(`${API_BASE_URL}/invitations/${invitationToken}/accept/`, {
    method: 'POST',
    body: JSON.stringify({}),
  }, accessToken)
  return parseJson<Record<string, unknown>>(response)
}

export async function rejectInvitation(invitationToken: string): Promise<Record<string, unknown>> {
  const response = await fetch(`${API_BASE_URL}/invitations/${invitationToken}/reject/`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({}),
  })
  return parseJson<Record<string, unknown>>(response)
}

export function subscribeToAuthSessionChanges(
  onChange: (accessToken: string | null) => void,
): () => void {
  const handler = (event: Event) => {
    onChange((event as CustomEvent<string | null>).detail)
  }

  window.addEventListener(AUTH_SESSION_EVENT, handler)
  return () => window.removeEventListener(AUTH_SESSION_EVENT, handler)
}
