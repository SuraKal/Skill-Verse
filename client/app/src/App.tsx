// App.tsx — router wiring example
// Drop this into your existing router setup or adapt as needed.
//
// Assumes:
//   - react-router-dom v6
//   - A useAuth() hook or similar that exposes { token, user, signOut }
//   - fetchDashboard / fetchOrganizationDashboard imported from api.ts

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";

import { LandingPage } from "./pages/LandingPage";
import { DashboardLayout } from "./components/DashboardLayout";
import { DashboardPage } from "./pages/DashboardPage";
import { OrgDashboardPage } from "./pages/OrgDashboardPage";
import { fetchDashboard } from "./lib/api";
import type { DashboardData } from "./types";

// Import global styles first
import "./styles/globals.css";

// ── Auth guard ──────────────────────────────────────────────────────────────
function RequireAuth({
  token,
  children,
}: {
  token: string | null;
  children: React.ReactNode;
}) {
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

// ── Root app ─────────────────────────────────────────────────────────────────
export default function App() {
  // Replace with your real auth state management (Zustand, Context, etc.)
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem("access_token"),
  );
  const [dashData, setDashData] = useState<DashboardData | null>(null);

  // Prefetch dashboard data when token is available so sidebar is populated
  useEffect(() => {
    if (!token) {
      setDashData(null);
      return;
    }
    fetchDashboard(token)
      .then(setDashData)
      .catch(() => setDashData(null));
  }, [token]);

  const handleSignOut = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setToken(null);
    setDashData(null);
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />

        {/* Auth pages — build these separately */}
        <Route path="/login" element={<div>Login page</div>} />
        <Route path="/register" element={<div>Register page</div>} />

        {/* Dashboard shell with sidebar */}
        <Route
          path="/dashboard"
          element={
            <RequireAuth token={token}>
              <DashboardLayout
                data={dashData}
                topBarTitle="Dashboard"
                onSignOut={handleSignOut}
                onNewOrg={() => {
                  /* open create org modal */
                }}
              />
            </RequireAuth>
          }
        >
          {/* Index — personal dashboard */}
          <Route
            index
            element={token ? <DashboardPage token={token} /> : null}
          />

          {/* Organizations list */}
          <Route path="organizations" element={<div>Organizations page</div>} />

          {/* Organization detail dashboard */}
          <Route
            path="organizations/:organizationId"
            element={token ? <OrgDashboardPage token={token} /> : null}
          />

          {/* Invitations */}
          <Route path="invitations" element={<div>Invitations page</div>} />

          {/* Settings */}
          <Route path="settings" element={<div>Settings page</div>} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

// ── File structure produced ───────────────────────────────────────────────
//
//  src/
//  ├── styles/
//  │   ├── globals.css          ← design tokens, reset, scrollbar
//  │   ├── LandingPage.css      ← nav, hero, feature grid, CTA band
//  │   ├── DashboardLayout.css  ← shell, sidebar, topbar
//  │   └── Dashboard.css        ← metrics, panels, tables, forms
//  │
//  ├── components/
//  │   └── DashboardLayout.tsx  ← sidebar + topbar shell (renders <Outlet>)
//  │                               exports: DashboardLayout, Avatar, Icon, initials
//  │
//  ├── pages/
//  │   ├── LandingPage.tsx      ← fetchPublicBootstrap() → modules, tagline
//  │   ├── DashboardPage.tsx    ← fetchDashboard() → orgs, invites, stats
//  │   └── OrgDashboardPage.tsx ← fetchOrganizationDashboard() → members, invites
//  │
//  └── App.tsx                  ← router wiring (this file)
