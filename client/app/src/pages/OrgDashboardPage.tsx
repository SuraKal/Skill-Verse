// pages/OrgDashboardPage.tsx
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { fetchOrganizationDashboard, sendOrganizationInvitation } from '../lib/api'
import type {
  OrganizationDashboardData,
  MembershipRecord,
  OrganizationInvitation,
} from '../types'
import { Avatar, Icon } from '../components/DashboardLayout'
import '../styles/Dashboard.css'

// ── Metric card (local reuse) ───────────────────────────────────────────────
function MetricCard({
  label,
  value,
  note,
  icon,
}: {
  label: string
  value: string | number
  note?: string
  icon: React.ReactNode
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

// ── Member row ─────────────────────────────────────────────────────────────
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
        <span
          className={`sv-role-badge sv-role-badge--${role.toLowerCase()}`}
        >
          {role}
        </span>
      </td>
      <td style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>{joined}</td>
      <td>
        {canManage && (
          <button
            className="btn btn--ghost btn--sm"
            aria-label={`Manage ${user.full_name || user.username}`}
          >
            Manage
          </button>
        )}
      </td>
    </tr>
  )
}

// ── Invitation row ─────────────────────────────────────────────────────────
function InvitationRow({
  inv,
}: {
  inv: OrganizationInvitation
}) {
  const sent = new Date(inv.date_sent).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
  const expires = new Date(inv.expires_at).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
  const isExpired = new Date(inv.expires_at) < new Date()
  const statusKey =
    isExpired && inv.status === 'pending' ? 'expired' : inv.status

  return (
    <tr>
      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
        {inv.invited_email}
      </td>
      <td>
        <span className={`sv-role-badge sv-role-badge--${inv.role.toLowerCase()}`}>
          {inv.role}
        </span>
      </td>
      <td style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>{sent}</td>
      <td style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>{expires}</td>
      <td>
        <span className={`sv-status sv-status--${statusKey}`}>{statusKey}</span>
      </td>
    </tr>
  )
}

// ── Invite form ─────────────────────────────────────────────────────────────
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
          <option value="instructor">Instructor</option>
          <option value="manager">Manager</option>
        </select>
        <button
          className="btn btn--blue btn--sm"
          onClick={handleSubmit}
          disabled={sending || !email.trim()}
          aria-busy={sending}
        >
          {sending ? 'Sending…' : 'Send invite'}
        </button>
      </div>
      {error && (
        <p
          style={{ fontSize: 12, color: 'var(--accent-red)', marginTop: 8 }}
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  )
}

// ── Permissions panel ──────────────────────────────────────────────────────
function PermissionsPanel({
  permissions,
}: {
  permissions: OrganizationDashboardData['permissions']
}) {
  const chips = [
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
        {chips.map((c) => (
          <span
            key={c.label}
            className={`sv-perm-chip${c.active ? ' sv-perm-chip--active' : ''}`}
          >
            {c.active ? '✓' : '–'} {c.label}
          </span>
        ))}
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────
export function OrgDashboardPage({ token }: { token: string }) {
  const { organizationId } = useParams<{ organizationId: string }>()
  const [data, setData] = useState<OrganizationDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = () => {
    if (!organizationId) return
    setLoading(true)
    fetchOrganizationDashboard(token, organizationId)
      .then(setData)
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
          {[1, 2, 3].map((i) => (
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
        <div className="sv-empty__icon" aria-hidden>⚠</div>
        <div className="sv-empty__title">Failed to load organization</div>
        <div className="sv-empty__sub">{error}</div>
      </div>
    )
  }

  if (!data) return null

  const { organization, members, invitations, permissions, stats } = data
  const canInvite = permissions.can_manage_invitations
  const canManageMembers = permissions.can_manage_members

  return (
    <>
      {/* Page header */}
      <div className="sv-page-header">
        <h1 className="sv-page-header__title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {organization.name}
          {organization.is_verified && (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-label="Verified">
              <circle cx="9" cy="9" r="8.5" fill="#0070f3"/>
              <path d="M5.5 9l2.5 2.5 4.5-5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </h1>
        <p className="sv-page-header__sub">{organization.description || organization.email}</p>
      </div>

      {/* Metrics */}
      <div className="sv-metrics" style={{ marginBottom: 16 }}>
        <MetricCard
          label="Members"
          value={stats.member_count}
          note="Total members"
          icon={<Icon.Users />}
        />
        <MetricCard
          label="Pending invites"
          value={stats.pending_invitation_count}
          note={stats.pending_invitation_count === 0 ? 'None pending' : 'Awaiting response'}
          icon={<Icon.Mail />}
        />
        <MetricCard
          label="Managers"
          value={stats.manager_count}
          note="Can manage org"
          icon={<Icon.Chart />}
        />
      </div>

      {/* Permissions */}
      <div style={{ marginBottom: 12 }}>
        <PermissionsPanel permissions={permissions} />
      </div>

      {/* Members table */}
      <div className="sv-panel" style={{ marginBottom: 12 }}>
        <div className="sv-panel__head">
          <span className="sv-panel__title">Members</span>
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
            {members.length} total
          </span>
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
                {members.map((m) => (
                  <MemberRow key={m.id} record={m} canManage={canManageMembers} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invitations */}
      <div className="sv-panel">
        <div className="sv-panel__head">
          <span className="sv-panel__title">Invitations</span>
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
            {invitations.length} sent
          </span>
        </div>

        {canInvite && organizationId && (
          <>
            <InviteForm orgId={organizationId} token={token} onSent={load} />
            <div className="sv-divider" />
          </>
        )}

        {invitations.length === 0 ? (
          <div className="sv-empty" style={{ padding: '20px 0' }}>
            <div className="sv-empty__icon" aria-hidden><Icon.Mail /></div>
            <div className="sv-empty__title">No invitations sent</div>
            <div className="sv-empty__sub">Invite team members above.</div>
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
    </>
  )
}
