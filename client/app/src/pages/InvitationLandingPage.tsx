import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { acceptInvitation, fetchInvitation, rejectInvitation } from '../lib/api'
import type { InvitationDetail } from '../types'
import '../styles/Dashboard.css'
import '../styles/LandingPage.css'

export function InvitationLandingPage({ token }: { token: string | null }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { invitationType, token: invitationToken } = useParams<{
    invitationType: 'organization' | 'course'
    token: string
  }>()
  const [invitation, setInvitation] = useState<InvitationDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const normalizedType = invitationType === 'course' ? 'course_instructor' : 'organization'
  const intendedAction = searchParams.get('action')

  useEffect(() => {
    if (!invitationToken) return
    setLoading(true)
    setError(null)
    fetchInvitation(invitationToken, normalizedType)
      .then(setInvitation)
      .catch((loadError: Error) => setError(loadError.message))
      .finally(() => setLoading(false))
  }, [invitationToken, normalizedType])

  const handleAccept = async () => {
    if (!invitationToken || !token) {
      navigate('/login')
      return
    }

    setWorking(true)
    setError(null)
    try {
      await acceptInvitation(token, invitationToken, normalizedType)
      navigate('/dashboard/invitations')
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Unable to accept invitation.')
    } finally {
      setWorking(false)
    }
  }

  const handleReject = async () => {
    if (!invitationToken) return
    setWorking(true)
    setError(null)
    try {
      await rejectInvitation(invitationToken, normalizedType)
      navigate('/')
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Unable to reject invitation.')
    } finally {
      setWorking(false)
    }
  }

  if (loading) {
    return (
      <div className="sv-public-shell">
        <main className="sv-public-main">
          <div className="sv-panel" style={{ maxWidth: 720, margin: '80px auto' }}>
            <div className="sv-skeleton" style={{ height: 24, width: 220, marginBottom: 12 }} />
            <div className="sv-skeleton" style={{ height: 14, width: '100%' }} />
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="sv-public-shell">
      <header className="sv-nav">
        <Link to="/" className="sv-nav__logo">
          Skill Verse
        </Link>
        <div className="sv-nav__actions">
          <Link className="btn btn--ghost" to="/login">Sign in</Link>
          <Link className="btn btn--solid" to="/register">Register</Link>
        </div>
      </header>

      <main className="sv-public-main">
        <div className="sv-panel" style={{ maxWidth: 760, margin: '48px auto' }}>
          <div className="sv-page-header">
            <p className="sv-section__eyebrow">
              {normalizedType === 'organization' ? 'Organization invitation' : 'Course instructor invitation'}
            </p>
            <h1 className="sv-page-header__title">{invitation?.title ?? 'Invitation unavailable'}</h1>
            <p className="sv-page-header__sub">
              {invitation
                ? normalizedType === 'organization'
                  ? `You were invited to join ${invitation.organization_name} with ${invitation.role} access.`
                  : `You were invited to teach ${invitation.course_title} for ${invitation.organization_name}.`
                : 'We could not load this invitation.'}
            </p>
          </div>

          {intendedAction && invitation ? (
            <p className="sv-inline-note" style={{ marginTop: 0, marginBottom: 12 }}>
              Use the buttons below to {intendedAction === 'accept' ? 'accept' : 'decline'} this invitation.
            </p>
          ) : null}

          {error && (
            <p className="sv-inline-error" role="alert">
              {error}
            </p>
          )}

          {invitation ? (
            <>
              <div className="sv-grid-2" style={{ marginBottom: 12 }}>
                <div className="sv-selector-card" style={{ marginTop: 0 }}>
                  <div className="sv-selector-card__title">Invitation details</div>
                  <div className="sv-settings-list" style={{ marginTop: 12 }}>
                    <div className="sv-course-detail-meta">
                      <strong>Email</strong>
                      <span>{invitation.invited_email}</span>
                    </div>
                    <div className="sv-course-detail-meta">
                      <strong>Expires</strong>
                      <span>{new Date(invitation.expires_at).toLocaleDateString()}</span>
                    </div>
                    {normalizedType === 'organization' ? (
                      <div className="sv-course-detail-meta">
                        <strong>Access</strong>
                        <span>{invitation.role}</span>
                      </div>
                    ) : (
                      <div className="sv-course-detail-meta">
                        <strong>Course</strong>
                        <span>{invitation.course_title}</span>
                      </div>
                    )}
                  </div>
                </div>

                {normalizedType === 'course_instructor' && invitation.custom_message ? (
                  <div className="sv-selector-card" style={{ marginTop: 0 }}>
                    <div className="sv-selector-card__title">Custom message</div>
                    <p className="sv-course-card__description" style={{ marginBottom: 0 }}>
                      {invitation.custom_message}
                    </p>
                  </div>
                ) : (
                  <div className="sv-selector-card" style={{ marginTop: 0 }}>
                    <div className="sv-selector-card__title">Next step</div>
                    <p className="sv-course-card__description" style={{ marginBottom: 0 }}>
                      {token
                        ? 'You can respond right away from this page.'
                        : 'Sign in with the invited email address to accept this invitation.'}
                    </p>
                  </div>
                )}
              </div>

              <div className="sv-invite-card__actions">
                <button className="btn btn--ghost" type="button" onClick={() => void handleReject()} disabled={working}>
                  {working ? 'Working...' : 'Decline'}
                </button>
                <button className="btn btn--blue" type="button" onClick={() => void handleAccept()} disabled={working}>
                  {token ? (working ? 'Working...' : 'Accept invitation') : 'Sign in to accept'}
                </button>
              </div>
            </>
          ) : (
            <div className="sv-empty">
              <div className="sv-empty__title">Invitation unavailable</div>
              <div className="sv-empty__sub">It may have expired or already been used.</div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
