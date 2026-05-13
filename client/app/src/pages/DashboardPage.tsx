import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

import { acceptInvitation, fetchDashboard, rejectInvitation } from '../lib/api'
import { Avatar, Icon, initials } from '../components/DashboardLayout'
import type { DashboardData, InvitationDetail, Organization } from '../types'
import '../styles/Dashboard.css'

function MetricCard({
  label,
  value,
  note,
  icon,
  noteVariant = 'neutral',
}: {
  label: string
  value: string | number
  note?: string
  icon: ReactNode
  noteVariant?: 'up' | 'down' | 'neutral'
}) {
  return (
    <div className="sv-metric">
      <div className="sv-metric__header">
        <span className="sv-metric__label">{label}</span>
        <span className="sv-metric__icon" aria-hidden>{icon}</span>
      </div>
      <div className="sv-metric__value">{value}</div>
      {note && (
        <div className={`sv-metric__note${noteVariant !== 'neutral' ? ` sv-metric__note--${noteVariant}` : ''}`}>
          {note}
        </div>
      )}
    </div>
  )
}

function OrgCard({
  org,
  role,
  isActive,
  onClick,
}: {
  org: Organization
  role: string | null
  isActive: boolean
  onClick: () => void
}) {
  const roleKey = (role ?? 'member').toLowerCase() as 'owner' | 'manager' | 'instructor' | 'member'

  return (
    <article
      className={`sv-org-card${isActive ? ' sv-org-card--active' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => event.key === 'Enter' && onClick()}
      aria-label={`Open ${org.name} workspace`}
    >
      <div className="sv-org-card__header">
        <div className="sv-org-card__icon">{initials(org.name)}</div>
        <div>
          <div className="sv-org-card__name">
            {org.name}
            {org.is_verified && (
              <span className="sv-verified" title="Verified organization">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                  <circle cx="6" cy="6" r="5.5" fill="#0070f3" />
                  <path d="M3.5 6l2 2 3-3" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            )}
          </div>
          <div className="sv-org-card__email">{org.email}</div>
        </div>
      </div>
      <div className="sv-org-card__role-row">
        {org.member_count != null && (
          <span className="sv-org-card__members">
            {org.member_count} member{org.member_count !== 1 ? 's' : ''}
          </span>
        )}
        <span className={`sv-role-badge sv-role-badge--${roleKey}`}>{role ?? 'member'}</span>
      </div>
    </article>
  )
}

function InviteCard({
  inv,
  onAccept,
  onReject,
}: {
  inv: InvitationDetail
  onAccept: (inv: InvitationDetail) => void
  onReject: (inv: InvitationDetail) => void
}) {
  const sentDate = new Date(inv.date_sent).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
  const expired = new Date(inv.expires_at) < new Date()

  return (
    <div className="sv-invite-card">
      <div className="sv-invite-card__icon" aria-hidden>
        <Icon.Mail />
      </div>
      <div className="sv-invite-card__info">
        <div className="sv-invite-card__org">{inv.title}</div>
        <div className="sv-invite-card__meta">
          {inv.subtitle} · sent {sentDate}
          {expired ? ' · expired' : ''}
        </div>
      </div>
      {!expired && inv.status === 'pending' && (
        <div className="sv-invite-card__actions">
          <button className="btn btn--ghost btn--sm" onClick={() => onReject(inv)} aria-label={`Decline invitation for ${inv.title}`}>
            Decline
          </button>
          <button className="btn btn--blue btn--sm" onClick={() => onAccept(inv)} aria-label={`Accept invitation for ${inv.title}`}>
            Accept
          </button>
        </div>
      )}
      {(expired || inv.status !== 'pending') && (
        <span className={`sv-status sv-status--${expired ? 'expired' : inv.status}`}>
          {expired ? 'expired' : inv.status}
        </span>
      )}
    </div>
  )
}

function MembershipRow({
  membership,
}: {
  membership: DashboardData['memberships'][number]
}) {
  const navigate = useNavigate()

  return (
    <tr>
      <td>
        <div className="sv-table__user">
          <div className="sv-org-card__icon" style={{ width: 28, height: 28, borderRadius: 6, fontSize: 11 }}>
            {initials(membership.organization_name)}
          </div>
          <span className="sv-table__user-name">{membership.organization_name}</span>
        </div>
      </td>
      <td>
        <span className={`sv-role-badge sv-role-badge--${membership.role.toLowerCase()}`}>
          {membership.role}
        </span>
      </td>
      <td>
        <button className="btn btn--ghost btn--sm" onClick={() => navigate(`/dashboard/organizations/${membership.organization_id}`)}>
          Open
        </button>
      </td>
    </tr>
  )
}

function DashboardSkeleton() {
  return (
    <div>
      <div className="sv-page-header">
        <div className="sv-skeleton" style={{ width: 220, height: 26, marginBottom: 8 }} />
        <div className="sv-skeleton" style={{ width: 160, height: 14 }} />
      </div>
      <div className="sv-metrics">
        {[1, 2, 3].map((item) => (
          <div key={item} className="sv-metric">
            <div className="sv-skeleton" style={{ height: 56 }} />
          </div>
        ))}
      </div>
    </div>
  )
}

export function DashboardPage({ token }: { token: string }) {
  const navigate = useNavigate()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadDashboard = () => {
    setLoading(true)
    setError(null)
    fetchDashboard(token)
      .then(setData)
      .catch((loadError: Error) => setError(loadError.message))
      .finally(() => setLoading(false))
  }

  useEffect(loadDashboard, [token])

  if (loading) return <DashboardSkeleton />
  if (error) {
    return (
      <div className="sv-empty">
        <div className="sv-empty__icon" aria-hidden>!</div>
        <div className="sv-empty__title">Failed to load dashboard</div>
        <div className="sv-empty__sub">{error}</div>
      </div>
    )
  }
  if (!data) return null

  const { user, organizations, memberships, pending_invitations, stats } = data
  const firstName = user.first_name || user.username

  return (
    <>
      <div className="sv-page-header">
        <h1 className="sv-page-header__title">Welcome back, {firstName}</h1>
        <p className="sv-page-header__sub">
          Here&apos;s what&apos;s happening across your organizations.
        </p>
      </div>

      <div className="sv-metrics">
        <MetricCard label="Organizations" value={stats.organization_count} note="You belong to" icon={<Icon.Building />} />
        <MetricCard label="Managed" value={stats.managed_organization_count} note="You can manage" icon={<Icon.Chart />} />
        <MetricCard
          label="Invitations"
          value={stats.pending_invitation_count}
          note={stats.pending_invitation_count > 0 ? 'Awaiting your reply' : 'All clear'}
          icon={<Icon.Bell />}
          noteVariant={stats.pending_invitation_count > 0 ? 'up' : 'neutral'}
        />
      </div>

      <div className="sv-grid-2" style={{ marginBottom: 12 }}>
        <div className="sv-panel">
          <div className="sv-panel__head">
            <span className="sv-panel__title">Your profile</span>
            <button className="sv-panel__action" onClick={() => navigate('/dashboard/settings')}>
              Edit
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <Avatar name={user.full_name || user.username} size="lg" />
            <div>
              <div style={{ fontWeight: 600, fontSize: 15, letterSpacing: '-0.01em' }}>{user.full_name}</div>
              <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 2 }}>{user.email}</div>
              {user.profile?.title && (
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 3 }}>
                  {user.profile.title}
                </div>
              )}
            </div>
          </div>
          <div className="sv-divider" />
          {user.profile?.bio && (
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65 }}>
              {user.profile.bio}
            </p>
          )}
          {user.profile?.location && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, fontSize: 12.5, color: 'var(--text-tertiary)' }}>
              {user.profile.location}
            </div>
          )}
        </div>

        <div className="sv-panel">
          <div className="sv-panel__head">
            <span className="sv-panel__title">Pending invitations</span>
            {pending_invitations.length > 0 && (
              <span style={{ background: 'rgba(245,165,36,0.12)', color: 'var(--accent-amber)', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99 }}>
                {pending_invitations.length}
              </span>
            )}
          </div>
          {pending_invitations.length === 0 ? (
            <div className="sv-empty" style={{ padding: '24px 0' }}>
              <div className="sv-empty__icon" aria-hidden><Icon.Mail /></div>
              <div className="sv-empty__title">No pending invitations</div>
              <div className="sv-empty__sub">You&apos;re all caught up.</div>
            </div>
          ) : (
            <div className="sv-invite-list">
              {pending_invitations.map((invitation) => (
                <InviteCard
                  key={invitation.id}
                  inv={invitation}
                  onAccept={(nextInvitation) => {
                    void acceptInvitation(token, nextInvitation.token, nextInvitation.invitation_type)
                      .then(loadDashboard)
                      .catch((actionError: Error) => setError(actionError.message))
                  }}
                  onReject={(nextInvitation) => {
                    void rejectInvitation(nextInvitation.token, nextInvitation.invitation_type)
                      .then(loadDashboard)
                      .catch((actionError: Error) => setError(actionError.message))
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="sv-panel" style={{ marginBottom: 12 }}>
        <div className="sv-panel__head">
          <span className="sv-panel__title">Your organizations</span>
          <button className="sv-panel__action" onClick={() => navigate('/dashboard/organizations')}>
            View all
          </button>
        </div>
        {organizations.length === 0 ? (
          <div className="sv-empty" style={{ padding: '24px 0' }}>
            <div className="sv-empty__icon" aria-hidden><Icon.Building /></div>
            <div className="sv-empty__title">No organizations yet</div>
            <div className="sv-empty__sub">Create or join one to get started.</div>
          </div>
        ) : (
          <div className="sv-org-cards">
            {organizations.slice(0, 6).map((org) => {
              const membership = memberships.find((item) => item.organization_id === org.id)
              return (
                <OrgCard
                  key={org.id}
                  org={org}
                  role={membership?.role ?? org.membership_role}
                  isActive={org.id === data.active_organization?.id}
                  onClick={() => navigate(`/dashboard/organizations/${org.id}`)}
                />
              )
            })}
          </div>
        )}
      </div>

      {memberships.length > 0 && (
        <div className="sv-panel">
          <div className="sv-panel__head">
            <span className="sv-panel__title">All memberships</span>
            <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{memberships.length} total</span>
          </div>
          <div className="sv-table-wrap">
            <table className="sv-table" aria-label="Your memberships">
              <thead>
                <tr>
                  <th>Organization</th>
                  <th>Role</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {memberships.map((membership) => (
                  <MembershipRow key={membership.organization_id} membership={membership} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}
