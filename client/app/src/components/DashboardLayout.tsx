// components/DashboardLayout.tsx
import type { ReactNode } from 'react'
import { useNavigate, useLocation, Outlet, Link } from 'react-router-dom'
import type { DashboardData } from '../types'
import '../styles/DashboardLayout.css'

// ── helpers ────────────────────────────────────────────────────────────────
export function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

// ── Avatar ─────────────────────────────────────────────────────────────────
export function Avatar({
  name,
  size = 'md',
  gradient,
}: {
  name: string
  size?: 'sm' | 'md' | 'lg'
  gradient?: string
}) {
  return (
    <div
      className={`sv-avatar sv-avatar--${size}`}
      style={gradient ? { background: gradient } : undefined}
      aria-hidden
    >
      {initials(name)}
    </div>
  )
}

// ── Logo mark ──────────────────────────────────────────────────────────────
function SidebarLogo() {
  return (
    <div className="sv-sidebar__logo" aria-hidden>
      <svg width="15" height="15" viewBox="0 0 14 14" fill="none">
        <path d="M7 1L13 4.5V9.5L7 13L1 9.5V4.5L7 1Z" fill="hsl(0,0%,8%)" />
      </svg>
    </div>
  )
}

// ── Nav item ───────────────────────────────────────────────────────────────
function NavItem({
  to,
  icon,
  label,
  badge,
}: {
  to: string
  icon: ReactNode
  label: string
  badge?: number
}) {
  const location = useLocation()
  const active = location.pathname === to || location.pathname.startsWith(to + '/')

  return (
    <Link
      to={to}
      className={`sv-nav-item${active ? ' sv-nav-item--active' : ''}`}
      aria-current={active ? 'page' : undefined}
    >
      <span className="sv-nav-item__icon" aria-hidden>{icon}</span>
      {label}
      {badge != null && badge > 0 && (
        <span className="sv-nav-item__badge">{badge > 99 ? '99+' : badge}</span>
      )}
    </Link>
  )
}

// ── Icon components (inline SVG for crispness at small sizes) ──────────────
const Icon = {
  Dashboard: () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <rect x="1" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
      <rect x="8" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
      <rect x="1" y="8" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
      <rect x="8" y="8" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  ),
  Building: () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <rect x="1.5" y="3" width="12" height="10.5" rx="1" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M5 13.5V10h5v3.5" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
      <rect x="3.5" y="5.5" width="2" height="2" rx=".3" stroke="currentColor" strokeWidth="1.1"/>
      <rect x="9.5" y="5.5" width="2" height="2" rx=".3" stroke="currentColor" strokeWidth="1.1"/>
      <path d="M7.5 1.5v1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  ),
  Users: () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M1 13c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <circle cx="11" cy="4.5" r="2" stroke="currentColor" strokeWidth="1.1"/>
      <path d="M13 12c0-2.21-1.34-4.1-3.25-4.75" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
    </svg>
  ),
  Mail: () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <rect x="1" y="3" width="13" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M1.5 3.5l6 4.5 6-4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Settings: () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <circle cx="7.5" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M7.5 1v1.5M7.5 12.5V14M14 7.5h-1.5M2.5 7.5H1M12.36 3.14l-1.06 1.06M3.7 10.8l-1.06 1.06M12.36 11.86l-1.06-1.06M3.7 4.2L2.64 3.14" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  ),
  Chart: () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M1.5 13V6M5.5 13V3M9.5 13V7.5M13.5 13V5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
  Document: () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M4 1.75h4.5L11.75 5v8.25a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-10.5a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
      <path d="M8.5 1.75V5h3.25" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
      <path d="M5.5 7.25h4M5.5 9.5h4M5.5 11.75h2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  ),
  PlayCircle: () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <circle cx="7.5" cy="7.5" r="5.75" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M6.25 5.5l3.25 2-3.25 2v-4Z" fill="currentColor"/>
    </svg>
  ),
  Swap: () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M3 4h8.2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M9.8 2.5L12 4l-2.2 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12 11H3.8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M5.2 9.5 3 11l2.2 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Chat: () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M2 3.2C2 2.54 2.54 2 3.2 2h8.6c.66 0 1.2.54 1.2 1.2v5.1c0 .66-.54 1.2-1.2 1.2H7.2L4.2 12V9.5H3.2c-.66 0-1.2-.54-1.2-1.2V3.2Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
      <path d="M4.2 5.2h6.6M4.2 7.4h4.4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  ),
  Plus: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  Bell: () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M7.5 1.5a4 4 0 0 1 4 4v3l1 2H3l1-2v-3a4 4 0 0 1 4-4Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
      <path d="M6 11.5a1.5 1.5 0 0 0 3 0" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  ),
  Search: () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <circle cx="6.5" cy="6.5" r="4" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M10 10l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  ),
  Dots: () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <circle cx="3.5" cy="7.5" r="1" fill="currentColor"/>
      <circle cx="7.5" cy="7.5" r="1" fill="currentColor"/>
      <circle cx="11.5" cy="7.5" r="1" fill="currentColor"/>
    </svg>
  ),
  Chevron: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M5 9l4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9 9l-4 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" opacity="0"/>
      <path d="M4.5 5.5l2.5 3 2.5-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
}

export { Icon }

// ── Org switcher in sidebar ─────────────────────────────────────────────────
function OrgSwitcher({ data }: { data: DashboardData | null }) {
  const navigate = useNavigate()
  const activeOrg = data?.active_organization

  return (
    <button
      className="sv-org-switcher"
      onClick={() => navigate('/dashboard/organizations')}
      aria-label="Switch organization"
    >
      <div className="sv-org-switcher__icon">
        {activeOrg ? initials(activeOrg.name) : '?'}
      </div>
      <div className="sv-org-switcher__info">
        <div className="sv-org-switcher__label">Organization</div>
        <div className="sv-org-switcher__name">
          {activeOrg?.name ?? 'No workspace selected'}
        </div>
      </div>
      <span className="sv-org-switcher__chevron" aria-hidden>
        <Icon.Chevron />
      </span>
    </button>
  )
}

// ── Sidebar ────────────────────────────────────────────────────────────────
function Sidebar({
  data,
  onSignOut,
}: {
  data: DashboardData | null
  onSignOut: () => void
}) {
  const user = data?.user
  const pendingCount = data?.stats.pending_invitation_count ?? 0

  return (
    <aside className="sv-sidebar" aria-label="Main navigation">
      {/* Header */}
      <div className="sv-sidebar__header">
        <SidebarLogo />
        <span className="sv-sidebar__name">SkillVerse</span>
      </div>

      {/* Org switcher */}
      <OrgSwitcher data={data} />

      {/* Nav */}
      <nav className="sv-sidebar__nav">
        <span className="sv-sidebar__section-label">Overview</span>
        <NavItem to="/dashboard" icon={<Icon.Dashboard />} label="Dashboard" />
        <NavItem
          to="/dashboard/analytics"
          icon={<Icon.Chart />}
          label="Analytics"
        />
        <NavItem
          to="/dashboard/invitations"
          icon={<Icon.Bell />}
          label="Invitations"
          badge={pendingCount}
        />

        <span className="sv-sidebar__section-label">Workspace</span>
        <NavItem
          to="/dashboard/organizations"
          icon={<Icon.Building />}
          label="Organizations"
        />
        <NavItem
          to="/dashboard/members"
          icon={<Icon.Users />}
          label="Members"
        />

        <span className="sv-sidebar__section-label">Learning</span>

        <NavItem
          to="/dashboard/courses"
          icon={<Icon.Chart />}
          label="Courses"
        />

        <span className="sv-sidebar__section-label">Skill Swap</span>
        <NavItem
          to="/dashboard/skill-swap"
          icon={<Icon.Swap />}
          label="Skills"
        />
        <NavItem
          to="/dashboard/skill-swap/matches"
          icon={<Icon.Users />}
          label="Matches"
        />
        <NavItem
          to="/dashboard/skill-swap/chat"
          icon={<Icon.Chat />}
          label="Chat"
        />

        
        <span className="sv-sidebar__section-label">Account</span>
        <NavItem
          to="/dashboard/settings"
          icon={<Icon.Settings />}
          label="Settings"
        />
      </nav>

      {/* User footer */}
      <div className="sv-sidebar__footer">
        {user && (
          <>
            <div
              className="sv-user-row"
              role="button"
              tabIndex={0}
              aria-label="Account menu"
            >
              <Avatar name={user.full_name || user.username} />
              <div className="sv-user-row__info">
                <div className="sv-user-row__name">
                  {user.full_name || user.username}
                </div>
                <div className="sv-user-row__role">{user.email}</div>
              </div>
              <span className="sv-user-row__dots" aria-hidden>
                <Icon.Dots />
              </span>
            </div>
          </>
        )}
        <button className="sv-sidebar__signout" onClick={onSignOut}>
          Sign out
        </button>
      </div>
    </aside>
  );
}

// ── Top bar ────────────────────────────────────────────────────────────────
function TopBar({
  title,
  breadcrumb,
  onNewOrg,
}: {
  title: string
  breadcrumb?: string
  onNewOrg?: () => void
}) {
  return (
    <header className="sv-topbar">
      <div className="sv-topbar__left">
        <div className="sv-topbar__title">{title}</div>
        {breadcrumb && <div className="sv-topbar__breadcrumb">{breadcrumb}</div>}
      </div>
      <div className="sv-topbar__right">
        <button className="sv-icon-btn" aria-label="Search">
          <Icon.Search />
        </button>
        <button className="sv-icon-btn" aria-label="Notifications">
          <Icon.Bell />
        </button>
        {onNewOrg && (
          <button className="btn btn--solid btn--sm" onClick={onNewOrg}>
            <Icon.Plus /> New org
          </button>
        )}
      </div>
    </header>
  )
}

export { TopBar }

// ── Shell ──────────────────────────────────────────────────────────────────
export interface DashboardLayoutProps {
  data: DashboardData | null
  topBarTitle?: string
  topBarBreadcrumb?: string
  onSignOut: () => void
  onNewOrg?: () => void
}

export function DashboardLayout({
  data,
  topBarTitle = 'Dashboard',
  topBarBreadcrumb,
  onSignOut,
  onNewOrg,
}: DashboardLayoutProps) {
  return (
    <div className="sv-shell">
      <Sidebar data={data} onSignOut={onSignOut} />
      <div className="sv-main">
        <TopBar
          title={topBarTitle}
          breadcrumb={topBarBreadcrumb}
          onNewOrg={onNewOrg}
        />
        <main className="sv-content" id="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
