import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { Avatar, Icon, initials } from '../../../components/DashboardLayout'
import {
  fetchSkillSwapDashboard,
  fetchSkillSwapThread,
  sendSkillSwapMessage,
  updateSkillSwapProfile,
} from '../../../lib/api/skillSwap'
import type {
  SkillChatThread,
  SkillSwapDashboardData,
  SkillSwapMatch,
  SkillSwapProfileUpdatePayload,
} from '../../../types'
import '../../../styles/Dashboard.css'
import '../../../styles/SitePages.css'

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

function SkillChip({ label }: { label: string }) {
  return <span className="sv-mini-pill">{label}</span>
}

function MatchCard({
  match,
  onOpenChat,
}: {
  match: SkillSwapMatch
  onOpenChat: () => void
}) {
  const teacher = match.teaching_user
  const learner = match.learning_user

  return (
    <article className="sv-panel" style={{ padding: 16 }}>
      <div className="sv-panel__head">
        <div>
          <span className="sv-panel__title">{match.matched_skill}</span>
          <div className="sv-page-header__sub">Skill swap match</div>
        </div>
        <span className="sv-status sv-status--accepted">Matched</span>
      </div>
      <div className="sv-grid-2" style={{ marginBottom: 12 }}>
        <div className="sv-member-row" style={{ borderBottom: 'none', padding: 0 }}>
          <div className="sv-table__user">
            <Avatar name={teacher.full_name || teacher.username} size="sm" />
            <div>
              <div className="sv-table__user-name">Teaches: {teacher.full_name || teacher.username}</div>
              <div className="sv-table__user-email">{teacher.email}</div>
            </div>
          </div>
        </div>
        <div className="sv-member-row" style={{ borderBottom: 'none', padding: 0 }}>
          <div className="sv-table__user">
            <Avatar name={learner.full_name || learner.username} size="sm" />
            <div>
              <div className="sv-table__user-name">Learns: {learner.full_name || learner.username}</div>
              <div className="sv-table__user-email">{learner.email}</div>
            </div>
          </div>
        </div>
      </div>
      <div className="sv-perm-chips" style={{ marginBottom: 14 }}>
        <SkillChip label={`Teach: ${match.teaching_text}`} />
        <SkillChip label={`Learn: ${match.learning_text}`} />
        <SkillChip label={`Score: ${match.match_score}`} />
      </div>
      <button className="btn btn--blue btn--sm" onClick={onOpenChat} disabled={!match.chat_thread_id}>
        {match.chat_thread_id ? 'Open chat' : 'Chat not ready'}
      </button>
    </article>
  )
}

function ThreadSidebar({
  threads,
  activeThreadId,
  onOpenThread,
}: {
  threads: SkillChatThread[]
  activeThreadId: string | null
  onOpenThread: (threadId: string) => void
}) {
  return (
    <div className="sv-thread-list">
      {threads.map((thread) => {
        const match = thread.match
        const partner = match.teaching_user
        const active = thread.id === activeThreadId
        const lastMessage = thread.messages.at(-1)

        return (
          <button
            key={thread.id}
            className={`sv-thread-card${active ? ' sv-thread-card--active' : ''}`}
            onClick={() => onOpenThread(thread.id)}
          >
            <div className="sv-thread-card__icon">{initials(partner.full_name || partner.username)}</div>
            <div className="sv-thread-card__body">
              <div className="sv-thread-card__title">{match.matched_skill}</div>
              <div className="sv-thread-card__meta">
                {match.teaching_user.full_name || match.teaching_user.username} · {match.learning_user.full_name || match.learning_user.username}
              </div>
              <div className="sv-thread-card__preview">
                {lastMessage?.body ?? 'No messages yet'}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

function SkillStats({
  dashboard,
}: {
  dashboard: SkillSwapDashboardData | null
}) {
  return (
    <div className="sv-metrics">
      <div className="sv-metric">
        <div className="sv-metric__header">
          <span className="sv-metric__label">Teach skills</span>
          <span className="sv-metric__icon"><Icon.Swap /></span>
        </div>
        <div className="sv-metric__value">{dashboard?.stats.teach_count ?? 0}</div>
        <div className="sv-metric__note">Skills you can offer</div>
      </div>
      <div className="sv-metric">
        <div className="sv-metric__header">
          <span className="sv-metric__label">Learn skills</span>
          <span className="sv-metric__icon"><Icon.Chat /></span>
        </div>
        <div className="sv-metric__value">{dashboard?.stats.learn_count ?? 0}</div>
        <div className="sv-metric__note">Skills you want to pick up</div>
      </div>
      <div className="sv-metric">
        <div className="sv-metric__header">
          <span className="sv-metric__label">Matches</span>
          <span className="sv-metric__icon"><Icon.Users /></span>
        </div>
        <div className="sv-metric__value">{dashboard?.stats.match_count ?? 0}</div>
        <div className="sv-metric__note">Text-based pairings</div>
      </div>
    </div>
  )
}

export function SkillSwapSkillsPage({ token }: { token: string }) {
  const navigate = useNavigate()
  const [dashboard, setDashboard] = useState<SkillSwapDashboardData | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<SkillSwapProfileUpdatePayload>({
    teach_skills: '',
    learn_skills: '',
    summary: '',
  })

  const load = () => {
    fetchSkillSwapDashboard(token)
      .then((data) => {
        setDashboard(data)
        setForm({
          teach_skills: data.profile?.teach_skills ?? '',
          learn_skills: data.profile?.learn_skills ?? '',
          summary: data.profile?.summary ?? '',
        })
      })
      .catch(() => setDashboard(null))
  }

  useEffect(load, [token])

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError(null)

    try {
      await updateSkillSwapProfile(token, form)
      load()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to update skill profile.')
    } finally {
      setSaving(false)
    }
  }

  const currentProfile = dashboard?.profile
  const teachSkills = currentProfile?.teach_skills_list ?? []
  const learnSkills = currentProfile?.learn_skills_list ?? []
  const matches = dashboard?.matches ?? []

  return (
    <>
      <SectionIntro
        eyebrow="Skill exchange"
        title="List what you can teach and what you want to learn"
        description="Skill Swap matches people by shared skill text and opens a private chat once a pair is found."
      />

      <SkillStats dashboard={dashboard} />

      <div className="sv-grid-2">
        <div className="sv-panel">
          <div className="sv-panel__head">
            <span className="sv-panel__title">Your skill profile</span>
            <span className="sv-status sv-status--accepted">Separate from courses</span>
          </div>

          <form className="sv-dashboard-form" onSubmit={handleSave}>
            <label className="sv-field">
              <span>Skills you can teach</span>
              <textarea
                className="sv-input sv-input--textarea"
                rows={5}
                value={form.teach_skills}
                onChange={(event) =>
                  setForm((current) => ({ ...current, teach_skills: event.target.value }))
                }
                placeholder="Guitar, Piano, English"
              />
            </label>

            <label className="sv-field">
              <span>Skills you want to learn</span>
              <textarea
                className="sv-input sv-input--textarea"
                rows={5}
                value={form.learn_skills}
                onChange={(event) =>
                  setForm((current) => ({ ...current, learn_skills: event.target.value }))
                }
                placeholder="Spanish, Python, Design"
              />
            </label>

            <label className="sv-field">
              <span>Short summary</span>
              <textarea
                className="sv-input sv-input--textarea"
                rows={4}
                value={form.summary}
                onChange={(event) =>
                  setForm((current) => ({ ...current, summary: event.target.value }))
                }
                placeholder="Tell people what kind of swap you want."
              />
            </label>

            {error && <div className="sv-auth__error">{error}</div>}
            <button className="btn btn--blue btn--sm" type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save skill profile'}
            </button>
          </form>
        </div>

        <div className="sv-panel">
          <div className="sv-panel__head">
            <span className="sv-panel__title">Your current profile</span>
            {dashboard?.stats.profile_completed ? (
              <span className="sv-status sv-status--accepted">Live</span>
            ) : (
              <span className="sv-status sv-status--pending">Empty</span>
            )}
          </div>
          <div className="sv-selector-card">
            <div className="sv-selector-card__title">Teach</div>
            <div className="sv-check-grid">
              {teachSkills.length > 0 ? teachSkills.map((skill) => <SkillChip key={skill} label={skill} />) : (
                <span className="sv-selector-card__sub">No teach skills listed yet.</span>
              )}
            </div>
          </div>
          <div className="sv-selector-card">
            <div className="sv-selector-card__title">Learn</div>
            <div className="sv-check-grid">
              {learnSkills.length > 0 ? learnSkills.map((skill) => <SkillChip key={skill} label={skill} />) : (
                <span className="sv-selector-card__sub">No learning goals listed yet.</span>
              )}
            </div>
          </div>
          <div className="sv-divider" />
          <div className="sv-panel__sub">
            Matching is exact text for now, so using the same wording like <strong>Guitar</strong> on both sides will create a pair automatically.
          </div>
        </div>
      </div>

      <div className="sv-panel">
        <div className="sv-panel__head">
          <span className="sv-panel__title">Recent matches</span>
          <Link className="sv-panel__action" to="/dashboard/skill-swap/matches">
            View all
          </Link>
        </div>
        {matches.length === 0 ? (
          <div className="sv-empty" style={{ padding: '24px 0' }}>
            <div className="sv-empty__title">No matches yet</div>
            <div className="sv-empty__sub">Add a few skills and the matcher will pair them up.</div>
          </div>
        ) : (
          <div className="sv-course-list">
            {matches.slice(0, 3).map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                onOpenChat={() => {
                  if (match.chat_thread_id) {
                    navigate(`/dashboard/skill-swap/chat/${match.chat_thread_id}`)
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>
    </>
  )
}

export function SkillSwapMatchesPage({ token }: { token: string }) {
  const navigate = useNavigate()
  const [dashboard, setDashboard] = useState<SkillSwapDashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchSkillSwapDashboard(token).then(setDashboard).catch((loadError) => {
      setDashboard(null)
      setError(loadError instanceof Error ? loadError.message : 'Unable to load skill matches.')
    })
  }, [token])

  const matches = dashboard?.matches ?? []

  return (
    <>
      <SectionIntro
        eyebrow="Skill matches"
        title="See who can teach what you want to learn"
        description="The feature compares text for now, so matching is immediate and easy to audit."
      />

      {error && <div className="sv-auth__error" style={{ marginBottom: 12 }}>{error}</div>}

      {matches.length === 0 ? (
        <div className="sv-panel">
          <div className="sv-empty">
            <div className="sv-empty__title">No skill matches yet</div>
            <div className="sv-empty__sub">Add matching skills in your profile to generate a chat pair.</div>
          </div>
        </div>
      ) : (
        <div className="sv-course-list">
          {matches.map((match) => (
            <MatchCard
              key={match.id}
              match={match}
              onOpenChat={() => {
                if (match.chat_thread_id) {
                  navigate(`/dashboard/skill-swap/chat/${match.chat_thread_id}`)
                }
              }}
            />
          ))}
        </div>
      )}
    </>
  )
}

export function SkillSwapChatPage({ token }: { token: string }) {
  const navigate = useNavigate()
  const params = useParams()
  const [dashboard, setDashboard] = useState<SkillSwapDashboardData | null>(null)
  const [thread, setThread] = useState<SkillChatThread | null>(null)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const threadId = params.threadId ?? null

  const loadDashboard = () => {
    fetchSkillSwapDashboard(token).then((data) => {
      setDashboard(data)
      const firstThread = data.threads[0]
      if (!threadId && firstThread) {
        navigate(`/dashboard/skill-swap/chat/${firstThread.id}`, { replace: true })
      }
    }).catch(() => setDashboard(null))
  }

  useEffect(loadDashboard, [token, threadId, navigate])

  useEffect(() => {
    if (!threadId) return

    fetchSkillSwapThread(token, threadId)
      .then(setThread)
      .catch(() => setThread(null))
  }, [token, threadId])

  const activeThread =
    threadId && thread?.id === threadId
      ? thread
      : dashboard?.threads.find((item) => item.id === threadId) ?? null
  const messages = thread?.messages ?? activeThread?.messages ?? []
  const activeMatch = activeThread?.match

  const handleSend = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!threadId || !message.trim()) {
      return
    }

    setSending(true)
    setError(null)

    try {
      await sendSkillSwapMessage(token, threadId, message.trim())
      setMessage('')
      const refreshed = await fetchSkillSwapThread(token, threadId)
      setThread(refreshed)
      loadDashboard()
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Unable to send message.')
    } finally {
      setSending(false)
    }
  }

  const threadLabel = useMemo(() => {
    if (!activeMatch) {
      return 'Select a match'
    }
    return `${activeMatch.matched_skill} chat`
  }, [activeMatch])

  return (
    <>
      <SectionIntro
        eyebrow="Skill chat"
        title={threadLabel}
        description="A dedicated conversation space for skill exchange, separated from course discussions."
      />

      <div className="sv-grid-2">
        <div className="sv-panel">
          <div className="sv-panel__head">
            <span className="sv-panel__title">Chats</span>
            <span className="sv-page-header__sub">{dashboard?.threads.length ?? 0} threads</span>
          </div>
          <ThreadSidebar
            threads={dashboard?.threads ?? []}
            activeThreadId={threadId}
            onOpenThread={(nextThreadId) => navigate(`/dashboard/skill-swap/chat/${nextThreadId}`)}
          />
        </div>

        <div className="sv-panel">
          {activeThread ? (
            <>
              <div className="sv-panel__head">
                <div>
                  <span className="sv-panel__title">{activeMatch?.matched_skill}</span>
                  <div className="sv-page-header__sub">
                    {activeMatch?.teaching_user.full_name || activeMatch?.teaching_user.username} teaches,{' '}
                    {activeMatch?.learning_user.full_name || activeMatch?.learning_user.username} learns
                  </div>
                </div>
                <span className="sv-status sv-status--accepted">Open</span>
              </div>

              <div className="sv-chat-window">
                <div className="sv-chat-messages">
                  {messages.map((item) => {
                    const isMine = item.sender.email === dashboard?.profile?.user.email
                    return (
                      <div key={item.id} className={`sv-chat-message${isMine ? ' sv-chat-message--mine' : ''}`}>
                        <div className="sv-chat-message__bubble">{item.body}</div>
                        <div className="sv-chat-message__meta">
                          {item.sender.full_name || item.sender.username} · {new Date(item.created_at).toLocaleString()}
                        </div>
                      </div>
                    )
                  })}
                </div>

                <form className="sv-chat-composer" onSubmit={handleSend}>
                  <textarea
                    className="sv-input sv-input--textarea"
                    rows={3}
                    placeholder="Write a message to your match..."
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                  />
                  {error && <div className="sv-auth__error">{error}</div>}
                  <button className="btn btn--blue btn--sm" type="submit" disabled={sending}>
                    {sending ? 'Sending...' : 'Send message'}
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="sv-empty">
              <div className="sv-empty__title">No chat selected</div>
              <div className="sv-empty__sub">Open a match to start the conversation.</div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
