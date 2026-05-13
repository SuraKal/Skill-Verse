import { useEffect, useState, type ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import {
  createOrganizationCourse,
  deleteOrganizationCourse,
  fetchOrganizationDashboard,
  sendOrganizationInvitation,
  updateOrganizationCourse,
} from '../lib/api'
import type {
  Course,
  CourseCategory,
  MembershipRecord,
  OrganizationDashboardData,
  OrganizationInvitation,
  OrganizationOption,
} from '../types'
import { Avatar, Icon } from '../components/DashboardLayout'
import '../styles/Dashboard.css'

type WorkspaceSection = 'courses' | 'invitations' | 'members'

type CourseFormState = {
  title: string
  description: string
  categoryIds: string[]
  organizationIds: string[]
  thumbnail: File | null
}

const emptyCourseForm: CourseFormState = {
  title: '',
  description: '',
  categoryIds: [],
  organizationIds: [],
  thumbnail: null,
}

function MetricCard({
  label,
  value,
  note,
  icon,
}: {
  label: string
  value: string | number
  note?: string
  icon: ReactNode
}) {
  return (
    <div className="sv-metric">
      <div className="sv-metric__header">
        <span className="sv-metric__label">{label}</span>
        <span className="sv-metric__icon" aria-hidden>{icon}</span>
      </div>
      <div className="sv-metric__value">{value}</div>
      {note && <div className="sv-metric__note">{note}</div>}
    </div>
  )
}

function MemberRow({
  record,
  canManage,
}: {
  record: MembershipRecord
  canManage: boolean
}) {
  const { user, role, created_at } = record
  const joined = new Date(created_at).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  return (
    <tr>
      <td>
        <div className="sv-table__user">
          <Avatar name={user.full_name || user.username} size="sm" />
          <div>
            <div className="sv-table__user-name">{user.full_name || user.username}</div>
            <div className="sv-table__user-email">{user.email}</div>
          </div>
        </div>
      </td>
      <td>
        <span className={`sv-role-badge sv-role-badge--${role.toLowerCase()}`}>{role}</span>
      </td>
      <td style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>{joined}</td>
      <td>
        {canManage && (
          <button className="btn btn--ghost btn--sm" aria-label={`Manage ${user.full_name || user.username}`}>
            Manage
          </button>
        )}
      </td>
    </tr>
  )
}

function InvitationRow({ inv }: { inv: OrganizationInvitation }) {
  const sent = new Date(inv.date_sent).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
  const expires = new Date(inv.expires_at).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
  const isExpired = new Date(inv.expires_at) < new Date()
  const statusKey = isExpired && inv.status === 'pending' ? 'expired' : inv.status

  return (
    <tr>
      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{inv.invited_email}</td>
      <td>
        <span className={`sv-role-badge sv-role-badge--${inv.role.toLowerCase()}`}>{inv.role}</span>
      </td>
      <td style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>{sent}</td>
      <td style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>{expires}</td>
      <td>
        <span className={`sv-status sv-status--${statusKey}`}>{statusKey}</span>
      </td>
    </tr>
  )
}

function InviteForm({
  orgId,
  token,
  onSent,
}: {
  orgId: string
  token: string
  onSent: () => void
}) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('member')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!email.trim()) return
    setSending(true)
    setError(null)
    try {
      await sendOrganizationInvitation(token, orgId, {
        invited_email: email.trim(),
        role,
      })
      setEmail('')
      onSent()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to send invitation.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div>
      <div className="sv-invite-form">
        <input
          className="sv-input"
          type="email"
          placeholder="colleague@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          aria-label="Email address to invite"
        />
        <select
          className="sv-select"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          aria-label="Role for invitation"
        >
          <option value="member">Member</option>
          <option value="manager">Manager</option>
        </select>
        <button
          className="btn btn--blue btn--sm"
          onClick={handleSubmit}
          disabled={sending || !email.trim()}
          aria-busy={sending}
        >
          {sending ? 'Sending...' : 'Send invite'}
        </button>
      </div>
      {error && (
        <p className="sv-inline-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

function PermissionsPanel({
  permissions,
}: {
  permissions: OrganizationDashboardData['permissions']
}) {
  const chips = [
    { label: 'Manage courses', active: permissions.can_manage_courses },
    { label: 'Manage invitations', active: permissions.can_manage_invitations },
    { label: 'Manage members', active: permissions.can_manage_members },
    { label: 'Manage settings', active: permissions.can_manage_settings },
  ]

  return (
    <div className="sv-panel">
      <div className="sv-panel__head">
        <span className="sv-panel__title">Your permissions</span>
        <span className={`sv-role-badge sv-role-badge--${permissions.role.toLowerCase()}`}>
          {permissions.role}
        </span>
      </div>
      <div className="sv-perm-chips">
        {chips.map((chip) => (
          <span
            key={chip.label}
            className={`sv-perm-chip${chip.active ? ' sv-perm-chip--active' : ''}`}
          >
            {chip.active ? 'Yes' : 'No'} {chip.label}
          </span>
        ))}
      </div>
    </div>
  )
}

function WorkspaceSectionNav({
  activeSection,
  onChange,
  stats,
}: {
  activeSection: WorkspaceSection
  onChange: (section: WorkspaceSection) => void
  stats: OrganizationDashboardData['stats']
}) {
  const items: Array<{ key: WorkspaceSection; label: string; count: number }> = [
    { key: 'courses', label: 'Courses', count: stats.course_count },
    { key: 'invitations', label: 'Invitations', count: stats.pending_invitation_count },
    { key: 'members', label: 'Members', count: stats.member_count },
  ]

  return (
    <div className="sv-panel" style={{ marginBottom: 12 }}>
      <div className="sv-workspace-nav">
        {items.map((item) => (
          <button
            key={item.key}
            className={`sv-workspace-nav__item${activeSection === item.key ? ' sv-workspace-nav__item--active' : ''}`}
            onClick={() => onChange(item.key)}
            type="button"
          >
            <span>{item.label}</span>
            <span className="sv-workspace-nav__count">{item.count}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function toggleSelection(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value]
}

function toCourseFormState(course: Course): CourseFormState {
  return {
    title: course.title,
    description: course.description,
    categoryIds: course.categories.map((category) => category.id),
    organizationIds: course.organizations.map((organization) => organization.id),
    thumbnail: null,
  }
}

function CourseForm({
  token,
  orgId,
  categories,
  organizations,
  canManage,
  editingCourse,
  onSaved,
  onCancel,
}: {
  token: string
  orgId: string
  categories: CourseCategory[]
  organizations: OrganizationOption[]
  canManage: boolean
  editingCourse: Course | null
  onSaved: () => void
  onCancel: () => void
}) {
  const [form, setForm] = useState<CourseFormState>(emptyCourseForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!editingCourse) {
      setForm(emptyCourseForm)
      setError(null)
      return
    }

    setForm(toCourseFormState(editingCourse))
    setError(null)
  }, [editingCourse])

  useEffect(() => {
    setForm((current) => {
      if (organizations.length === 0) return current
      const nextOrganizationIds = current.organizationIds.length > 0 ? current.organizationIds : [orgId]
      return {
        ...current,
        organizationIds: Array.from(new Set([...nextOrganizationIds, orgId])),
      }
    })
  }, [orgId, organizations])

  const isValid = form.title.trim() && form.categoryIds.length > 0 && form.organizationIds.length > 0

  const handleSubmit = async () => {
    if (!isValid || !canManage) return
    setSaving(true)
    setError(null)
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        categoryIds: form.categoryIds,
        organizationIds: Array.from(new Set([...form.organizationIds, orgId])),
        thumbnail: form.thumbnail,
      }

      if (editingCourse) {
        await updateOrganizationCourse(token, orgId, editingCourse.id, payload)
      } else {
        await createOrganizationCourse(token, orgId, payload)
      }

      setForm({
        ...emptyCourseForm,
        organizationIds: [orgId],
      })
      onSaved()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save course.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="sv-course-composer">
      <div className="sv-panel__head">
        <div>
          <div className="sv-panel__title">{editingCourse ? 'Edit course' : 'Create course'}</div>
          <div className="sv-panel__sub">
            Keep course ownership inside the organization workspace while linking it to other managed organizations when needed.
          </div>
        </div>
        {editingCourse && (
          <button className="sv-panel__action" type="button" onClick={onCancel}>
            Cancel edit
          </button>
        )}
      </div>

      <div className="sv-form-grid">
        <label className="sv-field">
          <span className="sv-field__label">Title</span>
          <input
            className="sv-input"
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Advanced Product Onboarding"
            disabled={!canManage}
          />
        </label>

        <label className="sv-field">
          <span className="sv-field__label">Thumbnail</span>
          <input
            className="sv-input"
            type="file"
            accept="image/*"
            onChange={(e) => setForm({ ...form, thumbnail: e.target.files?.[0] ?? null })}
            disabled={!canManage}
          />
        </label>
      </div>

      <label className="sv-field" style={{ marginTop: 12 }}>
        <span className="sv-field__label">Description</span>
        <textarea
          className="sv-textarea"
          rows={4}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Add a short course summary for this organization."
          disabled={!canManage}
        />
      </label>

      <div className="sv-grid-2" style={{ marginBottom: 0 }}>
        <div className="sv-selector-card">
          <div className="sv-selector-card__title">Categories</div>
          <div className="sv-selector-card__sub">Assign one or more seeded categories.</div>
          <div className="sv-check-grid">
            {categories.map((category) => (
              <label key={category.id} className="sv-check">
                <input
                  type="checkbox"
                  checked={form.categoryIds.includes(category.id)}
                  onChange={() =>
                    setForm((current) => ({
                      ...current,
                      categoryIds: toggleSelection(current.categoryIds, category.id),
                    }))
                  }
                  disabled={!canManage}
                />
                <span>{category.name}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="sv-selector-card">
          <div className="sv-selector-card__title">Organizations</div>
          <div className="sv-selector-card__sub">The current organization stays attached automatically.</div>
          <div className="sv-check-grid">
            {organizations.map((organization) => (
              <label key={organization.id} className="sv-check">
                <input
                  type="checkbox"
                  checked={form.organizationIds.includes(organization.id)}
                  onChange={() =>
                    setForm((current) => ({
                      ...current,
                      organizationIds: toggleSelection(
                        organization.id === orgId
                          ? Array.from(new Set([...current.organizationIds, orgId]))
                          : current.organizationIds,
                        organization.id,
                      ),
                    }))
                  }
                  disabled={!canManage || organization.id === orgId}
                />
                <span>{organization.name}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="sv-form-actions">
        <button
          className="btn btn--blue btn--sm"
          type="button"
          onClick={handleSubmit}
          disabled={!canManage || saving || !isValid}
        >
          {saving ? 'Saving...' : editingCourse ? 'Update course' : 'Create course'}
        </button>
        {form.thumbnail && <span className="sv-file-pill">{form.thumbnail.name}</span>}
      </div>

      {!canManage && (
        <p className="sv-inline-note">Only creators and managers can create or edit courses.</p>
      )}
      {error && (
        <p className="sv-inline-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

function CourseCard({
  course,
  canManage,
  onEdit,
  onDelete,
}: {
  course: Course
  canManage: boolean
  onEdit: (course: Course) => void
  onDelete: (course: Course) => void
}) {
  return (
    <article className="sv-course-card">
      <div className="sv-course-card__media">
        {course.thumbnail ? (
          <img src={course.thumbnail} alt={course.title} className="sv-course-card__image" />
        ) : (
          <div className="sv-course-card__placeholder" aria-hidden>
            <Icon.Building />
          </div>
        )}
      </div>
      <div className="sv-course-card__body">
        <div className="sv-course-card__header">
          <div>
            <div className="sv-course-card__title">{course.title}</div>
            <div className="sv-course-card__meta">
              Updated {new Date(course.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
          {canManage && (
            <div className="sv-course-card__actions">
              <button className="btn btn--ghost btn--sm" type="button" onClick={() => onEdit(course)}>
                Edit
              </button>
              <button className="btn btn--ghost btn--sm" type="button" onClick={() => onDelete(course)}>
                Remove
              </button>
            </div>
          )}
        </div>
        <p className="sv-course-card__description">{course.description || 'No description added yet.'}</p>
        <div className="sv-tag-group">
          {course.categories.map((category) => (
            <span key={category.id} className="sv-tag">
              {category.name}
            </span>
          ))}
        </div>
        <div className="sv-course-card__orgs">
          {course.organizations.map((organization) => (
            <span key={organization.id} className="sv-mini-pill">
              {organization.name}
            </span>
          ))}
        </div>
      </div>
    </article>
  )
}

export function OrgDashboardPage({ token }: { token: string }) {
  const { organizationId } = useParams<{ organizationId: string }>()
  const [data, setData] = useState<OrganizationDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState<WorkspaceSection>('courses')
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)
  const [courseActionError, setCourseActionError] = useState<string | null>(null)

  const load = () => {
    if (!organizationId) return
    setLoading(true)
    setError(null)
    fetchOrganizationDashboard(token, organizationId)
      .then((nextData) => {
        setData(nextData)
        if (editingCourse) {
          const refreshed = nextData.courses.find((course) => course.id === editingCourse.id) ?? null
          setEditingCourse(refreshed)
        }
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [token, organizationId])

  if (loading) {
    return (
      <div>
        <div className="sv-skeleton" style={{ height: 26, width: 280, marginBottom: 8 }} />
        <div className="sv-skeleton" style={{ height: 14, width: 200, marginBottom: 24 }} />
        <div className="sv-metrics">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="sv-metric">
              <div className="sv-skeleton" style={{ height: 60 }} />
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
        <div className="sv-empty__title">Failed to load organization</div>
        <div className="sv-empty__sub">{error}</div>
      </div>
    )
  }

  if (!data || !organizationId) return null

  const { organization, members, invitations, courses, permissions, stats, course_categories, manageable_organizations } = data
  const canInvite = permissions.can_manage_invitations
  const canManageMembers = permissions.can_manage_members
  const canManageCourses = permissions.can_manage_courses
  const organizationOptions = manageable_organizations.some((item) => item.id === organizationId)
    ? manageable_organizations
    : [{ id: organizationId, name: organization.name }, ...manageable_organizations]

  const handleDeleteCourse = async (course: Course) => {
    const confirmed = window.confirm(`Remove "${course.title}" from ${organization.name}?`)
    if (!confirmed) return

    try {
      setCourseActionError(null)
      await deleteOrganizationCourse(token, organizationId, course.id)
      if (editingCourse?.id === course.id) {
        setEditingCourse(null)
      }
      load()
    } catch (e: unknown) {
      setCourseActionError(e instanceof Error ? e.message : 'Failed to remove course.')
    }
  }

  return (
    <>
      <div className="sv-page-header">
        <h1 className="sv-page-header__title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {organization.name}
          {organization.is_verified && (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-label="Verified">
              <circle cx="9" cy="9" r="8.5" fill="#0070f3" />
              <path d="M5.5 9l2.5 2.5 4.5-5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </h1>
        <p className="sv-page-header__sub">
          {organization.description || organization.email || 'Run courses, invitations, and team operations from one workspace dashboard.'}
        </p>
      </div>

      <div className="sv-metrics" style={{ marginBottom: 16 }}>
        <MetricCard label="Courses" value={stats.course_count} note="Active in this workspace" icon={<Icon.Chart />} />
        <MetricCard
          label="Pending invites"
          value={stats.pending_invitation_count}
          note={stats.pending_invitation_count === 0 ? 'None pending' : 'Awaiting response'}
          icon={<Icon.Mail />}
        />
        <MetricCard label="Members" value={stats.member_count} note="Total workspace members" icon={<Icon.Users />} />
        <MetricCard label="Managers" value={stats.manager_count} note="Can run operations" icon={<Icon.Settings />} />
      </div>

      <div className="sv-grid-2">
        <PermissionsPanel permissions={permissions} />
        <div className="sv-panel">
          <div className="sv-panel__head">
            <span className="sv-panel__title">Workspace operating model</span>
          </div>
          <p className="sv-panel__sub">
            Use section switching below to keep the organization dashboard clean as more modules like events and community land here later.
          </p>
          <div className="sv-tag-group" style={{ marginTop: 14 }}>
            <span className="sv-tag">Courses</span>
            <span className="sv-tag">Invitations</span>
            <span className="sv-tag">Members</span>
          </div>
        </div>
      </div>

      <WorkspaceSectionNav activeSection={activeSection} onChange={setActiveSection} stats={stats} />

      {activeSection === 'courses' && (
        <div className="sv-grid-2">
          <div className="sv-panel">
            <CourseForm
              token={token}
              orgId={organizationId}
              categories={course_categories}
              organizations={organizationOptions}
              canManage={canManageCourses}
              editingCourse={editingCourse}
              onSaved={() => {
                setEditingCourse(null)
                load()
              }}
              onCancel={() => setEditingCourse(null)}
            />
          </div>

          <div className="sv-panel">
            <div className="sv-panel__head">
              <span className="sv-panel__title">Course library</span>
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{courses.length} linked</span>
            </div>
            {courseActionError && (
              <p className="sv-inline-error" role="alert">
                {courseActionError}
              </p>
            )}
            {courses.length === 0 ? (
              <div className="sv-empty" style={{ padding: '32px 0' }}>
                <div className="sv-empty__icon" aria-hidden><Icon.Chart /></div>
                <div className="sv-empty__title">No courses yet</div>
                <div className="sv-empty__sub">Create the first course for this organization from the panel on the left.</div>
              </div>
            ) : (
              <div className="sv-course-list">
                {courses.map((course) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    canManage={canManageCourses}
                    onEdit={(nextCourse) => setEditingCourse(nextCourse)}
                    onDelete={handleDeleteCourse}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeSection === 'invitations' && (
        <div className="sv-panel">
          <div className="sv-panel__head">
            <span className="sv-panel__title">Invitations</span>
            <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{invitations.length} sent</span>
          </div>

          {canInvite && (
            <>
              <InviteForm orgId={organizationId} token={token} onSent={load} />
              <div className="sv-divider" />
            </>
          )}

          {invitations.length === 0 ? (
            <div className="sv-empty" style={{ padding: '20px 0' }}>
              <div className="sv-empty__icon" aria-hidden><Icon.Mail /></div>
              <div className="sv-empty__title">No invitations sent</div>
              <div className="sv-empty__sub">Invite team members into this workspace when you are ready.</div>
            </div>
          ) : (
            <div className="sv-table-wrap">
              <table className="sv-table" aria-label="Organization invitations">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Sent</th>
                    <th>Expires</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {invitations.map((inv) => (
                    <InvitationRow key={inv.id} inv={inv} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeSection === 'members' && (
        <div className="sv-panel">
          <div className="sv-panel__head">
            <span className="sv-panel__title">Members</span>
            <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{members.length} total</span>
          </div>
          {members.length === 0 ? (
            <div className="sv-empty" style={{ padding: '20px 0' }}>
              <div className="sv-empty__icon" aria-hidden><Icon.Users /></div>
              <div className="sv-empty__title">No members yet</div>
            </div>
          ) : (
            <div className="sv-table-wrap">
              <table className="sv-table" aria-label="Organization members">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Joined</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => (
                    <MemberRow key={member.id} record={member} canManage={canManageMembers} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </>
  )
}
