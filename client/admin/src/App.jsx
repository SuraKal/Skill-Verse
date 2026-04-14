import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import PageNotFound from "./lib/PageNotFound";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import UserNotRegisteredError from "@/components/UserNotRegisteredError";

import AdminLayout from "@/components/layout/AdminLayout";
import Dashboard from "@/pages/Dashboard";
import UserManagement from "@/pages/UserManagement";
import CourseManagement from "@/pages/CourseManagement";
import AssessmentManagement from "@/pages/AssessmentManagement";
import CertificateManagement from "@/pages/CertificateManagement";
import JobManagement from "@/pages/JobManagement";
import CommunityManagement from "@/pages/CommunityManagement";
import EventManagement from "@/pages/EventManagement";
import SkillExchange from "@/pages/SkillExchange";
import PlatformSettings from "@/pages/PlatformSettings";
import AdminManagement from "@/pages/AdminManagement";

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } =
    useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === "user_not_registered") {
      return <UserNotRegisteredError />;
    } else if (authError.type === "auth_required") {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/users" element={<UserManagement />} />
        <Route path="/admins" element={<AdminManagement />} />
        <Route path="/courses" element={<CourseManagement />} />
        <Route path="/assessments" element={<AssessmentManagement />} />
        <Route path="/certificates" element={<CertificateManagement />} />
        <Route path="/jobs" element={<JobManagement />} />
        <Route path="/communities" element={<CommunityManagement />} />
        <Route path="/events" element={<EventManagement />} />
        <Route path="/skill-exchange" element={<SkillExchange />} />
        <Route path="/settings" element={<PlatformSettings />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
