import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ConfigNotice } from './components/ConfigNotice';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { ProtectedRoute } from './components/ProtectedRoute';

import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { SignUpPage } from './pages/SignUpPage';
import { StudentDashboard } from './pages/StudentDashboard';
import { MentorDashboard } from './pages/MentorDashboard';
import { MentorPendingPage } from './pages/MentorPendingPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { JourneyPage } from './pages/JourneyPage';
import { AiAdvisorPage } from './pages/AiAdvisorPage';
import { BrowseMentorsPage } from './pages/BrowseMentorsPage';
import { AdminMentorVerificationPage } from './pages/AdminMentorVerificationPage';
import { AuthErrorPage } from './pages/AuthErrorPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';

function AuthRecoveryListener() {
  const navigate = useNavigate();
  const location = useLocation();

  React.useEffect(() => {
    // Check URL hash for type=recovery or searchParams for type=recovery
    const hashStr = location.hash.startsWith('#') ? location.hash.slice(1) : location.hash;
    const hashParams = new URLSearchParams(hashStr);
    const searchParams = new URLSearchParams(location.search);

    const isRecovery =
      searchParams.get('type') === 'recovery' ||
      hashParams.get('type') === 'recovery';

    if (isRecovery && location.pathname !== '/reset-password') {
      navigate('/reset-password' + location.hash, { replace: true });
    }
  }, [location, navigate]);

  return null;
}

export function App() {
  return (
    <BrowserRouter>
      <AuthRecoveryListener />
      <AuthProvider>
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <ConfigNotice />
          <Navbar />
          <main style={{ flex: '1 0 auto' }}>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/forgot-password" element={<LoginPage initialView="forgot" />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/signup" element={<SignUpPage />} />
              <Route path="/error" element={<AuthErrorPage />} />
              <Route path="/projects" element={<ProjectsPage />} />

              {/* Student Protected Routes */}
              <Route
                path="/student"
                element={
                  <ProtectedRoute allowedRole="student">
                    <StudentDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/mentors"
                element={
                  <ProtectedRoute allowedRole="student">
                    <BrowseMentorsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/ai"
                element={
                  <ProtectedRoute allowedRole="student">
                    <AiAdvisorPage />
                  </ProtectedRoute>
                }
              />

              {/* Mentor Protected Routes */}
              <Route
                path="/mentor"
                element={
                  <ProtectedRoute allowedRole="mentor">
                    <MentorDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/mentor/pending"
                element={
                  <ProtectedRoute allowedRole="mentor">
                    <MentorPendingPage />
                  </ProtectedRoute>
                }
              />

              {/* Admin Protected Routes */}
              <Route
                path="/admin/mentors"
                element={
                  <ProtectedRoute allowedRole="admin">
                    <AdminMentorVerificationPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/admin" element={<Navigate to="/admin/mentors" replace />} />

              {/* General Protected Routes */}
              <Route
                path="/journey"
                element={
                  <ProtectedRoute>
                    <JourneyPage />
                  </ProtectedRoute>
                }
              />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
