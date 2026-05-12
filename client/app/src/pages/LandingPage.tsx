// pages/LandingPage.tsx
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { fetchPublicBootstrap } from '../lib/api'
import type { PlatformBootstrap, PlatformModule } from '../types'
import '../styles/LandingPage.css'

// ── Logo mark ──────────────────────────────────────────────────────────────
function LogoMark({ size = 26 }: { size?: number }) {
  return (
    <div className="sv-nav__mark" style={{ width: size, height: size }}>
      <svg width={size * 0.54} height={size * 0.54} viewBox="0 0 14 14" fill="none">
        <path
          d="M7 1L13 4.5V9.5L7 13L1 9.5V4.5L7 1Z"
          fill={`hsl(0,0%,8%)`}
        />
      </svg>
    </div>
  )
}

// ── Navbar ─────────────────────────────────────────────────────────────────
function Navbar({ platformName }: { platformName: string }) {
  const navigate = useNavigate()

  return (
    <nav className="sv-nav">
      <div className="sv-nav__logo">
        <LogoMark />
        {platformName}
      </div>

      <div className="sv-nav__links">
        <button className="sv-nav__link">Features</button>
        <button className="sv-nav__link">Organizations</button>
        <button className="sv-nav__link">Docs</button>
        <button className="sv-nav__link">Blog</button>
      </div>

      <div className="sv-nav__actions">
        <button className="btn btn--ghost" onClick={() => navigate('/login')}>
          Sign in
        </button>
        <button className="btn btn--solid" onClick={() => navigate('/register')}>
          Get started
        </button>
      </div>
    </nav>
  )
}

// ── Hero ───────────────────────────────────────────────────────────────────
function Hero({ tagline }: { tagline: string }) {
  const navigate = useNavigate()

  return (
    <section className="sv-hero">
      <div className="sv-hero__glow" aria-hidden />
      <div className="sv-hero__glow2" aria-hidden />

      <div className="sv-hero__badge">
        <span className="sv-hero__badge-dot" />
        Platform is live — organizations open now
      </div>

      <h1 className="sv-hero__h1">
        <em>
          {tagline
            ? tagline
            : 'Build. Deliver.\nCertify.'}
        </em>
      </h1>

      <p className="sv-hero__sub">
        The modern LMS for organizations that want complete control
        and learners who expect a world-class experience.
      </p>

      <div className="sv-hero__ctas">
        <button className="btn btn--primary" onClick={() => navigate('/register')}>
          Start for free
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <button className="btn btn--outline" onClick={() => navigate('/organizations')}>
          Open workspace
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden>
            <path d="M5 2h7v7M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      <div className="sv-hero__terminal" role="presentation">
        <span className="sv-hero__terminal-prompt">▲</span>
        <span className="sv-hero__terminal-cmd">npx create-skillverse-app@latest</span>
        <span className="sv-hero__terminal-cursor" aria-hidden />
      </div>
    </section>
  )
}

// ── Feature grid ───────────────────────────────────────────────────────────
const STATIC_FEATURES = [
  {
    icon: '🌐',
    title: 'Public storefront',
    desc: 'Showcase published courses with curriculum previews, star ratings, and clear enrollment calls-to-action.',
  },
  {
    icon: '🏢',
    title: 'Organization control',
    desc: 'Managers and instructors own course creation, delivery, and team operations — all under one workspace.',
  },
  {
    icon: '🎓',
    title: 'Real learner flow',
    desc: 'Track lecture completion, resume from the last lesson, take assessments, and earn completion certificates.',
  },
]

function FeatureGrid() {
  return (
    <div className="sv-features" role="list">
      {STATIC_FEATURES.map((f) => (
        <article key={f.title} className="sv-feature-card" role="listitem">
          <div className="sv-feature-card__icon" aria-hidden>{f.icon}</div>
          <h3 className="sv-feature-card__title">{f.title}</h3>
          <p className="sv-feature-card__desc">{f.desc}</p>
        </article>
      ))}
    </div>
  )
}

// ── Stats ──────────────────────────────────────────────────────────────────
function StatsStrip() {
  return (
    <div className="sv-stats" aria-label="Platform highlights">
      <div className="sv-stat">
        <div className="sv-stat__value sv-stat__value--blue">12k+</div>
        <div className="sv-stat__label">Active learners</div>
      </div>
      <div className="sv-stat">
        <div className="sv-stat__value sv-stat__value--teal">380+</div>
        <div className="sv-stat__label">Published courses</div>
      </div>
      <div className="sv-stat">
        <div className="sv-stat__value sv-stat__value--green">98%</div>
        <div className="sv-stat__label">Satisfaction rate</div>
      </div>
    </div>
  )
}

// ── Module card ────────────────────────────────────────────────────────────
function ModuleCard({ module: m }: { module: PlatformModule }) {
  return (
    <article className="sv-module-card">
      <div className="sv-module-card__header">
        <h3 className="sv-module-card__name">{m.name}</h3>
        <span className={`sv-badge sv-badge--${m.status}`}>
          {m.status}
        </span>
      </div>
      <p className="sv-module-card__desc">{m.description}</p>
    </article>
  )
}

// ── CTA band ───────────────────────────────────────────────────────────────
function CtaBand() {
  const navigate = useNavigate()

  return (
    <div className="sv-cta-band">
      <h2 className="sv-cta-band__title">Ready to build your first course?</h2>
      <p className="sv-cta-band__sub">
        Create an organization, invite instructors, and publish curriculum in minutes.
      </p>
      <div className="sv-cta-band__actions">
        <button className="btn btn--primary" onClick={() => navigate('/register')}>
          Create your workspace
        </button>
        <button className="btn btn--ghost" onClick={() => navigate('/login')}>
          Sign in instead
        </button>
      </div>
    </div>
  )
}

// ── Footer ─────────────────────────────────────────────────────────────────
function Footer({ platformName }: { platformName: string }) {
  return (
    <footer className="sv-footer">
      <span className="sv-footer__copy">
        © {new Date().getFullYear()} {platformName}. All rights reserved.
      </span>
      <nav className="sv-footer__links" aria-label="Footer navigation">
        {['Privacy', 'Terms', 'Docs', 'Status'].map((l) => (
          <span key={l} className="sv-footer__link">{l}</span>
        ))}
      </nav>
    </footer>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────
export function LandingPage() {
  const [bootstrap, setBootstrap] = useState<PlatformBootstrap | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPublicBootstrap()
      .then(setBootstrap)
      .catch(() => setBootstrap(null))
      .finally(() => setLoading(false))
  }, [])

  const platformName = bootstrap?.platform_name ?? 'SkillVerse'
  const tagline = bootstrap?.platform_tagline ?? ''
  const modules = bootstrap?.modules ?? []

  return (
    <>
      <Navbar platformName={platformName} />

      <main>
        <Hero tagline={tagline} />
        <FeatureGrid />
        <StatsStrip />

        {/* Platform modules from API */}
        {!loading && modules.length > 0 && (
          <section className="sv-section">
            <div className="sv-section__head">
              <div>
                <p className="sv-section__eyebrow">What's included</p>
                <h2 className="sv-section__title">Platform modules</h2>
              </div>
            </div>
            <div className="sv-modules-grid">
              {modules.map((m) => (
                <ModuleCard key={m.name} module={m} />
              ))}
            </div>
          </section>
        )}

        <CtaBand />
      </main>

      <Footer platformName={platformName} />
    </>
  )
}
