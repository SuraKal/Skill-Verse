import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { loginUser, registerUser } from '../lib/api'
import '../styles/Auth.css'
import type { LoginResponse, RegisterPayload } from '../types'

function LogoMark({ size = 18 }: { size?: number }) {
  return (
    <div className="sv-auth__brand-mark" aria-hidden>
      <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
        <path d="M7 1L13 4.5V9.5L7 13L1 9.5V4.5L7 1Z" fill="hsl(0,0%,8%)" />
      </svg>
    </div>
  )
}

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
        <path
          d="M2 8s2.2-4 6-4 6 4 6 4-2.2 4-6 4-6-4-6-4Z"
          stroke="currentColor"
          strokeWidth="1.2"
        />
        <circle cx="8" cy="8" r="1.8" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    )
  }

  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M2 8s2.2-4 6-4c1.3 0 2.4.3 3.3.8M14 8s-2.2 4-6 4c-1.3 0-2.4-.3-3.3-.8"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <path d="M3 3l10 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function strengthLabel(password: string) {
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /\d/.test(password),
  ].filter(Boolean).length

  if (checks <= 1) {
    return { label: 'Weak password', tone: 'weak', score: 1 }
  }

  if (checks <= 3) {
    return { label: 'Fair password', tone: 'fair', score: 2 }
  }

  return { label: 'Strong password', tone: 'strong', score: 3 }
}

export function AuthPage({
  mode,
  onSuccess,
}: {
  mode: 'login' | 'register'
  onSuccess: (session: LoginResponse) => void
}) {
  const navigate = useNavigate()
  const isLogin = mode === 'login'
  const [form, setForm] = useState({
    email: '',
    password: '',
    username: '',
    first_name: '',
    last_name: '',
    confirm_password: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const passwordStrength = useMemo(
    () => strengthLabel(form.password),
    [form.password],
  )

  const handleChange =
    (field: keyof typeof form) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setForm((current) => ({ ...current, [field]: event.target.value }))
    }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      if (isLogin) {
        const session = await loginUser({
          email: form.email.trim(),
          password: form.password,
        })
        onSuccess(session)
        navigate('/dashboard', { replace: true })
        return
      }

      const payload: RegisterPayload = {
        email: form.email.trim(),
        password: form.password,
        confirm_password: form.confirm_password,
        username: form.username.trim(),
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
      }

      await registerUser(payload)
      const session = await loginUser({
        email: payload.email,
        password: payload.password,
      })
      onSuccess(session)
      navigate('/dashboard', { replace: true })
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : 'Unable to continue right now.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="sv-auth">
      <section className="sv-auth__panel">
        <div className="sv-auth__panel-bg" aria-hidden>
          <div className="sv-auth__orb sv-auth__orb--1" />
          <div className="sv-auth__orb sv-auth__orb--2" />
          <div className="sv-auth__orb sv-auth__orb--3" />
          <div className="sv-auth__grid" />
        </div>

        <div className="sv-auth__brand">
          <LogoMark />
          <span className="sv-auth__brand-name">SkillVerse</span>
        </div>

        <div className="sv-auth__quote">
          <p className="sv-auth__quote-text">
            Deliver training that feels <em>premium</em> from first invite to final certificate.
          </p>
          <div className="sv-auth__features">
            <div className="sv-auth__feature">
              <span className="sv-auth__feature-dot sv-auth__feature-dot--blue" />
              Organization-ready course delivery
            </div>
            <div className="sv-auth__feature">
              <span className="sv-auth__feature-dot sv-auth__feature-dot--teal" />
              Clean analytics for managers and instructors
            </div>
            <div className="sv-auth__feature">
              <span className="sv-auth__feature-dot sv-auth__feature-dot--green" />
              Smooth learner onboarding and progress tracking
            </div>
          </div>
        </div>
      </section>

      <section className="sv-auth__form-col">
        <div className="sv-auth__form-wrap">
          <div className="sv-auth__mobile-brand">
            <LogoMark size={16} />
            <span className="sv-auth__brand-name">SkillVerse</span>
          </div>

          <div className="sv-auth__header">
            <h1 className="sv-auth__title">
              {isLogin ? 'Welcome back' : 'Create your workspace'}
            </h1>
            <p className="sv-auth__subtitle">
              {isLogin
                ? 'Sign in to continue managing organizations, invitations, and learning programs.'
                : 'Start with a clean, modern training platform for teams, instructors, and learners.'}
            </p>
          </div>

          <form className="sv-auth__form" onSubmit={handleSubmit}>
            {!isLogin && (
              <>
                <div className="sv-field__row">
                  <div className="sv-field">
                    <label htmlFor="first_name">First name</label>
                    <input
                      id="first_name"
                      className="sv-field__input"
                      value={form.first_name}
                      onChange={handleChange('first_name')}
                      placeholder="Surafel"
                      required
                    />
                  </div>

                  <div className="sv-field">
                    <label htmlFor="last_name">Last name</label>
                    <input
                      id="last_name"
                      className="sv-field__input"
                      value={form.last_name}
                      onChange={handleChange('last_name')}
                      placeholder="Team"
                      required
                    />
                  </div>
                </div>

                <div className="sv-field">
                  <label htmlFor="username">Username</label>
                  <input
                    id="username"
                    className="sv-field__input"
                    value={form.username}
                    onChange={handleChange('username')}
                    placeholder="skillverse-admin"
                    required
                  />
                </div>
              </>
            )}

            <div className="sv-field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                className="sv-field__input"
                value={form.email}
                onChange={handleChange('email')}
                placeholder="you@example.com"
                required
              />
            </div>

            <div className="sv-field">
              <label htmlFor="password">Password</label>
              <div className="sv-field__input-wrap">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="sv-field__input sv-field__input--has-toggle"
                  value={form.password}
                  onChange={handleChange('password')}
                  placeholder={isLogin ? 'Enter your password' : 'Create a strong password'}
                  required
                />
                <button
                  className="sv-field__pw-toggle"
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <EyeIcon open={showPassword} />
                </button>
              </div>

              {!isLogin && form.password && (
                <div className="sv-pw-strength">
                  <div className="sv-pw-strength__bars" aria-hidden>
                    {[1, 2, 3].map((step) => (
                      <span
                        key={step}
                        className={`sv-pw-strength__bar${
                          passwordStrength.score >= step
                            ? ` sv-pw-strength__bar--${passwordStrength.tone}`
                            : ''
                        }`}
                      />
                    ))}
                  </div>
                  <span
                    className={`sv-pw-strength__label sv-pw-strength__label--${passwordStrength.tone}`}
                  >
                    {passwordStrength.label}
                  </span>
                </div>
              )}
            </div>

            {!isLogin && (
              <div className="sv-field">
                <label htmlFor="confirm_password">Confirm password</label>
                <div className="sv-field__input-wrap">
                  <input
                    id="confirm_password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="sv-field__input sv-field__input--has-toggle"
                    value={form.confirm_password}
                    onChange={handleChange('confirm_password')}
                    placeholder="Repeat your password"
                    required
                  />
                  <button
                    className="sv-field__pw-toggle"
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword((current) => !current)
                    }
                    aria-label={
                      showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'
                    }
                  >
                    <EyeIcon open={showConfirmPassword} />
                  </button>
                </div>
              </div>
            )}

            {error && <div className="sv-auth__error">{error}</div>}

            <button className="sv-auth__submit" type="submit" disabled={submitting}>
              {submitting && <span className="sv-spinner" aria-hidden />}
              {isLogin ? 'Sign in to SkillVerse' : 'Create account and continue'}
            </button>
          </form>

          <p className="sv-auth__footer-link">
            {isLogin ? 'New to SkillVerse?' : 'Already have an account?'}{' '}
            <Link to={isLogin ? '/register' : '/login'}>
              {isLogin ? 'Create an account' : 'Sign in'}
            </Link>
          </p>

          <p className="sv-auth__terms">
            By continuing, you agree to the platform terms, privacy expectations, and
            organization-level access rules.
          </p>
        </div>
      </section>
    </div>
  )
}
