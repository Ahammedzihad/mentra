import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import { AuthErrorPage } from './pages/AuthErrorPage';

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <ConfigNotice />
          <Navbar />
          <main style={{ flex: '1 0 auto' }}>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignUpPage />} />
              <Route path="/error" element={<AuthErrorPage />} />
              <Route path="/projects" element={<ProjectsPage />} />

              {/* Protected Routes */}
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
              <Route
                path="/journey"
                element={
                  <ProtectedRoute>
                    <JourneyPage />
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
