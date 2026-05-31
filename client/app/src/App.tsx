import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState, type ReactNode } from 'react'

import { DashboardLayout } from './components/DashboardLayout'
import { fetchDashboard, subscribeToAuthSessionChanges } from './lib/api'
import { AuthPage } from './pages/AuthPage'
import {
  AnalyticsPage,
  InvitationsPage,
  MembersPage,
  OrganizationsPage,
  OrganizationsShowcasePage,
  SettingsPage,
} from './pages/DashboardSections'
import { DashboardPage } from './pages/DashboardPage'
import { InvitationLandingPage } from './pages/InvitationLandingPage'
import { LandingPage } from './pages/LandingPage'
import { CourseDetailPage } from './features/courses/pages/CourseDetailPage'
import { CoursesPage } from './features/courses/pages/CoursesPage'
import { OrgDashboardPage } from './features/organizations/pages/OrgDashboardPage'
import {
  SkillSwapChatPage,
  SkillSwapMatchesPage,
  SkillSwapSkillsPage,
} from './features/skillSwap/pages/SkillSwapPages'
import type { DashboardData, LoginResponse } from './types'

function RequireAuth({
  token,
  children,
}: {
  token: string | null
  children: ReactNode
}) {
  if (!token) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function getDashboardChrome(pathname: string) {
  if (pathname.startsWith('/dashboard/skill-swap/chat/')) {
    return {
      title: 'Skill Swap Chat',
      breadcrumb: 'Community / Private conversation',
    }
  }

  if (pathname.startsWith('/dashboard/skill-swap/chat')) {
    return {
      title: 'Skill Swap Chat',
      breadcrumb: 'Community / Private conversation',
    }
  }

  if (pathname.startsWith('/dashboard/skill-swap/matches')) {
    return {
      title: 'Skill Matches',
      breadcrumb: 'Community / Text-based matching',
    }
  }

  if (pathname.startsWith('/dashboard/skill-swap')) {
    return {
      title: 'Skill Swap',
      breadcrumb: 'Community / Skill exchange',
    }
  }

  if (pathname.startsWith('/dashboard/courses/')) {
    return {
      title: 'Course',
      breadcrumb: 'Learning / Course management',
    }
  }

  if (pathname.startsWith('/dashboard/courses')) {
    return {
      title: 'Courses',
      breadcrumb: 'Learning / Course workspace',
    }
  }

  if (pathname.startsWith('/dashboard/organizations/')) {
    return {
      title: 'Organization',
      breadcrumb: 'Workspace / Organization dashboard',
    }
  }

  if (pathname.startsWith('/dashboard/organizations')) {
    return {
      title: 'Organizations',
      breadcrumb: 'Workspace / Manage workspaces',
    }
  }

  if (pathname.startsWith('/dashboard/invitations')) {
    return {
      title: 'Invitations',
      breadcrumb: 'Overview / Pending invitations',
    }
  }

  if (pathname.startsWith('/dashboard/members')) {
    return {
      title: 'Members',
      breadcrumb: 'Workspace / Team visibility',
    }
  }

  if (pathname.startsWith('/dashboard/analytics')) {
    return {
      title: 'Analytics',
      breadcrumb: 'Overview / Performance snapshot',
    }
  }

  if (pathname.startsWith('/dashboard/settings')) {
    return {
      title: 'Settings',
      breadcrumb: 'Account / Profile and preferences',
    }
  }

  return {
    title: 'Dashboard',
    breadcrumb: 'Overview / Personal workspace',
  }
}

function DashboardShell({
  data,
  onSignOut,
}: {
  data: DashboardData | null
  onSignOut: () => void
}) {
  const location = useLocation()
  const navigate = useNavigate()
  const chrome = useMemo(
    () => getDashboardChrome(location.pathname),
    [location.pathname],
  )

  return (
    <DashboardLayout
      data={data}
      topBarTitle={chrome.title}
      topBarBreadcrumb={chrome.breadcrumb}
      onSignOut={onSignOut}
      onNewOrg={() => navigate('/dashboard/organizations?intent=create')}
    />
  )
}

export default function App() {
  const [session, setSession] = useState<LoginResponse | null>(null)
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem('access_token'),
  )
  const [dashData, setDashData] = useState<DashboardData | null>(null)

  useEffect(() => {
    return subscribeToAuthSessionChanges((nextAccessToken) => {
      setToken(nextAccessToken)

      if (!nextAccessToken) {
        setSession(null)
        setDashData(null)
        return
      }

      setSession((currentSession) => {
        if (!currentSession) {
          const rawUser = localStorage.getItem('session_user')
          if (!rawUser) {
            return null
          }

          try {
            return {
              access: nextAccessToken,
              refresh: localStorage.getItem('refresh_token') ?? '',
              user: JSON.parse(rawUser) as LoginResponse['user'],
            }
          } catch {
            localStorage.removeItem('session_user')
            return null
          }
        }

        return {
          ...currentSession,
          access: nextAccessToken,
          refresh: localStorage.getItem('refresh_token') ?? currentSession.refresh,
        }
      })
    })
  }, [])

  useEffect(() => {
    const rawUser = localStorage.getItem('session_user')
    if (!token || !rawUser) {
      return
    }

    try {
      const user = JSON.parse(rawUser) as LoginResponse['user']
      setSession({
        access: token,
        refresh: localStorage.getItem('refresh_token') ?? '',
        user,
      })
    } catch {
      localStorage.removeItem('session_user')
    }
  }, [token])

  useEffect(() => {
    if (!token) {
      setDashData(null)
      return
    }

    fetchDashboard(token)
      .then(setDashData)
      .catch(() => setDashData(null))
  }, [token])

  const handleSession = (nextSession: LoginResponse) => {
    localStorage.setItem('access_token', nextSession.access)
    localStorage.setItem('refresh_token', nextSession.refresh)
    localStorage.setItem('session_user', JSON.stringify(nextSession.user))
    setToken(nextSession.access)
    setSession(nextSession)
  }

  const handleSignOut = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('session_user')
    setToken(null)
    setSession(null)
    setDashData(null)
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/organizations" element={<OrganizationsShowcasePage />} />
        <Route path="/invite/:invitationType/:token" element={<InvitationLandingPage token={token} />} />
        <Route
          path="/login"
          element={
            token ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <AuthPage mode="login" onSuccess={handleSession} />
            )
          }
        />
        <Route
          path="/register"
          element={
            token ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <AuthPage mode="register" onSuccess={handleSession} />
            )
          }
        />
        <Route
          path="/dashboard"
          element={
            <RequireAuth token={token}>
              <DashboardShell data={dashData} onSignOut={handleSignOut} />
            </RequireAuth>
          }
        >
          <Route index element={token ? <DashboardPage token={token} /> : null} />
          <Route
            path="analytics"
            element={token ? <AnalyticsPage token={token} dashboard={dashData} /> : null}
          />
          <Route
            path="organizations"
            element={token ? <OrganizationsPage token={token} onSession={handleSession} /> : null}
          />
          <Route
            path="organizations/:organizationId"
            element={token ? <OrgDashboardPage token={token} /> : null}
          />
          <Route
            path="courses"
            element={token ? <CoursesPage token={token} /> : null}
          />
          <Route
            path="courses/:courseId"
            element={token ? <CourseDetailPage token={token} /> : null}
          />
          <Route
            path="skill-swap"
            element={token ? <SkillSwapSkillsPage token={token} /> : null}
          />
          <Route
            path="skill-swap/matches"
            element={token ? <SkillSwapMatchesPage token={token} /> : null}
          />
          <Route
            path="skill-swap/chat"
            element={token ? <SkillSwapChatPage token={token} /> : null}
          />
          <Route
            path="skill-swap/chat/:threadId"
            element={token ? <SkillSwapChatPage token={token} /> : null}
          />
          <Route
            path="invitations"
            element={token ? <InvitationsPage token={token} onSession={handleSession} /> : null}
          />
          <Route path="members" element={token ? <MembersPage token={token} /> : null} />
          <Route
            path="settings"
            element={token ? <SettingsPage token={token} onSession={handleSession} /> : null}
          />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
        <Route
          path="*"
          element={<Navigate to={session ? '/dashboard' : '/'} replace />}
        />
      </Routes>
    </BrowserRouter>
  )
}
