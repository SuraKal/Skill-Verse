// Api.ts    
import type {
  CourseManagementData,
  CourseWorkspaceData,
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

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000/api'
const AUTH_SESSION_EVENT = 'skillverse:auth-session'

type CourseNotePayload = {
  id?: string
  title: string
  order: number
  file?: File | null
}

type CourseVideoPayload = {
  id?: string
  title: string
  embed_code: string
  order: number
}

type CourseSubsectionPayload = {
  id?: string
  name: string
  order: number
  videos: CourseVideoPayload[]
  notes: CourseNotePayload[]
}

type CourseSectionPayload = {
  id?: string
  name: string
  order: number
  subsections: CourseSubsectionPayload[]
}

type CoursePhasePayload = {
  id?: string
  name: string
  description: string
  order: number
  sections: CourseSectionPayload[]
}

type CourseUpsertPayload = {
  title: string
  description: string
  categoryIds: string[]
  organizationIds: string[]
  thumbnail?: File | null
  is_visible?: boolean
  privacy?: 'public' | 'private'
  price_type?: 'free' | 'paid'
  phaseData?: CoursePhasePayload[]
}

export const jsonHeaders = (token?: string) => ({
  'Content-Type': 'application/json',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
})

export function notifyAuthSession(accessToken: string | null) {
  window.dispatchEvent(
    new CustomEvent<string | null>(AUTH_SESSION_EVENT, {
      detail: accessToken,
    }),
  )
}

export function clearStoredSession() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('session_user')
  notifyAuthSession(null)
}

export async function refreshAccessToken(): Promise<string | null> {
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

export async function authorizedFetch(
  input: string,
  init: RequestInit = {},
  token: string,
): Promise<Response> {
  const buildHeaders = (accessToken: string) => {
    const headers = new Headers(init.headers || {});

    // Always ensure JSON content type if body exists and not FormData
    const isFormData = init.body instanceof FormData;

    if (!isFormData && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }

    return headers;
  };

  // First request
  let response = await fetch(input, {
    ...init,
    headers: buildHeaders(token),
  });

  // If not unauthorized, return immediately
  if (response.status !== 401) {
    return response;
  }

  // Try refresh token
  const nextAccessToken = await refreshAccessToken();

  if (!nextAccessToken) {
    return response;
  }

  // Retry request with new token
  response = await fetch(input, {
    ...init,
    headers: buildHeaders(nextAccessToken),
  });

  return response;
}

export async function parseJson<T>(response: Response): Promise<T> {
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

function appendCoursePayload(formData: FormData, payload: CourseUpsertPayload) {
  formData.append('title', payload.title)
  formData.append('description', payload.description)
  formData.append('is_visible', String(payload.is_visible ?? true))
  formData.append('privacy', payload.privacy ?? 'public')
  formData.append('price_type', payload.price_type ?? 'free')
  payload.categoryIds.forEach((categoryId) => formData.append('category_ids', categoryId))
  payload.organizationIds.forEach((organizationId) => formData.append('organization_ids', organizationId))

  const serializedPhases = (payload.phaseData ?? []).map((phase, phaseIndex) => ({
    ...phase,
    order: phase.order ?? phaseIndex,
    sections: phase.sections.map((section, sectionIndex) => ({
      ...section,
      order: section.order ?? sectionIndex,
      subsections: section.subsections.map((subsection, subsectionIndex) => ({
        ...subsection,
        order: subsection.order ?? subsectionIndex,
        videos: subsection.videos.map((video, videoIndex) => ({
          ...video,
          order: video.order ?? videoIndex,
        })),
        notes: subsection.notes.map((note, noteIndex) => {
          const nextNote: Record<string, string | number | undefined> = {
            id: note.id,
            title: note.title,
            order: note.order ?? noteIndex,
          }
          if (note.file) {
            const fileField = `note_upload_${crypto.randomUUID()}`
            nextNote.file_field = fileField
            formData.append(fileField, note.file)
          }
          return nextNote
        }),
      })),
    })),
  }))

  formData.append('phase_data', JSON.stringify(serializedPhases))

  if (payload.thumbnail) {
    formData.append('thumbnail', payload.thumbnail)
  }
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

export async function fetchCourseManagement(
  token: string,
  courseId: string,
): Promise<CourseManagementData> {
  const response = await authorizedFetch(
    `${API_BASE_URL}/courses/${courseId}/management/`,
    {},
    token,
  )
  return parseJson<CourseManagementData>(response)
}

export async function fetchCourseWorkspace(token: string): Promise<CourseWorkspaceData> {
  const response = await authorizedFetch(`${API_BASE_URL}/courses/`, {}, token)
  return parseJson<CourseWorkspaceData>(response)
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

export async function sendCourseInstructorInvitation(
  token: string,
  courseId: string,
  payload: { invited_email: string; custom_message: string; organization_id: string },
): Promise<Record<string, unknown>> {
  const response = await authorizedFetch(
    `${API_BASE_URL}/courses/${courseId}/instructor-invitations/`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    token,
  )
  return parseJson<Record<string, unknown>>(response)
}
export async function sendCourseEnrollmentInvitation(
  token: string,
  courseId: string,
  payload: { invited_email: string; custom_message: string; organization_id: string },
): Promise<Record<string, unknown>> {
  const response = await authorizedFetch(
    `${API_BASE_URL}/courses/${courseId}/enrollment-invitations/`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    token,
  )
  return parseJson<Record<string, unknown>>(response)
}

export async function createCourse(
  token: string,
  payload: CourseUpsertPayload,
): Promise<Record<string, unknown>> {
  const formData = new FormData()
  appendCoursePayload(formData, payload)

  const response = await authorizedFetch(
    `${API_BASE_URL}/courses/`,
    {
      method: 'POST',
      body: formData,
    },
    token,
  )
  return parseJson<Record<string, unknown>>(response)
}

export async function updateCourse(
  token: string,
  courseId: string,
  payload: CourseUpsertPayload,
): Promise<Record<string, unknown>> {
  const formData = new FormData();
  appendCoursePayload(formData, payload)

  const response = await authorizedFetch(
    `${API_BASE_URL}/courses/${courseId}/`,
    {
      method: "PATCH",
      body: formData,
    },
    token,
  );
  return parseJson<Record<string, unknown>>(response);
}

export async function deleteCourse(token: string, courseId: string): Promise<void> {
  const response = await authorizedFetch(
    `${API_BASE_URL}/courses/${courseId}/`,
    {
      method: 'DELETE',
    },
    token,
  )
  if (!response.ok) {
    await parseJson<Record<string, unknown>>(response)
  }
}

export async function enrollInCourse(
  token: string,
  courseId: string,
): Promise<void> {
  const course = await fetchCourseManagement(token, courseId);

  if (course && course.price_type === "paid") {
    throw new Error(
      "Here should be a payment flow before enrollment for paid courses, but it's not implemented yet."
    );
  }

  const response = await authorizedFetch(
    `${API_BASE_URL}/courses/${courseId}/enroll/`,
    { method: "POST" },
    token,
  );

  if (!response.ok) {
    await parseJson<Record<string, unknown>>(response);
  }
}

export async function createOrganizationCourse(
  token: string,
  organizationId: string,
  payload: CourseUpsertPayload,
): Promise<Record<string, unknown>> {
  const formData = new FormData()
  appendCoursePayload(formData, payload)

  const response = await authorizedFetch(
    `${API_BASE_URL}/organizations/${organizationId}/courses/`,
    {
      method: 'POST',
      body: formData,
    },
    token,
  )
  return parseJson<Record<string, unknown>>(response)
}

export async function updateOrganizationCourse(
  token: string,
  organizationId: string,
  courseId: string,
  payload: CourseUpsertPayload,
): Promise<Record<string, unknown>> {
  const formData = new FormData()
  appendCoursePayload(formData, payload)

  const response = await authorizedFetch(
    `${API_BASE_URL}/organizations/${organizationId}/courses/${courseId}/`,
    {
      method: 'PATCH',
      body: formData,
    },
    token,
  )
  return parseJson<Record<string, unknown>>(response)
}

export async function deleteOrganizationCourse(
  token: string,
  organizationId: string,
  courseId: string,
): Promise<void> {
  const response = await authorizedFetch(
    `${API_BASE_URL}/organizations/${organizationId}/courses/${courseId}/`,
    {
      method: 'DELETE',
    },
    token,
  )

  if (!response.ok) {
    await parseJson<Record<string, unknown>>(response)
  }
}

export async function fetchInvitation(
  token: string,
  invitationType: "organization" | "course_instructor" | "course_enrollment",
): Promise<InvitationDetail> {
  const path =
    invitationType === "course_instructor"
      ? `${API_BASE_URL}/course-invitations/${token}/`
      : invitationType === "course_enrollment"
        ? `${API_BASE_URL}/course-enrollment-invitations/${token}/`
        : `${API_BASE_URL}/invitations/${token}/`;
  const response = await fetch(path);
  return parseJson<InvitationDetail>(response);
}

export async function acceptInvitation(
  accessToken: string,
  invitationToken: string,
  invitationType:
    | "organization"
    | "course_instructor"
    | "course_enrollment" = "organization",
): Promise<Record<string, unknown>> {
  const path =
    invitationType === "course_instructor"
      ? `${API_BASE_URL}/course-invitations/${invitationToken}/accept/`
      : invitationType === "course_enrollment"
        ? `${API_BASE_URL}/course-enrollment-invitations/${invitationToken}/accept/`
        : `${API_BASE_URL}/invitations/${invitationToken}/accept/`;
  const response = await authorizedFetch(
    path,
    {
      method: "POST",
      body: JSON.stringify({}),
    },
    accessToken,
  );
  return parseJson<Record<string, unknown>>(response);
}

export async function rejectInvitation(
  invitationToken: string,
  invitationType:
    | "organization"
    | "course_instructor"
    | "course_enrollment" = "organization",
): Promise<Record<string, unknown>> {
  const path =
    invitationType === "course_instructor"
      ? `${API_BASE_URL}/course-invitations/${invitationToken}/reject/`
      : invitationType === "course_enrollment"
        ? `${API_BASE_URL}/course-enrollment-invitations/${invitationToken}/reject/`
        : `${API_BASE_URL}/invitations/${invitationToken}/reject/`;
  const response = await fetch(path, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({}),
  });
  return parseJson<Record<string, unknown>>(response);
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
