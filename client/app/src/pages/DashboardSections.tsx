import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import {
  acceptInvitation,
  createOrganization,
  fetchDashboard,
  fetchOrganizationDashboard,
  fetchPublicBootstrap,
  rejectInvitation,
  switchOrganization,
  updateProfile,
} from '../lib/api'
import { Avatar, Icon, initials } from '../components/DashboardLayout'
import '../styles/Dashboard.css'
import '../styles/LandingPage.css'
import '../styles/SitePages.css'
import type {
  DashboardData,
  InvitationDetail,
  LoginResponse,
  Organization,
  OrganizationDashboardData,
  PlatformBootstrap,
  UserProfileUpdatePayload,
} from '../types'

function SectionIntro({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string
  title: string
  description: string
}) {
  return (
    <div className="sv-page-header">
      <p className="sv-section__eyebrow">{eyebrow}</p>
      <h1 className="sv-page-header__title">{title}</h1>
      <p className="sv-page-header__sub">{description}</p>
    </div>
  )
}

function ShowcaseCard({
  title,
  value,
  note,
}: {
  title: string
  value: string
  note: string
}) {
  return (
    <div className="sv-showcase-stat">
      <span className="sv-showcase-stat__label">{title}</span>
      <strong className="sv-showcase-stat__value">{value}</strong>
      <span className="sv-showcase-stat__note">{note}</span>
    </div>
  )
}

function WorkspaceSummary({
  organization,
  role,
  onOpen,
  onSwitch,
  isActive,
}: {
  organization: Organization
  role: string
  onOpen: () => void
  onSwitch: () => void
  isActive: boolean
}) {
  return (
    <article className={`sv-workspace-card${isActive ? ' sv-workspace-card--active' : ''}`}>
      <div className="sv-workspace-card__top">
        <div className="sv-org-card__icon">{initials(organization.name)}</div>
        <div>
          <h3 className="sv-workspace-card__title">{organization.name}</h3>
          <p className="sv-workspace-card__meta">{organization.email}</p>
        </div>
      </div>
      <p className="sv-workspace-card__desc">
        {organization.description || 'A clean workspace for courses, instructors, and team operations.'}
      </p>
      <div className="sv-workspace-card__footer">
        <span className={`sv-role-badge sv-role-badge--${role.toLowerCase()}`}>{role}</span>
        <span className="sv-workspace-card__count">
          {organization.member_count ?? 0} members
        </span>
      </div>
      <div className="sv-workspace-card__actions">
        <button className="btn btn--ghost btn--sm" onClick={onOpen}>
          Open dashboard
        </button>
        {!isActive && (
          <button className="btn btn--blue btn--sm" onClick={onSwitch}>
            Set active
          </button>
        )}
      </div>
    </article>
  )
}

export function OrganizationsShowcasePage() {
  const [bootstrap, setBootstrap] = useState<PlatformBootstrap | null>(null)

  useEffect(() => {
    fetchPublicBootstrap().then(setBootstrap).catch(() => setBootstrap(null))
  }, [])

  const platformName = bootstrap?.platform_name ?? 'SkillVerse'
  const modules = bootstrap?.modules ?? []

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
          <Link className="btn btn--ghost" to="/login">
            Sign in
          </Link>
          <Link className="btn btn--solid" to="/register">
            Get started
          </Link>
        </div>
      </header>

      <main className="sv-public-main">
        <section className="sv-showcase-hero">
          <div>
            <p className="sv-section__eyebrow">Workspace design system</p>
            <h1 className="sv-showcase-hero__title">Explore the operating system behind modern learning teams.</h1>
            <p className="sv-showcase-hero__sub">
              Every workspace is built around the same polished shell from the main app:
              strong hierarchy, clear metrics, and fast paths for organizations.
            </p>
            <div className="sv-hero__ctas">
              <Link className="btn btn--primary" to="/register">
                Create a workspace
              </Link>
              <Link className="btn btn--outline" to="/login">
                Enter dashboard
              </Link>
            </div>
          </div>

          <div className="sv-showcase-panel">
            <div className="sv-showcase-grid">
              <ShowcaseCard title="Launch speed" value="3 min" note="to first workspace" />
              <ShowcaseCard title="Visibility" value="24/7" note="for members and invites" />
              <ShowcaseCard title="Flow" value="Unified" note="across landing, auth, and dashboard" />
            </div>
            <div className="sv-showcase-modules">
              {modules.slice(0, 4).map((module) => (
                <article key={module.name} className="sv-module-card">
                  <div className="sv-module-card__header">
                    <h3 className="sv-module-card__name">{module.name}</h3>
                    <span className={`sv-badge sv-badge--${module.status}`}>{module.status}</span>
                  </div>
                  <p className="sv-module-card__desc">{module.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export function AnalyticsPage({
  token,
  dashboard,
}: {
  token: string
  dashboard: DashboardData | null
}) {
  const [data, setData] = useState<DashboardData | null>(dashboard)

  useEffect(() => {
    if (!dashboard) {
      fetchDashboard(token).then(setData).catch(() => setData(null))
    }
  }, [dashboard, token])

  const organizations = data?.organizations ?? []
  const invitations = data?.pending_invitations ?? []
  const memberships = data?.memberships ?? []
  const verifiedCount = organizations.filter((organization) => organization.is_verified).length

  return (
    <>
      <SectionIntro
        eyebrow="Performance snapshot"
        title="A quick read on your network"
        description="High-level signals for the organizations, access, and collaboration activity connected to your account."
      />

      <div className="sv-grid-3">
        <div className="sv-panel">
          <span className="sv-panel__title">Verified organizations</span>
          <div className="sv-analytics-number">{verifiedCount}</div>
          <p className="sv-page-header__sub">Teams with a verified workspace identity.</p>
        </div>
        <div className="sv-panel">
          <span className="sv-panel__title">Average members</span>
          <div className="sv-analytics-number">
            {organizations.length
              ? Math.round(
                  organizations.reduce(
                    (sum, organization) => sum + (organization.member_count ?? 0),
                    0,
                  ) / organizations.length,
                )
              : 0}
          </div>
          <p className="sv-page-header__sub">Typical team size across your workspaces.</p>
        </div>
        <div className="sv-panel">
          <span className="sv-panel__title">Pending actions</span>
          <div className="sv-analytics-number">{invitations.length + memberships.length}</div>
          <p className="sv-page-header__sub">Invitations plus active membership relationships.</p>
        </div>
      </div>

      <div className="sv-grid-2">
        <div className="sv-panel">
          <div className="sv-panel__head">
            <span className="sv-panel__title">Organization spread</span>
          </div>
          <div className="sv-analytics-stack">
            {organizations.slice(0, 5).map((organization) => (
              <div key={organization.id} className="sv-analytics-row">
                <div>
                  <strong>{organization.name}</strong>
                  <p>{organization.description || organization.email}</p>
                </div>
                <span>{organization.member_count ?? 0} members</span>
              </div>
            ))}
            {organizations.length === 0 && (
              <div className="sv-empty" style={{ padding: '20px 0' }}>
                <div className="sv-empty__title">No organization analytics yet</div>
              </div>
            )}
          </div>
        </div>

        <div className="sv-panel">
          <div className="sv-panel__head">
            <span className="sv-panel__title">What to do next</span>
          </div>
          <div className="sv-analytics-stack">
            <div className="sv-insight-card">
              <span className="sv-status sv-status--accepted">Profile</span>
              <p>Keep your profile updated so teammates instantly recognize who owns each workspace.</p>
            </div>
            <div className="sv-insight-card">
              <span className="sv-status sv-status--pending">Invitations</span>
              <p>Clear pending invites quickly to keep the collaboration pipeline clean.</p>
            </div>
            <div className="sv-insight-card">
              <span className="sv-status sv-status--accepted">Expansion</span>
              <p>Spin up a fresh organization for each training brand, client, or internal academy.</p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export function OrganizationsPage({
  token,
  onSession,
}: {
  token: string
  onSession: (session: LoginResponse) => void
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', email: '', description: '' })

  const loadDashboard = () => {
    setLoading(true)
    setError(null)
    fetchDashboard(token)
      .then(setData)
      .catch((loadError) =>
        setError(loadError instanceof Error ? loadError.message : 'Unable to load organizations.'),
      )
      .finally(() => setLoading(false))
  }

  useEffect(loadDashboard, [token])

  const showCreate = new URLSearchParams(location.search).get('intent') === 'create'

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setCreateError(null)
    setCreating(true)

    try {
      await createOrganization(token, {
        name: form.name.trim(),
        email: form.email.trim(),
        description: form.description.trim(),
      })
      setForm({ name: '', email: '', description: '' })
      loadDashboard()
    } catch (creationError) {
      setCreateError(
        creationError instanceof Error
          ? creationError.message
          : 'Unable to create organization.',
      )
    } finally {
      setCreating(false)
    }
  }

  const handleSwitch = async (organizationId: string) => {
    await switchOrganization(token, organizationId)
    loadDashboard()

    const cachedUser = localStorage.getItem('session_user')
    if (cachedUser) {
      try {
        const user = JSON.parse(cachedUser) as LoginResponse['user']
        onSession({
          access: localStorage.getItem('access_token') ?? token,
          refresh: localStorage.getItem('refresh_token') ?? '',
          user: {
            ...user,
            profile: {
              ...user.profile,
              active_organization_id: organizationId,
            },
          },
        })
      } catch {
        // Ignore stale cached user values.
      }
    }
  }

  const organizations = data?.organizations ?? []

  return (
    <>
      <SectionIntro
        eyebrow="Workspace control"
        title="Manage your organizations"
        description="Open an existing workspace, change your active organization, or create a fresh environment for a new training program."
      />

      <div className="sv-grid-2">
        <div className="sv-panel">
          <div className="sv-panel__head">
            <span className="sv-panel__title">Your workspaces</span>
            <span className="sv-page-header__sub">{organizations.length} total</span>
          </div>

          {loading && (
            <div className="sv-empty" style={{ padding: '30px 0' }}>
              <div className="sv-empty__title">Loading organizations...</div>
            </div>
          )}

          {error && (
            <div className="sv-empty" style={{ padding: '30px 0' }}>
              <div className="sv-empty__title">{error}</div>
            </div>
          )}

          {!loading && !error && (
            <div className="sv-workspace-grid">
              {organizations.map((organization) => {
                const membership = data?.memberships.find(
                  (item) => item.organization_id === organization.id,
                )
                const role = membership?.role ?? organization.membership_role ?? 'member'

                return (
                  <WorkspaceSummary
                    key={organization.id}
                    organization={organization}
                    role={role}
                    isActive={data?.active_organization?.id === organization.id}
                    onOpen={() => navigate(`/dashboard/organizations/${organization.id}`)}
                    onSwitch={() => void handleSwitch(organization.id)}
                  />
                )
              })}
            </div>
          )}
        </div>

        <div className="sv-panel">
          <div className="sv-panel__head">
            <span className="sv-panel__title">Create a new workspace</span>
            {showCreate && <span className="sv-status sv-status--accepted">Focused</span>}
          </div>

          <form className="sv-dashboard-form" onSubmit={handleCreate}>
            <label className="sv-field">
              <span>Organization name</span>
              <input
                className="sv-input"
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="Northwind Academy"
                required
              />
            </label>

            <label className="sv-field">
              <span>Workspace email</span>
              <input
                className="sv-input"
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm((current) => ({ ...current, email: event.target.value }))
                }
                placeholder="academy@northwind.com"
                required
              />
            </label>

            <label className="sv-field">
              <span>Description</span>
              <textarea
                className="sv-input sv-input--textarea"
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
                placeholder="Describe the audience, team, or learning focus for this workspace."
                rows={5}
              />
            </label>

            {createError && <div className="sv-auth__error">{createError}</div>}

            <button className="btn btn--blue" type="submit" disabled={creating}>
              {creating ? 'Creating...' : 'Create organization'}
            </button>
          </form>
        </div>
      </div>
    </>
  )
}

export function InvitationsPage({
  token,
  onSession,
}: {
  token: string
  onSession: (session: LoginResponse) => void
}) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [workingId, setWorkingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = () => {
    fetchDashboard(token).then(setData).catch(() => setData(null))
  }

  useEffect(load, [token])

  const handleAction = async (invitation: InvitationDetail, action: 'accept' | 'reject') => {
    if (!invitation.id) {
      return
    }

    setWorkingId(invitation.id)
    setError(null)

    try {
      if (action === 'accept') {
        await acceptInvitation(token, invitation.id)
      } else {
        await rejectInvitation(invitation.id)
      }

      load()

      const cachedUser = localStorage.getItem('session_user')
      if (cachedUser) {
        try {
          const user = JSON.parse(cachedUser) as LoginResponse['user']
          onSession({
            access: localStorage.getItem('access_token') ?? token,
            refresh: localStorage.getItem('refresh_token') ?? '',
            user,
          })
        } catch {
          // Ignore invalid cache.
        }
      }
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Unable to update invitation.')
    } finally {
      setWorkingId(null)
    }
  }

  const invitations = data?.pending_invitations ?? []

  return (
    <>
      <SectionIntro
        eyebrow="Access requests"
        title="Review pending invitations"
        description="Approve the organizations you want to join and keep your workspace access tidy."
      />

      {error && (
        <div className="sv-auth__error" style={{ marginBottom: 12 }}>
          {error}
        </div>
      )}

      <div className="sv-panel">
        <div className="sv-panel__head">
          <span className="sv-panel__title">Invitations waiting for you</span>
          <span className="sv-page-header__sub">{invitations.length} pending</span>
        </div>

        {invitations.length === 0 ? (
          <div className="sv-empty">
            <div className="sv-empty__title">No invitations to review</div>
            <div className="sv-empty__sub">New team invites will appear here automatically.</div>
          </div>
        ) : (
          <div className="sv-invite-list">
            {invitations.map((invitation) => (
              <div key={invitation.id} className="sv-invite-card">
                <div className="sv-invite-card__icon">
                  <Icon.Mail />
                </div>
                <div className="sv-invite-card__info">
                  <div className="sv-invite-card__org">{invitation.organization_name}</div>
                  <div className="sv-invite-card__meta">
                    {invitation.role} role · expires{' '}
                    {new Date(invitation.expires_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="sv-invite-card__actions">
                  <button
                    className="btn btn--ghost btn--sm"
                    onClick={() => void handleAction(invitation, 'reject')}
                    disabled={workingId === invitation.id}
                  >
                    Decline
                  </button>
                  <button
                    className="btn btn--blue btn--sm"
                    onClick={() => void handleAction(invitation, 'accept')}
                    disabled={workingId === invitation.id}
                  >
                    {workingId === invitation.id ? 'Updating...' : 'Accept'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

export function MembersPage({ token }: { token: string }) {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [organizationData, setOrganizationData] = useState<OrganizationDashboardData | null>(null)

  useEffect(() => {
    fetchDashboard(token)
      .then((nextDashboard) => {
        setDashboard(nextDashboard)
        if (nextDashboard.active_organization?.id) {
          return fetchOrganizationDashboard(token, nextDashboard.active_organization.id)
        }
        return null
      })
      .then(setOrganizationData)
      .catch(() => {
        setDashboard(null)
        setOrganizationData(null)
      })
  }, [token])

  const activeMembers = organizationData?.members ?? []

  return (
    <>
      <SectionIntro
        eyebrow="People directory"
        title="See who is in your active workspace"
        description="A fast directory for the current organization, paired with your wider membership footprint."
      />

      <div className="sv-grid-2">
        <div className="sv-panel">
          <div className="sv-panel__head">
            <span className="sv-panel__title">
              {organizationData?.organization.name ?? 'Active workspace'} members
            </span>
            <span className="sv-page-header__sub">{activeMembers.length} people</span>
          </div>

          <div className="sv-member-list">
            {activeMembers.map((record) => (
              <div key={record.id} className="sv-member-row">
                <div className="sv-table__user">
                  <Avatar name={record.user.full_name || record.user.username} size="sm" />
                  <div>
                    <div className="sv-table__user-name">
                      {record.user.full_name || record.user.username}
                    </div>
                    <div className="sv-table__user-email">{record.user.email}</div>
                  </div>
                </div>
                <span className={`sv-role-badge sv-role-badge--${record.role.toLowerCase()}`}>
                  {record.role}
                </span>
              </div>
            ))}

            {activeMembers.length === 0 && (
              <div className="sv-empty" style={{ padding: '20px 0' }}>
                <div className="sv-empty__title">No visible members yet</div>
              </div>
            )}
          </div>
        </div>

        <div className="sv-panel">
          <div className="sv-panel__head">
            <span className="sv-panel__title">Your membership map</span>
          </div>
          <div className="sv-member-list">
            {(dashboard?.memberships ?? []).map((membership) => (
              <div key={membership.organization_id} className="sv-member-row">
                <div>
                  <div className="sv-table__user-name">{membership.organization_name}</div>
                  <div className="sv-table__user-email">Organization relationship</div>
                </div>
                <span className={`sv-role-badge sv-role-badge--${membership.role.toLowerCase()}`}>
                  {membership.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

export function SettingsPage({
  token,
  onSession,
}: {
  token: string
  onSession: (session: LoginResponse) => void
}) {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<UserProfileUpdatePayload>({
    first_name: '',
    last_name: '',
    profile: {
      title: '',
      bio: '',
      location: '',
    },
  })

  useEffect(() => {
    fetchDashboard(token)
      .then((nextDashboard) => {
        setDashboard(nextDashboard)
        setForm({
          first_name: nextDashboard.user.first_name,
          last_name: nextDashboard.user.last_name,
          profile: {
            title: nextDashboard.user.profile?.title ?? '',
            bio: nextDashboard.user.profile?.bio ?? '',
            location: nextDashboard.user.profile?.location ?? '',
          },
        })
      })
      .catch(() => setDashboard(null))
  }, [token])

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setSaved(false)
    setError(null)

    try {
      const user = await updateProfile(token, form)
      const currentAccess = localStorage.getItem('access_token') ?? token
      const currentRefresh = localStorage.getItem('refresh_token') ?? ''
      onSession({
        access: currentAccess,
        refresh: currentRefresh,
        user,
      })
      setSaved(true)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to update profile.')
    } finally {
      setSaving(false)
    }
  }

  const activeOrgName = dashboard?.active_organization?.name ?? 'No active organization selected'

  return (
    <>
      <SectionIntro
        eyebrow="Profile settings"
        title="Keep your account polished"
        description="Update the personal details that appear across workspaces and collaboration surfaces."
      />

      <div className="sv-grid-2">
        <div className="sv-panel">
          <div className="sv-panel__head">
            <span className="sv-panel__title">Public profile</span>
            {saved && <span className="sv-status sv-status--accepted">Saved</span>}
          </div>

          <form className="sv-dashboard-form" onSubmit={handleSave}>
            <div className="sv-field__row">
              <label className="sv-field">
                <span>First name</span>
                <input
                  className="sv-input"
                  value={form.first_name}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, first_name: event.target.value }))
                  }
                />
              </label>

              <label className="sv-field">
                <span>Last name</span>
                <input
                  className="sv-input"
                  value={form.last_name}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, last_name: event.target.value }))
                  }
                />
              </label>
            </div>

            <label className="sv-field">
              <span>Role or title</span>
              <input
                className="sv-input"
                value={form.profile.title}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    profile: { ...current.profile, title: event.target.value },
                  }))
                }
                placeholder="Learning Operations Lead"
              />
            </label>

            <label className="sv-field">
              <span>Location</span>
              <input
                className="sv-input"
                value={form.profile.location}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    profile: { ...current.profile, location: event.target.value },
                  }))
                }
                placeholder="Seattle, WA"
              />
            </label>

            <label className="sv-field">
              <span>Bio</span>
              <textarea
                className="sv-input sv-input--textarea"
                rows={6}
                value={form.profile.bio}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    profile: { ...current.profile, bio: event.target.value },
                  }))
                }
                placeholder="Tell your teammates what you lead, teach, or build."
              />
            </label>

            {error && <div className="sv-auth__error">{error}</div>}

            <button className="btn btn--blue" type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save profile'}
            </button>
          </form>
        </div>

        <div className="sv-panel">
          <div className="sv-panel__head">
            <span className="sv-panel__title">Account snapshot</span>
          </div>
          <div className="sv-settings-preview">
            <Avatar
              name={dashboard?.user.full_name || dashboard?.user.username || 'SkillVerse User'}
              size="lg"
            />
            <div>
              <div className="sv-settings-preview__name">
                {dashboard?.user.full_name || 'Your name'}
              </div>
              <div className="sv-table__user-email">{dashboard?.user.email ?? 'you@example.com'}</div>
            </div>
          </div>
          <div className="sv-divider" />
          <div className="sv-settings-list">
            <div className="sv-analytics-row">
              <div>
                <strong>Active workspace</strong>
                <p>{activeOrgName}</p>
              </div>
              <Icon.Building />
            </div>
            <div className="sv-analytics-row">
              <div>
                <strong>Organizations</strong>
                <p>{dashboard?.stats.organization_count ?? 0} connected</p>
              </div>
              <Icon.Users />
            </div>
            <div className="sv-analytics-row">
              <div>
                <strong>Pending invitations</strong>
                <p>{dashboard?.stats.pending_invitation_count ?? 0} awaiting action</p>
              </div>
              <Icon.Bell />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
