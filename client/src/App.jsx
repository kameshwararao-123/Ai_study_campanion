import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import AppLayout from "./components/layout/AppLayout.jsx";
import AdminLayout from "./components/layout/AdminLayout.jsx";

// Auth Pages
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";

// Learner Pages
import UserHomePage from "./pages/UserHomePage.jsx";
import SpacesListPage from "./pages/SpacesListPage.jsx";
import SpaceDashboardPage from "./pages/SpaceDashboardPage.jsx";
import ProjectLayout from "./pages/ProjectLayout.jsx";
import ProjectDashboardPage from "./pages/ProjectDashboardPage.jsx";
import MaterialsHubPage from "./pages/MaterialsHubPage.jsx";
import TutorChatPage from "./pages/TutorChatPage.jsx";
import AdaptiveQuizPage from "./pages/AdaptiveQuizPage.jsx";
import GrowthAnalysisPage from "./pages/GrowthAnalysisPage.jsx";
import ProjectAnalyticsPage from "./pages/ProjectAnalyticsPage.jsx";
import GlobalAnalyticsPage from "./pages/GlobalAnalyticsPage.jsx";

// Admin Pages
import AdminOverviewPage from "./pages/AdminOverviewPage.jsx";

/** Guards a route — redirects to /login if unauthenticated */
function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8 text-center text-slate-400">Loading session...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

/** Learner-only guard — redirects admin to /admin */
function RequireLearner({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8 text-center text-slate-400">Loading session...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "ADMIN") return <Navigate to="/admin" replace />;
  return children;
}

/** Admin-only guard — redirects learner to / */
function RequireAdmin({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8 text-center text-slate-400">Loading session...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "ADMIN") return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Authentication Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* ============================================
              LEARNER PANEL — wrapped in AppLayout
              Admin cannot access these routes
          ============================================ */}
          <Route
            element={
              <RequireLearner>
                <AppLayout />
              </RequireLearner>
            }
          >
            <Route path="/" element={<UserHomePage />} />
            <Route path="/spaces" element={<SpacesListPage />} />
            <Route path="/spaces/:spaceId" element={<SpaceDashboardPage />} />

            {/* Project Workspace Tabs */}
            <Route path="/spaces/:spaceId/projects/:projectId" element={<ProjectLayout />}>
              <Route index element={<ProjectDashboardPage />} />
              <Route path="materials" element={<MaterialsHubPage />} />
              <Route path="tutor" element={<TutorChatPage />} />
              <Route path="quiz" element={<AdaptiveQuizPage />} />
              <Route path="growth" element={<GrowthAnalysisPage />} />
              <Route path="analytics" element={<ProjectAnalyticsPage />} />
            </Route>

            <Route path="/analytics" element={<GlobalAnalyticsPage />} />
          </Route>

          {/* ============================================
              ADMIN PANEL — wrapped in AdminLayout
              Learners cannot access these routes
          ============================================ */}
          <Route
            element={
              <RequireAdmin>
                <AdminLayout />
              </RequireAdmin>
            }
          >
            <Route path="/admin" element={<AdminOverviewPage />} />
          </Route>

          {/* Fallback — redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
