import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import {
  fetchCourseManagement,
  sendCourseInstructorInvitation,
  sendCourseEnrollmentInvitation,
  updateCourse,
} from '../lib/api/courses'
import { CourseOutlineEditor, CourseOutlinePreview, normalizeEditablePhases, type EditableCoursePhase } from '../components/CourseOutlineEditor'
import { Avatar, Icon } from '../components/DashboardLayout'
import type {
  CourseInstructorAssignment,
  CourseEnrollmentAssignment,
  CourseInstructorInvitation,
  CourseManagementData,
  OrganizationOption,
  CourseEnrollmentInvitation,
} from '../types'
import '../styles/Dashboard.css'

type CourseManagementTab = 'details' | 'instructors' | 'enrollments'

function serializePhasesForPayload(phases: EditableCoursePhase[]) {
  return phases
    .filter((phase) => phase.name.trim())
    .map((phase, phaseIndex) => ({
      id: phase.id,
      name: phase.name.trim(),
      description: phase.description.trim(),
      order: phaseIndex,
      sections: phase.sections
        .filter((section) => section.name.trim())
        .map((section, sectionIndex) => ({
          id: section.id,
          name: section.name.trim(),
          order: sectionIndex,
          subsections: section.subsections
            .filter((subsection) => subsection.name.trim())
            .map((subsection, subsectionIndex) => ({
              id: subsection.id,
              name: subsection.name.trim(),
              order: subsectionIndex,
              videos: subsection.videos
                .filter((video) => video.title.trim() || video.embed_code.trim())
                .map((video, videoIndex) => ({
                  id: video.id,
                  title: video.title.trim(),
                  embed_code: video.embed_code.trim(),
                  order: videoIndex,
                })),
              notes: subsection.notes
                .filter((note) => note.file || note.file_url)
                .map((note, noteIndex) => ({
                  id: note.id,
                  title: note.title.trim(),
                  order: noteIndex,
                  file: note.file,
                })),
            })),
        })),
    }))
}

function CourseTabs({
  activeTab,
  onChange,
  canManageCourse,
}: {
  activeTab: CourseManagementTab
  onChange: (tab: CourseManagementTab) => void
  canManageCourse: boolean
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
        {canManageCourse && (
          <>
            <button
              type="button"
              className={`sv-workspace-nav__item${activeTab === 'instructors' ? ' sv-workspace-nav__item--active' : ''}`}
              onClick={() => onChange('instructors')}
            >
              <span>Instructors</span>
            </button>
            <button
              type="button"
              className={`sv-workspace-nav__item${activeTab === 'enrollments' ? ' sv-workspace-nav__item--active' : ''}`}
              onClick={() => onChange('enrollments')}
            >
              <span>Enrollments</span>
            </button>
          </>
        )}
      </div>
      <p className="sv-panel__sub" style={{ marginTop: 14 }}>
        {canManageCourse
          ? 'This layout is ready for future modules like enrollments, assessments, certificates, and other course operations.'
          : 'You can review the course details here. Management tools are reserved for course creators and organization managers.'}
      </p>
    </div>
  )
}

function InstructorRow({ assignment }: { assignment: CourseInstructorAssignment }) {
  const joined = new Date(assignment.created_at).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  return (
    <tr>
      <td>
        <div className="sv-table__user">
          <Avatar name={assignment.user.full_name || assignment.user.username} size="sm" />
          <div>
            <div className="sv-table__user-name">{assignment.user.full_name || assignment.user.username}</div>
            <div className="sv-table__user-email">{assignment.user.email}</div>
          </div>
        </div>
      </td>
      <td>
        <span className="sv-role-badge sv-role-badge--instructor">Instructor</span>
      </td>
      <td style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>{joined}</td>
    </tr>
  )
}

function EnrollmentRow({ enrollment }: { enrollment: CourseEnrollmentAssignment }) {
  const joined = new Date(enrollment.created_at).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  return (
    <tr>
      <td>
        <div className="sv-table__user">
          <Avatar name={enrollment.user.full_name || enrollment.user.username} size="sm" />
          <div>
            <div className="sv-table__user-name">{enrollment.user.full_name || enrollment.user.username}</div>
            <div className="sv-table__user-email">{enrollment.user.email}</div>
          </div>
        </div>
      </td>
      <td>
        <span className="sv-role-badge sv-role-badge--instructor">Enrolled</span>
      </td>
      <td style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>{joined}</td>
    </tr>
  )
}

function InstructorInvitationRow({ invitation }: { invitation: CourseInstructorInvitation }) {
  const sent = new Date(invitation.date_sent).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
  const expires = new Date(invitation.expires_at).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
  const isExpired = new Date(invitation.expires_at) < new Date()
  const statusKey = isExpired && invitation.status === 'pending' ? 'expired' : invitation.status

  return (
    <tr>
      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{invitation.invited_email}</td>
      <td style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>{invitation.organization_name}</td>
      <td style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>{invitation.custom_message || 'No custom message'}</td>
      <td style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>{sent}</td>
      <td style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>{expires}</td>
      <td>
        <span className={`sv-status sv-status--${statusKey}`}>{statusKey}</span>
      </td>
    </tr>
  )
}

function EnrollmentInvitationRow({ invitation }: { invitation: CourseEnrollmentInvitation }) {
  const sent = new Date(invitation.date_sent).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
  const expires = new Date(invitation.expires_at).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
  const isExpired = new Date(invitation.expires_at) < new Date()
  const statusKey = isExpired && invitation.status === 'pending' ? 'expired' : invitation.status

  return (
    <tr>
      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{invitation.invited_email}</td>
      <td style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>{invitation.organization_name}</td>
      <td style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>{invitation.custom_message || 'No custom message'}</td>
      <td style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>{sent}</td>
      <td style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>{expires}</td>
      <td>
        <span className={`sv-status sv-status--${statusKey}`}>{statusKey}</span>
      </td>
    </tr>
  )
}

function InstructorInviteForm({
  token,
  courseId,
  manageableOrganizations,
  canInvite,
  onSent,
}: {
  token: string
  courseId: string
  manageableOrganizations: OrganizationOption[]
  canInvite: boolean
  onSent: () => void
}) {
  const [email, setEmail] = useState('')
  const [customMessage, setCustomMessage] = useState('')
  const [organizationId, setOrganizationId] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!organizationId && manageableOrganizations.length > 0) {
      setOrganizationId(manageableOrganizations[0].id)
    }
  }, [manageableOrganizations, organizationId])

  const handleSubmit = async () => {
    if (!email.trim() || !canInvite || !organizationId) return
    setSending(true)
    setError(null)
    try {
      await sendCourseInstructorInvitation(token, courseId, {
        invited_email: email.trim(),
        custom_message: customMessage.trim(),
        organization_id: organizationId,
      })
      setEmail('')
      setCustomMessage('')
      onSent()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to send instructor invitation.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="sv-course-composer">
      <div className="sv-panel__head">
        <div>
          <div className="sv-panel__title">Invite instructors</div>
          <div className="sv-panel__sub">
            Send a course-specific invite without requiring the instructor to join the organization first.
          </div>
        </div>
      </div>

      {manageableOrganizations.length > 0 && (
        <label className="sv-field" style={{ marginBottom: 12 }}>
          <span className="sv-field__label">Sending organization</span>
          <select
            className="sv-select"
            value={organizationId}
            onChange={(event) => setOrganizationId(event.target.value)}
            disabled={!canInvite}
          >
            {manageableOrganizations.map((organization) => (
              <option key={organization.id} value={organization.id}>
                {organization.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="sv-invite-form" style={{ marginBottom: 12 }}>
        <input
          className="sv-input"
          type="email"
          placeholder="instructor@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={!canInvite}
          aria-label="Instructor email address"
        />
        <button
          className="btn btn--blue btn--sm"
          type="button"
          onClick={handleSubmit}
          disabled={!canInvite || sending || !email.trim() || !organizationId}
        >
          {sending ? 'Sending...' : 'Send invite'}
        </button>
      </div>

      <label className="sv-field">
        <span className="sv-field__label">Custom message</span>
        <textarea
          className="sv-textarea"
          rows={4}
          value={customMessage}
          onChange={(event) => setCustomMessage(event.target.value)}
          placeholder="Optional context to include in the invitation email."
          disabled={!canInvite}
        />
      </label>

      {!canInvite && (
        <p className="sv-inline-note">Only creators, managers, or the course creator can invite instructors.</p>
      )}
      {error && (
        <p className="sv-inline-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}


function EnrollmentInviteForm({
  token,
  courseId,
  manageableOrganizations,
  canInvite,
  onSent,
}: {
  token: string
  courseId: string
  manageableOrganizations: OrganizationOption[]
  canInvite: boolean
  onSent: () => void
}) {
  const [email, setEmail] = useState('')
  const [customMessage, setCustomMessage] = useState('')
  const [organizationId, setOrganizationId] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!organizationId && manageableOrganizations.length > 0) {
      setOrganizationId(manageableOrganizations[0].id)
    }
  }, [manageableOrganizations, organizationId])

  const handleSubmit = async () => {
    if (!email.trim() || !canInvite || !organizationId) return
    setSending(true)
    setError(null)
    try {
      await sendCourseEnrollmentInvitation(token, courseId, {
        invited_email: email.trim(),
        custom_message: customMessage.trim(),
        organization_id: organizationId,
      })
      setEmail('')
      setCustomMessage('')
      onSent()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to send enrollment invitation.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="sv-course-composer">
      <div className="sv-panel__head">
        <div>
          <div className="sv-panel__title">Invite students</div>
          <div className="sv-panel__sub">
            Send a course-specific invite without requiring the student to join the organization first.
          </div>
        </div>
      </div>

      {manageableOrganizations.length > 0 && (
        <label className="sv-field" style={{ marginBottom: 12 }}>
          <span className="sv-field__label">Sending organization</span>
          <select
            className="sv-select"
            value={organizationId}
            onChange={(event) => setOrganizationId(event.target.value)}
            disabled={!canInvite}
          >
            {manageableOrganizations.map((organization) => (
              <option key={organization.id} value={organization.id}>
                {organization.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="sv-invite-form" style={{ marginBottom: 12 }}>
        <input
          className="sv-input"
          type="email"
          placeholder="student@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={!canInvite}
          aria-label="Instructor email address"
        />
        <button
          className="btn btn--blue btn--sm"
          type="button"
          onClick={handleSubmit}
          disabled={!canInvite || sending || !email.trim() || !organizationId}
        >
          {sending ? 'Sending...' : 'Send invite'}
        </button>
      </div>

      <label className="sv-field">
        <span className="sv-field__label">Custom message</span>
        <textarea
          className="sv-textarea"
          rows={4}
          value={customMessage}
          onChange={(event) => setCustomMessage(event.target.value)}
          placeholder="Optional context to include in the invitation email."
          disabled={!canInvite}
        />
      </label>

      {!canInvite && (
        <p className="sv-inline-note">Only creators, managers, or the course creator can invite students.</p>
      )}
      {error && (
        <p className="sv-inline-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}


export function CourseDetailPage({ token }: { token: string }) {
  const { courseId } = useParams<{ courseId: string }>()
  const [data, setData] = useState<CourseManagementData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<CourseManagementTab>('details')
  const [isEditingOutline, setIsEditingOutline] = useState(false)
  const [outlinePhases, setOutlinePhases] = useState<EditableCoursePhase[]>([])
  const [outlineSaving, setOutlineSaving] = useState(false)
  const [outlineError, setOutlineError] = useState<string | null>(null)

  const load = () => {
    if (!courseId) return
    setLoading(true)
    setError(null)
    fetchCourseManagement(token, courseId)
      .then((nextData) => {
        setData(nextData)
        setOutlinePhases(normalizeEditablePhases(nextData.course.phases))
      })
      .catch((loadError: Error) => setError(loadError.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [token, courseId])

  const handleOutlineCancel = () => {
    if (!data) return
    setOutlinePhases(normalizeEditablePhases(data.course.phases))
    setOutlineError(null)
    setIsEditingOutline(false)
  }

  const handleOutlineSave = async () => {
    if (!data || !courseId) return
    setOutlineSaving(true)
    setOutlineError(null)
    try {
      await updateCourse(token, courseId, {
        title: data.course.title,
        description: data.course.description,
        categoryIds: data.course.categories.map((category) => category.id),
        organizationIds: data.course.organizations.map((organization) => organization.id),
        is_visible: data.course.is_visible,
        privacy: data.course.privacy,
        price_type: data.course.price_type,
        phaseData: serializePhasesForPayload(outlinePhases),
      })
      setIsEditingOutline(false)
      load()
    } catch (saveError) {
      setOutlineError(saveError instanceof Error ? saveError.message : 'Failed to save course outline.')
    } finally {
      setOutlineSaving(false)
    }
  }

  if (loading) {
    return (
      <div>
        <div className="sv-skeleton" style={{ height: 26, width: 260, marginBottom: 8 }} />
        <div className="sv-skeleton" style={{ height: 14, width: 220, marginBottom: 24 }} />
        <div className="sv-metrics">
          {[1, 2].map((index) => (
            <div key={index} className="sv-metric">
              <div className="sv-skeleton" style={{ height: 56 }} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="sv-empty">
        <div className="sv-empty__icon" aria-hidden>!</div>
        <div className="sv-empty__title">Failed to load course</div>
        <div className="sv-empty__sub">{error}</div>
      </div>
    )
  }

  if (!data || !courseId) return null

  const {
    course,
    instructors,
    instructor_invitations,
    manageable_organizations,
    permissions,
    stats,
    enrollments,
    enrollment_invitations,
  } = data;
  const canManageCourse = permissions.can_manage_course
  const visibleTab: CourseManagementTab = canManageCourse ? activeTab : 'details'

  return (
    <>
      <div className="sv-page-header">
        <div className="sv-breadcrumb-link">
          <Link to="/dashboard/courses" className="sv-panel__action">
            Back to courses
          </Link>
        </div>
        <h1 className="sv-page-header__title">{course.title}</h1>
        <p className="sv-page-header__sub">
          Manage core course details now, with room for more course operations
          later.
        </p>
      </div>

      <div className="sv-metrics" style={{ marginBottom: 16 }}>
        <div className="sv-metric">
          <div className="sv-metric__header">
            <span className="sv-metric__label">Instructors</span>
            <span className="sv-metric__icon" aria-hidden>
              <Icon.Users />
            </span>
          </div>
          <div className="sv-metric__value">{stats.instructor_count}</div>
          <div className="sv-metric__note">Assigned to this course</div>
        </div>
        {canManageCourse && (
          <div className="sv-metric">
            <div className="sv-metric__header">
              <span className="sv-metric__label">Pending invites</span>
              <span className="sv-metric__icon" aria-hidden>
                <Icon.Mail />
              </span>
            </div>
            <div className="sv-metric__value">
              {stats.pending_instructor_invitation_count}
            </div>
            <div className="sv-metric__note">Awaiting response</div>
          </div>
        )}
      </div>

      <CourseTabs activeTab={visibleTab} onChange={setActiveTab} canManageCourse={canManageCourse} />

      {visibleTab === "details" && (
        <>
          <div className="sv-grid">
            <div className="sv-panel">
              <div className="sv-panel__head">
                <span className="sv-panel__title">Course details</span>
                <span
                  className={`sv-role-badge sv-role-badge--${permissions.role.toLowerCase()}`}
                >
                  {permissions.role}
                </span>
              </div>
              <div className="sv-course-detail-hero">
                <div className="sv-course-detail-hero__media">
                  {course.thumbnail ? (
                    <img
                      src={course.thumbnail}
                      alt={course.title}
                      className="sv-course-card__image"
                    />
                  ) : (
                    <div className="sv-course-card__placeholder" aria-hidden>
                      <Icon.Chart />
                    </div>
                  )}
                </div>
                <div className="sv-course-detail-hero__body">
                  <div className="sv-course-detail-hero__title">
                    {course.title}
                  </div>
                  <div className="sv-tag-group" style={{ marginTop: 10 }}>
                    <span className="sv-tag">{course.is_visible ? 'Visible' : 'Hidden'}</span>
                    <span className="sv-tag">{course.is_public ? 'Public' : 'Private'}</span>
                    <span className="sv-tag">{course.is_free ? 'Free' : 'Paid'}</span>
                  </div>
                  <p className="sv-course-card__description">
                    {course.description ||
                      "No description has been added for this course yet."}
                  </p>
                </div>
              </div>

              <div
                className="sv-grid-2"
                style={{ marginTop: 14, marginBottom: 0 }}
              >
                <div className="sv-selector-card" style={{ marginTop: 0 }}>
                  <div className="sv-selector-card__title">Categories</div>
                  <div className="sv-tag-group" style={{ marginTop: 12 }}>
                    {course.categories.length > 0 ? (
                      course.categories.map((category) => (
                        <span key={category.id} className="sv-tag">
                          {category.name}
                        </span>
                      ))
                    ) : (
                      <span className="sv-inline-note">
                        No categories assigned.
                      </span>
                    )}
                  </div>
                </div>

                <div className="sv-selector-card" style={{ marginTop: 0 }}>
                  <div className="sv-selector-card__title">Organizations</div>
                  <div
                    className="sv-course-card__orgs"
                    style={{ marginTop: 12 }}
                  >
                    {course.organizations.length > 0 ? (
                      course.organizations.map((organization) => (
                        <span key={organization.id} className="sv-mini-pill">
                          {organization.name}
                        </span>
                      ))
                    ) : (
                      <span className="sv-inline-note">
                        No organizations linked.
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="sv-selector-card" style={{ marginTop: 14 }}>
                <div className="sv-panel__head" style={{ marginBottom: 8 }}>
                  <div>
                    <div className="sv-selector-card__title">Course outline</div>
                    <div className="sv-selector-card__sub">
                      Browse the learning structure by phase, section, subsection, and lesson content without opening the entire course at once.
                    </div>
                  </div>
                  {canManageCourse && !isEditingOutline && (
                    <button className="btn btn--ghost btn--sm" type="button" onClick={() => setIsEditingOutline(true)}>
                      Edit outline
                    </button>
                  )}
                </div>

                {isEditingOutline ? (
                  <>
                    <CourseOutlineEditor
                      phases={outlinePhases}
                      onChange={setOutlinePhases}
                      disabled={outlineSaving}
                    />
                    <div className="sv-form-actions">
                      <button
                        className="btn btn--blue btn--sm"
                        type="button"
                        onClick={handleOutlineSave}
                        disabled={outlineSaving}
                      >
                        {outlineSaving ? 'Saving...' : 'Save outline'}
                      </button>
                      <button
                        className="btn btn--ghost btn--sm"
                        type="button"
                        onClick={handleOutlineCancel}
                        disabled={outlineSaving}
                      >
                        Cancel
                      </button>
                    </div>
                    {outlineError && (
                      <p className="sv-inline-error" role="alert">
                        {outlineError}
                      </p>
                    )}
                  </>
                ) : (
                  <div style={{ marginTop: 12 }}>
                    <CourseOutlinePreview
                      phases={course.phases}
                      emptyMessage="No phases or sections have been added to this course yet."
                    />
                  </div>
                )}
              </div>
            </div>

          </div>
        </>
      )}

      {visibleTab === "instructors" && (
        <>
          <div className="sv-grid-2">
            <div className="sv-panel">
              <div className="sv-panel__head">
                <span className="sv-panel__title">Instructors</span>
                <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                  {instructors.length} assigned
                </span>
              </div>
              {instructors.length === 0 ? (
                <div className="sv-empty" style={{ padding: "24px 0" }}>
                  <div className="sv-empty__icon" aria-hidden>
                    <Icon.Users />
                  </div>
                  <div className="sv-empty__title">No instructors assigned</div>
                  <div className="sv-empty__sub">
                    Accepted instructor invitations will show up here.
                  </div>
                </div>
              ) : (
                <div className="sv-table-wrap">
                  <table className="sv-table" aria-label="Course instructors">
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Role</th>
                        <th>Joined</th>
                      </tr>
                    </thead>
                    <tbody>
                      {instructors.map((assignment) => (
                        <InstructorRow
                          key={assignment.id}
                          assignment={assignment}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="sv-panel">
              <InstructorInviteForm
                token={token}
                courseId={courseId}
                manageableOrganizations={manageable_organizations}
                canInvite={permissions.can_invite_instructors}
                onSent={load}
              />
            </div>
          </div>

          <div className="sv-grid">


            <div className="sv-panel">
              <div className="sv-panel__head">
                <span className="sv-panel__title">Instructor invitations</span>
                <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                  {instructor_invitations.length} sent
                </span>
              </div>
              {instructor_invitations.length === 0 ? (
                <div className="sv-empty" style={{ padding: "24px 0" }}>
                  <div className="sv-empty__icon" aria-hidden>
                    <Icon.Mail />
                  </div>
                  <div className="sv-empty__title">
                    No instructor invitations yet
                  </div>
                  <div className="sv-empty__sub">
                    Invite instructors from the panel above when you are ready.
                  </div>
                </div>
              ) : (
                <div className="sv-table-wrap">
                  <table
                    className="sv-table"
                    aria-label="Course instructor invitations"
                  >
                    <thead>
                      <tr>
                        <th>Email</th>
                        <th>Organization</th>
                        <th>Message</th>
                        <th>Sent</th>
                        <th>Expires</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {instructor_invitations.map((invitation) => (
                        <InstructorInvitationRow
                          key={invitation.id}
                          invitation={invitation}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}


      {visibleTab === "enrollments" && (
        <>
          <div className="sv-grid-2">
            <div className="sv-panel">
              <div className="sv-panel__head">
                <span className="sv-panel__title">Enrollments</span>
                <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                  {enrollments.length} enrolled
                </span>
              </div>
              {enrollments.length === 0 ? (
                <div className="sv-empty" style={{ padding: "24px 0" }}>
                  <div className="sv-empty__icon" aria-hidden>
                    <Icon.Users />
                  </div>
                  <div className="sv-empty__title">No students enrolled</div>
                  <div className="sv-empty__sub">
                    Students who enroll in this course will show up here.
                  </div>
                </div>
              ) : (
                <div className="sv-table-wrap">
                  <table className="sv-table" aria-label="Course enrollments">
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Role</th>
                        <th>Joined</th>
                      </tr>
                    </thead>
                    <tbody>
                      {enrollments.map((enrollment) => (
                        <EnrollmentRow
                          key={enrollment.id}
                          enrollment={enrollment}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="sv-panel">
              <EnrollmentInviteForm
                token={token}
                courseId={courseId}
                manageableOrganizations={manageable_organizations}
                canInvite={permissions.can_invite_enrollments}
                onSent={load}
              />
            </div>
          </div>

          <div className="sv-grid">


            <div className="sv-panel">
              <div className="sv-panel__head">
                <span className="sv-panel__title">Enrollment invitations</span>
                <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                  {enrollment_invitations.length} sent
                </span>
              </div>
              {enrollment_invitations.length === 0 ? (
                <div className="sv-empty" style={{ padding: "24px 0" }}>
                  <div className="sv-empty__icon" aria-hidden>
                    <Icon.Mail />
                  </div>
                  <div className="sv-empty__title">
                    No enrollment invitations yet
                  </div>
                  <div className="sv-empty__sub">
                    Invite students to enroll in this course from the panel above when you are ready.
                  </div>
                </div>
              ) : (
                <div className="sv-table-wrap">
                  <table
                    className="sv-table"
                    aria-label="Course enrollment invitations"
                  >
                    <thead>
                      <tr>
                        <th>Email</th>
                        <th>Organization</th>
                        <th>Message</th>
                        <th>Sent</th>
                        <th>Expires</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {enrollment_invitations.map((invitation) => (
                        <EnrollmentInvitationRow
                          key={invitation.id}
                          invitation={invitation}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}

    </>
  );
}
