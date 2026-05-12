import { useEffect, useMemo, useState } from 'react'
import './App.css'
import {
  acceptInvitation,
  createOrganization,
  fetchDashboard,
  fetchInvitation,
  fetchOrganizationDashboard,
  fetchPublicBootstrap,
  loginUser,
  registerUser,
  rejectInvitation,
  sendOrganizationInvitation,
  switchOrganization,
  updateProfile,
} from './lib/api'

import type {
  DashboardData,
  InvitationDetail,
  LoginPayload,
  OrganizationDashboardData,
  PlatformBootstrap,
  RegisterPayload,
  SessionState,
  UserProfileUpdatePayload,
} from './types'
import { platformNarrative } from './data/platformContent'

type RouteMode = 'landing' | 'login' | 'register' | 'dashboard' | 'organization' | 'invite'

const SESSION_STORAGE_KEY = 'skill-verse-session'

const readSession = (): SessionState => {
  const raw = window.localStorage.getItem(SESSION_STORAGE_KEY)
  if (!raw) {
    return { access: null, refresh: null }
  }

  try {
    return JSON.parse(raw) as SessionState
  } catch {
    return { access: null, refresh: null }
  }
}

const persistSession = (session: SessionState) => {
  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
}

const clearSession = () => {
  window.localStorage.removeItem(SESSION_STORAGE_KEY)
}

const getModeFromPath = (pathname: string): RouteMode => {
  if (pathname.startsWith('/login')) return 'login'
  if (pathname.startsWith('/register')) return 'register'
  if (pathname.startsWith('/app/organizations/')) return 'organization'
  if (pathname.startsWith('/app')) return 'dashboard'
  if (pathname.startsWith('/invite/')) return 'invite'
  return 'landing'
}

const getInvitationTokenFromPath = (pathname: string) => pathname.replace('/invite/', '').split('/')[0] ?? ''

const getOrganizationIdFromPath = (pathname: string) =>
  pathname.replace('/app/organizations/', '').split('/')[0] ?? ''

function App() {
  const [mode, setMode] = useState<RouteMode>(() => getModeFromPath(window.location.pathname))
  const [session, setSession] = useState<SessionState>(() => readSession())
  const [bootstrap, setBootstrap] = useState<PlatformBootstrap | null>(null)
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [organizationDashboard, setOrganizationDashboard] = useState<OrganizationDashboardData | null>(null)
  const [invitation, setInvitation] = useState<InvitationDetail | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isBusy, setIsBusy] = useState(false)

  const isAuthenticated = Boolean(session.access)
  const nextPath = new URLSearchParams(window.location.search).get('next') ?? '/app'
  const invitationToken = mode === 'invite' ? getInvitationTokenFromPath(window.location.pathname) : ''
  const organizationId = mode === 'organization' ? getOrganizationIdFromPath(window.location.pathname) : ''

  const narrativeModules = useMemo(
    () => bootstrap?.modules?.length ? bootstrap.modules : platformNarrative.modules,
    [bootstrap],
  )

  const navigate = (path: string) => {
    window.history.pushState({}, '', path)
    setMode(getModeFromPath(window.location.pathname))
  }

  const loadDashboard = async (token: string) => {
    const response = await fetchDashboard(token)
    setDashboard(response)
    return response
  }

  const loadOrganizationDashboard = async (token: string, orgId: string) => {
    const response = await fetchOrganizationDashboard(token, orgId)
    setOrganizationDashboard(response)
    return response
  }

  useEffect(() => {
    const handlePopState = () => setMode(getModeFromPath(window.location.pathname))
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    fetchPublicBootstrap()
      .then(setBootstrap)
      .catch(() => setBootstrap(platformNarrative))
  }, [])

  useEffect(() => {
    if (!isAuthenticated) {
      setDashboard(null)
      setOrganizationDashboard(null)
      if (mode === 'dashboard' || mode === 'organization') {
        navigate(`/login?next=${encodeURIComponent(window.location.pathname || '/app')}`)
      }
      return
    }

    const token = session.access as string

    if (mode === 'login' || mode === 'register' || mode === 'landing') {
      navigate('/app')
      return
    }

    loadDashboard(token)
      .then((personalDashboard) => {
        if (mode === 'organization' && organizationId) {
          return loadOrganizationDashboard(token, organizationId)
        }

        if (mode === 'dashboard' && personalDashboard.active_organization?.id) {
          setOrganizationDashboard(null)
        }

        return null
      })
      .catch(() => {
        clearSession()
        setSession({ access: null, refresh: null })
        setErrorMessage('Your session expired. Please sign in again.')
        navigate('/login')
      })
  }, [isAuthenticated, mode, organizationId, session.access])

  useEffect(() => {
    if (mode !== 'invite' || !invitationToken) {
      setInvitation(null)
      return
    }

    fetchInvitation(invitationToken)
      .then(setInvitation)
      .catch(() => setErrorMessage('We could not load that invitation. It may have expired or already been used.'))
  }, [mode, invitationToken])

  const onLogin = async (payload: LoginPayload) => {
    setIsBusy(true)
    setErrorMessage(null)
    try {
      const response = await loginUser(payload)
      const nextSession = { access: response.access, refresh: response.refresh }
      persistSession(nextSession)
      setSession(nextSession)
      setSuccessMessage('Welcome back. Your workspace is ready.')
      navigate(nextPath)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to sign in right now.')
    } finally {
      setIsBusy(false)
    }
  }

  const onRegister = async (payload: RegisterPayload) => {
    setIsBusy(true)
    setErrorMessage(null)
    try {
      await registerUser(payload)
      setSuccessMessage('Your account has been created. Sign in to enter your workspace.')
      navigate(`/login?next=${encodeURIComponent(nextPath)}`)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to create your account right now.')
    } finally {
      setIsBusy(false)
    }
  }

  const onLogout = () => {
    clearSession()
    setSession({ access: null, refresh: null })
    setDashboard(null)
    setOrganizationDashboard(null)
    setSuccessMessage('You have been signed out.')
    navigate('/')
  }

  const refreshCurrentViews = async () => {
    if (!session.access) return
    const personal = await loadDashboard(session.access)
    if (mode === 'organization' && organizationId) {
      await loadOrganizationDashboard(session.access, organizationId)
    } else if (mode === 'dashboard' && personal.active_organization?.id) {
      setOrganizationDashboard(null)
    }
  }

  const onCreateOrganization = async (payload: { name: string; email: string; description: string }) => {
    if (!session.access) return
    setIsBusy(true)
    setErrorMessage(null)
    try {
      const created = await createOrganization(session.access, payload)
      await refreshCurrentViews()
      setSuccessMessage('Organization created and added to your workspace.')
      const createdId = typeof created.id === 'string' ? created.id : null
      if (createdId) {
        navigate(`/app/organizations/${createdId}`)
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not create the organization.')
    } finally {
      setIsBusy(false)
    }
  }

  const onSwitchOrganization = async (selectedOrganizationId: string, openDashboard = false) => {
    if (!session.access) return
    setIsBusy(true)
    setErrorMessage(null)
    try {
      await switchOrganization(session.access, selectedOrganizationId)
      await refreshCurrentViews()
      setSuccessMessage('Organization context switched.')
      if (openDashboard) {
        navigate(`/app/organizations/${selectedOrganizationId}`)
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not switch organizations.')
    } finally {
      setIsBusy(false)
    }
  }

  const onOpenOrganization = async (selectedOrganizationId: string) => {
    await onSwitchOrganization(selectedOrganizationId, true)
  }

  const onSendInvitation = async (selectedOrganizationId: string, payload: { invited_email: string; role: string }) => {
    if (!session.access) return
    setIsBusy(true)
    setErrorMessage(null)
    try {
      await sendOrganizationInvitation(session.access, selectedOrganizationId, payload)
      await refreshCurrentViews()
      setSuccessMessage('Invitation sent successfully.')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not send the invitation.')
    } finally {
      setIsBusy(false)
    }
  }

  const onUpdateProfile = async (payload: UserProfileUpdatePayload) => {
    if (!session.access) return
    setIsBusy(true)
    setErrorMessage(null)
    try {
      await updateProfile(session.access, payload)
      await refreshCurrentViews()
      setSuccessMessage('Profile updated.')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not update your profile.')
    } finally {
      setIsBusy(false)
    }
  }

  const onAcceptInvitation = async () => {
    if (!invitationToken) return
    if (!session.access) {
      navigate(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`)
      return
    }

    setIsBusy(true)
    setErrorMessage(null)
    try {
      await acceptInvitation(session.access, invitationToken)
      const refreshed = await loadDashboard(session.access)
      setSuccessMessage('Invitation accepted. You now have access to the organization.')
      navigate(`/app/organizations/${refreshed.active_organization?.id ?? refreshed.organizations[0]?.id ?? ''}`)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not accept the invitation.')
    } finally {
      setIsBusy(false)
    }
  }

  const onRejectInvitation = async () => {
    if (!invitationToken) return
    setIsBusy(true)
    setErrorMessage(null)
    try {
      await rejectInvitation(invitationToken)
      setSuccessMessage('Invitation rejected.')
      setInvitation((current) => (current ? { ...current, status: 'rejected' } : current))
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not reject the invitation.')
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <div className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <header className="announcement-bar">
        <span>Skill Verse</span>
        <button className="ghost-link" type="button" onClick={() => navigate('/')}>
          User-centered platform architecture
        </button>
      </header>

      {errorMessage ? <div className="flash flash-error">{errorMessage}</div> : null}
      {successMessage ? <div className="flash flash-success">{successMessage}</div> : null}

      {mode === 'landing' ? (
        <LandingPage
          modules={narrativeModules}
          onGoToLogin={() => navigate('/login')}
          onGoToRegister={() => navigate('/register')}
        />
      ) : null}

      {mode === 'login' || mode === 'register' ? (
        <AuthPage
          mode={mode}
          isBusy={isBusy}
          onGoHome={() => navigate('/')}
          onGoToLogin={() => navigate('/login')}
          onGoToRegister={() => navigate('/register')}
          onLogin={onLogin}
          onRegister={onRegister}
        />
      ) : null}

      {mode === 'invite' ? (
        <InvitationPage
          invitation={invitation}
          isBusy={isBusy}
          isAuthenticated={isAuthenticated}
          onAccept={onAcceptInvitation}
          onReject={onRejectInvitation}
          onGoToLogin={() => navigate(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`)}
          onGoHome={() => navigate('/')}
        />
      ) : null}

      {mode === 'dashboard' && dashboard ? (
        <PersonalDashboardPage
          dashboard={dashboard}
          isBusy={isBusy}
          onLogout={onLogout}
          onCreateOrganization={onCreateOrganization}
          onOpenOrganization={onOpenOrganization}
          onUpdateProfile={onUpdateProfile}
        />
      ) : null}

      {mode === 'organization' && dashboard && organizationDashboard ? (
        <OrganizationDashboardPage
          dashboard={dashboard}
          organizationDashboard={organizationDashboard}
          isBusy={isBusy}
          onLogout={onLogout}
          onBackToPersonalDashboard={() => navigate('/app')}
          onOpenOrganization={onOpenOrganization}
          onSendInvitation={onSendInvitation}
        />
      ) : null}
    </div>
  )
}

function LandingPage({
  modules,
  onGoToLogin,
  onGoToRegister,
}: {
  modules: PlatformBootstrap['modules']
  onGoToLogin: () => void
  onGoToRegister: () => void
}) {
  return (
    <main className="landing">
      <nav className="top-nav panel">
        <div className="brand-lockup">
          <div className="brand-mark">SV</div>
          <div>
            <strong>Skill Verse</strong>
            <p>User-first digital infrastructure</p>
          </div>
        </div>
        <div className="nav-actions">
          <button className="ghost-button" type="button" onClick={onGoToLogin}>
            Sign in
          </button>
          <button className="primary-button" type="button" onClick={onGoToRegister}>
            Create account
          </button>
        </div>
      </nav>

      <section className="hero-grid">
        <div className="hero-copy">
          <span className="eyebrow">Built for extensible multi-organization platforms</span>
          <h1>The user is the platform boundary, not an afterthought.</h1>
          <p>
            Skill Verse gives every authenticated user a clean home for organizations, permissions,
            invitations, and future modules like learning, community, events, and messaging.
          </p>
          <div className="hero-actions">
            <button className="primary-button" type="button" onClick={onGoToRegister}>
              Start building your workspace
            </button>
            <button className="ghost-button" type="button" onClick={onGoToLogin}>
              Explore the dashboard flow
            </button>
          </div>
          <div className="hero-metrics">
            {platformNarrative.metrics.map((metric) => (
              <article className="metric-card panel" key={metric.label}>
                <strong>{metric.value}</strong>
                <span>{metric.label}</span>
              </article>
            ))}
          </div>
        </div>

        <div className="hero-preview panel">
          <div className="window-chrome">
            <span />
            <span />
            <span />
          </div>
          <div className="preview-header">
            <div>
              <p className="preview-kicker">Workspace orchestration</p>
              <h2>Launch a personal control plane for every user.</h2>
            </div>
            <div className="status-pill">Live architecture</div>
          </div>
          <div className="preview-grid">
            {modules.map((module) => (
              <article className="preview-card" key={module.name}>
                <span className={`module-status module-status-${module.status}`}>{module.status}</span>
                <h3>{module.name}</h3>
                <p>{module.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="feature-section">
        <SectionHeading
          eyebrow="Core system primitives"
          title="Scalable foundations for a serious product roadmap"
          description="The platform is designed around reusable modules, service boundaries, and clean API contracts so each new capability grows from a stable core."
        />
        <div className="feature-grid">
          {platformNarrative.capabilities.map((capability) => (
            <article className="feature-card panel" key={capability.title}>
              <span className="feature-index">{capability.index}</span>
              <h3>{capability.title}</h3>
              <p>{capability.description}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}

function AuthPage({
  mode,
  isBusy,
  onGoHome,
  onGoToLogin,
  onGoToRegister,
  onLogin,
  onRegister,
}: {
  mode: 'login' | 'register'
  isBusy: boolean
  onGoHome: () => void
  onGoToLogin: () => void
  onGoToRegister: () => void
  onLogin: (payload: LoginPayload) => Promise<void>
  onRegister: (payload: RegisterPayload) => Promise<void>
}) {
  const [loginForm, setLoginForm] = useState<LoginPayload>({ email: '', password: '' })
  const [registerForm, setRegisterForm] = useState<RegisterPayload>({
    email: '',
    username: '',
    first_name: '',
    last_name: '',
    password: '',
    confirm_password: '',
  })

  return (
    <main className="auth-layout">
      <section className="auth-brand">
        <button className="ghost-link back-link" type="button" onClick={onGoHome}>
          Back to landing
        </button>
        <span className="eyebrow">Secure access layer</span>
        <h1>{mode === 'login' ? 'Sign in to your dashboard.' : 'Create a user-centered workspace.'}</h1>
        <p>
          JWT authentication, organization-aware access control, and invitation flows are wired for
          future extensions like social sign-in and multi-factor authentication.
        </p>
      </section>

      <section className="auth-card panel">
        <div className="auth-tabs">
          <button className={mode === 'login' ? 'tab-button active' : 'tab-button'} type="button" onClick={onGoToLogin}>
            Sign in
          </button>
          <button className={mode === 'register' ? 'tab-button active' : 'tab-button'} type="button" onClick={onGoToRegister}>
            Register
          </button>
        </div>

        {mode === 'login' ? (
          <form
            className="auth-form"
            onSubmit={(event) => {
              event.preventDefault()
              void onLogin(loginForm)
            }}
          >
            <label>
              Email
              <input
                type="email"
                value={loginForm.email}
                onChange={(event) => setLoginForm({ ...loginForm, email: event.target.value })}
                placeholder="you@company.com"
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={loginForm.password}
                onChange={(event) => setLoginForm({ ...loginForm, password: event.target.value })}
                placeholder="Enter your password"
                required
              />
            </label>
            <button className="primary-button stretch-button" type="submit" disabled={isBusy}>
              {isBusy ? 'Signing in...' : 'Access dashboard'}
            </button>
          </form>
        ) : (
          <form
            className="auth-form"
            onSubmit={(event) => {
              event.preventDefault()
              void onRegister(registerForm)
            }}
          >
            <div className="split-inputs">
              <label>
                First name
                <input
                  type="text"
                  value={registerForm.first_name}
                  onChange={(event) => setRegisterForm({ ...registerForm, first_name: event.target.value })}
                  required
                />
              </label>
              <label>
                Last name
                <input
                  type="text"
                  value={registerForm.last_name}
                  onChange={(event) => setRegisterForm({ ...registerForm, last_name: event.target.value })}
                  required
                />
              </label>
            </div>
            <label>
              Username
              <input
                type="text"
                value={registerForm.username}
                onChange={(event) => setRegisterForm({ ...registerForm, username: event.target.value })}
                required
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={registerForm.email}
                onChange={(event) => setRegisterForm({ ...registerForm, email: event.target.value })}
                required
              />
            </label>
            <div className="split-inputs">
              <label>
                Password
                <input
                  type="password"
                  value={registerForm.password}
                  onChange={(event) => setRegisterForm({ ...registerForm, password: event.target.value })}
                  required
                />
              </label>
              <label>
                Confirm password
                <input
                  type="password"
                  value={registerForm.confirm_password}
                  onChange={(event) => setRegisterForm({ ...registerForm, confirm_password: event.target.value })}
                  required
                />
              </label>
            </div>
            <button className="primary-button stretch-button" type="submit" disabled={isBusy}>
              {isBusy ? 'Creating account...' : 'Create account'}
            </button>
          </form>
        )}
      </section>
    </main>
  )
}

function InvitationPage({
  invitation,
  isBusy,
  isAuthenticated,
  onAccept,
  onReject,
  onGoToLogin,
  onGoHome,
}: {
  invitation: InvitationDetail | null
  isBusy: boolean
  isAuthenticated: boolean
  onAccept: () => Promise<void>
  onReject: () => Promise<void>
  onGoToLogin: () => void
  onGoHome: () => void
}) {
  return (
    <main className="invite-layout">
      <section className="invite-card panel">
        <button className="ghost-link back-link" type="button" onClick={onGoHome}>
          Back to landing
        </button>
        <span className="eyebrow">Organization invitation</span>
        <h1>{invitation?.organization_name ?? 'Loading invitation...'}</h1>
        <p>
          {invitation
            ? `This invitation grants ${invitation.role} access to ${invitation.organization_name}.`
            : 'Fetching invitation details from the workspace API.'}
        </p>

        {invitation ? (
          <div className="invite-meta">
            <div className="mini-stat">
              <span>Status</span>
              <strong>{invitation.status}</strong>
            </div>
            <div className="mini-stat">
              <span>Recipient</span>
              <strong>{invitation.invited_email}</strong>
            </div>
            <div className="mini-stat">
              <span>Expires</span>
              <strong>{new Date(invitation.expires_at).toLocaleDateString()}</strong>
            </div>
          </div>
        ) : null}

        <div className="hero-actions">
          <button className="primary-button" type="button" onClick={() => void onAccept()} disabled={isBusy}>
            {isAuthenticated ? 'Accept invitation' : 'Sign in to accept'}
          </button>
          <button className="ghost-button" type="button" onClick={() => void onReject()} disabled={isBusy}>
            Reject invitation
          </button>
          {!isAuthenticated ? (
            <button className="ghost-button" type="button" onClick={onGoToLogin}>
              Sign in
            </button>
          ) : null}
        </div>
      </section>
    </main>
  )
}

function PersonalDashboardPage({
  dashboard,
  isBusy,
  onLogout,
  onCreateOrganization,
  onOpenOrganization,
  onUpdateProfile,
}: {
  dashboard: DashboardData
  isBusy: boolean
  onLogout: () => void
  onCreateOrganization: (payload: { name: string; email: string; description: string }) => Promise<void>
  onOpenOrganization: (organizationId: string) => Promise<void>
  onUpdateProfile: (payload: UserProfileUpdatePayload) => Promise<void>
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [organizationForm, setOrganizationForm] = useState({ name: '', email: '', description: '' })
  const [profileForm, setProfileForm] = useState({
    first_name: dashboard.user.first_name,
    last_name: dashboard.user.last_name,
    profile: {
      title: dashboard.user.profile.title,
      bio: dashboard.user.profile.bio,
      location: dashboard.user.profile.location,
    },
  })

  const filteredOrganizations = dashboard.organizations.filter((organization) =>
    `${organization.name} ${organization.description} ${organization.membership_role}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase()),
  )

  const activeOrganization =
    dashboard.organizations.find(
      (organization) => organization.id === dashboard.user.profile.active_organization_id,
    ) ?? dashboard.active_organization

  return (
    <main className="dashboard-shell">
      <aside className={isSidebarCollapsed ? 'sidebar panel collapsed' : 'sidebar panel'}>
        <div className="brand-lockup">
          <div className="brand-mark">SV</div>
          {!isSidebarCollapsed ? (
            <div>
              <strong>Skill Verse</strong>
              <p>Personal control plane</p>
            </div>
          ) : null}
        </div>
        <button className="ghost-button collapse-button" type="button" onClick={() => setIsSidebarCollapsed((current) => !current)}>
          {isSidebarCollapsed ? 'Expand' : 'Collapse'}
        </button>
        <div className="sidebar-group">
          {['Overview', 'Organizations', 'Profile'].map((item) => (
            <button className="sidebar-link" key={item} type="button">
              <span className="sidebar-icon">{item[0]}</span>
              {!isSidebarCollapsed ? item : null}
            </button>
          ))}
        </div>
        <div className="sidebar-footnote">
          {!isSidebarCollapsed ? <p>Open an organization to access that team dashboard and invitation settings.</p> : null}
        </div>
      </aside>

      <section className="dashboard-main">
        <header className="dashboard-topbar panel">
          <label className="search-shell">
            <input
              type="search"
              placeholder="Search organizations and roles"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </label>
          <div className="topbar-actions">
            <div className="notification-pill">{dashboard.stats.pending_invitation_count} invites</div>
            <div className="profile-chip">
              <strong>{dashboard.user.full_name}</strong>
              <span>{dashboard.user.email}</span>
            </div>
            <button className="ghost-button" type="button" onClick={onLogout}>
              Sign out
            </button>
          </div>
        </header>

        <section className="dashboard-hero panel">
          <div className="page-breadcrumb">
            <span>Dashboard</span>
            <span>&gt;</span>
            <span>Overview</span>
          </div>
          <div className="hero-title-row">
            <div>
              <h1>Dashboard</h1>
              <p>Your personal dashboard is for identity, membership context, and jumping into each organization dashboard.</p>
            </div>
            <button
              className="primary-button"
              type="button"
              onClick={() => activeOrganization ? void onOpenOrganization(activeOrganization.id) : undefined}
            >
              Open Active Organization
            </button>
          </div>
          <div className="dashboard-stats">
            <div className="stat-card">
              <span>Organizations</span>
              <strong>{dashboard.stats.organization_count}</strong>
            </div>
            <div className="stat-card">
              <span>Managed orgs</span>
              <strong>{dashboard.stats.managed_organization_count}</strong>
            </div>
            <div className="stat-card">
              <span>Active org</span>
              <strong>{activeOrganization?.name ?? 'None'}</strong>
            </div>
          </div>
        </section>

        <section className="dashboard-grid">
          <article className="dashboard-card panel">
            <SectionHeading
              eyebrow="Organizations"
              title="Organization Workspaces"
              description="Each organization has its own dashboard where members can collaborate and where invitation settings live."
            />
            <div className="dashboard-table-shell">
              <div className="dashboard-table-header">
                <span>Name</span>
                <span>Role</span>
                <span>Members</span>
                <span>Status</span>
                <span>Action</span>
              </div>
              {filteredOrganizations.map((organization) => (
                <div className="dashboard-table-row" key={organization.id}>
                  <div>
                    <strong>{organization.name}</strong>
                    <span>{organization.description || 'Organization workspace'}</span>
                  </div>
                  <span>{organization.membership_role}</span>
                  <span>{organization.member_count ?? 0}</span>
                  <span className="table-status status-active">
                    {organization.is_verified ? 'Verified' : 'Draft'}
                  </span>
                  <button className="ghost-link table-action" type="button" onClick={() => void onOpenOrganization(organization.id)}>
                    Open
                  </button>
                </div>
              ))}
            </div>
          </article>

          <article className="dashboard-card panel">
            <SectionHeading
              eyebrow="Create organization"
              title="Create Organization"
              description="Creators automatically become the first member and can immediately access the organization dashboard."
            />
            <form
              className="dashboard-form"
              onSubmit={(event) => {
                event.preventDefault()
                void onCreateOrganization(organizationForm)
              }}
            >
              <label>
                Name
                <input
                  type="text"
                  value={organizationForm.name}
                  onChange={(event) => setOrganizationForm({ ...organizationForm, name: event.target.value })}
                  placeholder="AST Trading"
                  required
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  value={organizationForm.email}
                  onChange={(event) => setOrganizationForm({ ...organizationForm, email: event.target.value })}
                  placeholder="team@organization.com"
                />
              </label>
              <label>
                Description
                <textarea
                  rows={4}
                  value={organizationForm.description}
                  onChange={(event) => setOrganizationForm({ ...organizationForm, description: event.target.value })}
                  placeholder="Describe the organization and what this workspace is used for."
                />
              </label>
              <button className="primary-button stretch-button" type="submit" disabled={isBusy}>
                {isBusy ? 'Saving...' : 'Create organization'}
              </button>
            </form>
          </article>

          <article className="dashboard-card panel dashboard-card-wide">
            <SectionHeading
              eyebrow="Profile management"
              title="User Profile"
              description="Your personal profile remains separate from any one organization."
            />
            <form
              className="dashboard-form"
              onSubmit={(event) => {
                event.preventDefault()
                void onUpdateProfile(profileForm)
              }}
            >
              <div className="split-inputs">
                <label>
                  First name
                  <input
                    type="text"
                    value={profileForm.first_name}
                    onChange={(event) => setProfileForm({ ...profileForm, first_name: event.target.value })}
                    placeholder="First name"
                  />
                </label>
                <label>
                  Last name
                  <input
                    type="text"
                    value={profileForm.last_name}
                    onChange={(event) => setProfileForm({ ...profileForm, last_name: event.target.value })}
                    placeholder="Last name"
                  />
                </label>
              </div>
              <div className="split-inputs">
                <label>
                  Title
                  <input
                    type="text"
                    value={profileForm.profile.title}
                    onChange={(event) => setProfileForm({ ...profileForm, profile: { ...profileForm.profile, title: event.target.value } })}
                    placeholder="Super Admin"
                  />
                </label>
                <label>
                  Location
                  <input
                    type="text"
                    value={profileForm.profile.location}
                    onChange={(event) => setProfileForm({ ...profileForm, profile: { ...profileForm.profile, location: event.target.value } })}
                    placeholder="Addis Ababa"
                  />
                </label>
              </div>
              <label>
                Bio
                <textarea
                  rows={4}
                  value={profileForm.profile.bio}
                  onChange={(event) => setProfileForm({ ...profileForm, profile: { ...profileForm.profile, bio: event.target.value } })}
                  placeholder="Share a short description about this user account."
                />
              </label>
              <button className="primary-button stretch-button" type="submit" disabled={isBusy}>
                {isBusy ? 'Updating...' : 'Save profile'}
              </button>
            </form>
          </article>
        </section>
      </section>
    </main>
  )
}

function OrganizationDashboardPage({
  dashboard,
  organizationDashboard,
  isBusy,
  onLogout,
  onBackToPersonalDashboard,
  onOpenOrganization,
  onSendInvitation,
}: {
  dashboard: DashboardData
  organizationDashboard: OrganizationDashboardData
  isBusy: boolean
  onLogout: () => void
  onBackToPersonalDashboard: () => void
  onOpenOrganization: (organizationId: string) => Promise<void>
  onSendInvitation: (organizationId: string, payload: { invited_email: string; role: string }) => Promise<void>
}) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [invitationForm, setInvitationForm] = useState({ invited_email: '', role: 'member' })
  const currentOrganization = organizationDashboard.organization

  return (
    <main className="dashboard-shell">
      <aside className={isSidebarCollapsed ? 'sidebar panel collapsed' : 'sidebar panel'}>
        <div className="brand-lockup">
          <div className="brand-mark">SV</div>
          {!isSidebarCollapsed ? (
            <div>
              <strong>{currentOrganization.name}</strong>
              <p>Organization dashboard</p>
            </div>
          ) : null}
        </div>
        <button className="ghost-button collapse-button" type="button" onClick={() => setIsSidebarCollapsed((current) => !current)}>
          {isSidebarCollapsed ? 'Expand' : 'Collapse'}
        </button>
        <div className="sidebar-group">
          <button className="sidebar-link" type="button" onClick={onBackToPersonalDashboard}>
            <span className="sidebar-icon">P</span>
            {!isSidebarCollapsed ? 'Personal dashboard' : null}
          </button>
          {dashboard.organizations.map((organization) => (
            <button className="sidebar-link" key={organization.id} type="button" onClick={() => void onOpenOrganization(organization.id)}>
              <span className="sidebar-icon">{organization.name.charAt(0)}</span>
              {!isSidebarCollapsed ? organization.name : null}
            </button>
          ))}
        </div>
      </aside>

      <section className="dashboard-main">
        <header className="dashboard-topbar panel">
          <div className="org-context-header">
            <div className="page-breadcrumb">
              <span>Organizations</span>
              <span>&gt;</span>
              <span>{currentOrganization.name}</span>
            </div>
            <strong>{currentOrganization.name}</strong>
          </div>
          <div className="topbar-actions">
            <div className="profile-chip">
              <strong>{dashboard.user.full_name}</strong>
              <span>{organizationDashboard.permissions.role}</span>
            </div>
            <button className="ghost-button" type="button" onClick={onLogout}>
              Sign out
            </button>
          </div>
        </header>

        <section className="dashboard-hero panel">
          <div className="hero-title-row">
            <div>
              <h1>{currentOrganization.name}</h1>
              <p>Members can access this dashboard, review teammates, and manage invitation settings here inside the organization context.</p>
            </div>
            <button className="ghost-button" type="button" onClick={onBackToPersonalDashboard}>
              Back to Dashboard
            </button>
          </div>
          <div className="dashboard-stats">
            <div className="stat-card">
              <span>Members</span>
              <strong>{organizationDashboard.stats.member_count}</strong>
            </div>
            <div className="stat-card">
              <span>Pending invites</span>
              <strong>{organizationDashboard.stats.pending_invitation_count}</strong>
            </div>
            <div className="stat-card">
              <span>Your role</span>
              <strong>{organizationDashboard.permissions.role}</strong>
            </div>
          </div>
        </section>

        <section className="dashboard-grid">
          <article className="dashboard-card panel">
            <SectionHeading
              eyebrow="Members"
              title="Organization Members"
              description="Everyone in the organization can enter this dashboard based on their membership."
            />
            <div className="dashboard-table-shell">
              <div className="dashboard-table-header">
                <span>Name</span>
                <span>Email</span>
                <span>Role</span>
                <span>Status</span>
                <span>Action</span>
              </div>
              {organizationDashboard.members.map((member) => (
                <div className="dashboard-table-row" key={member.id}>
                  <div>
                    <strong>{member.user.full_name}</strong>
                    <span>{member.user.username}</span>
                  </div>
                  <span>{member.user.email}</span>
                  <span>{member.role}</span>
                  <span className="table-status status-active">Active</span>
                  <span className="table-action">View</span>
                </div>
              ))}
            </div>
          </article>

          <article className="dashboard-card panel">
            <SectionHeading
              eyebrow="Invitation settings"
              title="Invite Members"
              description="Invitations happen for organizations, so sending and reviewing them lives here on the organization dashboard."
            />
            <form
              className="dashboard-form"
              onSubmit={(event) => {
                event.preventDefault()
                if (organizationDashboard.permissions.can_manage_invitations) {
                  void onSendInvitation(currentOrganization.id, invitationForm)
                }
              }}
            >
              <label>
                Invitee email
                <input
                  type="email"
                  value={invitationForm.invited_email}
                  onChange={(event) => setInvitationForm({ ...invitationForm, invited_email: event.target.value })}
                  placeholder="member@company.com"
                  required
                />
              </label>
              <label>
                Role
                <select
                  value={invitationForm.role}
                  onChange={(event) => setInvitationForm({ ...invitationForm, role: event.target.value })}
                >
                  <option value="member">Member</option>
                  <option value="manager">Manager</option>
                  <option value="creator">Creator</option>
                </select>
              </label>
              <div className="segmented-status">
                {['New', 'Processing', 'Shipped', 'Delivered', 'Cancelled'].map((status, index) => (
                  <span className={index === 0 ? 'status-chip active' : 'status-chip'} key={status}>
                    {status}
                  </span>
                ))}
              </div>
              <button
                className="primary-button stretch-button"
                type="submit"
                disabled={!organizationDashboard.permissions.can_manage_invitations || isBusy}
              >
                {isBusy ? 'Sending...' : 'Send invitation'}
              </button>
            </form>
          </article>

          <article className="dashboard-card panel dashboard-card-wide">
            <SectionHeading
              eyebrow="Invitation activity"
              title="Invitation History"
              description="This log is scoped to the organization dashboard, not the personal dashboard."
            />
            <div className="dashboard-table-shell">
              <div className="dashboard-table-header">
                <span>Email</span>
                <span>Role</span>
                <span>Sent By</span>
                <span>Status</span>
                <span>Date</span>
              </div>
              {organizationDashboard.invitations.length ? (
                organizationDashboard.invitations.map((orgInvitation) => (
                  <div className="dashboard-table-row" key={orgInvitation.id}>
                    <div>
                      <strong>{orgInvitation.invited_email}</strong>
                      <span>{currentOrganization.name}</span>
                    </div>
                    <span>{orgInvitation.role}</span>
                    <span>{orgInvitation.invited_by.full_name}</span>
                    <span className="table-status status-pending">{orgInvitation.status}</span>
                    <span>{new Date(orgInvitation.date_sent).toLocaleDateString()}</span>
                  </div>
                ))
              ) : (
                <div className="mini-stat">
                  <span>Invitations</span>
                  <strong>No invitations yet for this organization</strong>
                </div>
              )}
            </div>
          </article>
        </section>
      </section>
    </main>
  )
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string
  title: string
  description: string
}) {
  return (
    <div className="section-heading">
      <span className="eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  )
}

export default App
