import React, { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, RefreshCw, LogOut } from 'lucide-react';

export const ProtectedRoute = ({ children, allowedRole }) => {
  const { user, profile, loading, refreshProfile, signOut } = useAuth();
  const location = useLocation();
  const [retrying, setRetrying] = useState(false);

  // 1. Loading State
  if (loading) {
    return (
      <div
        style={{
          minHeight: '60vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
        }}
      >
        <div
          style={{
            width: '32px',
            height: '32px',
            border: '2px solid var(--border-subtle)',
            borderTopColor: 'var(--color-primary-dark)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Verifying collegiate credentials...
        </p>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // 2. Unauthenticated State
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. Authenticated but Profile Unavailable / Error State (Fail-Closed)
  if (allowedRole && !profile) {
    const handleRetry = async () => {
      setRetrying(true);
      try {
        await refreshProfile();
      } finally {
        setRetrying(false);
      }
    };

    return (
      <div style={{ padding: '4rem 1.5rem', minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="card-academic" style={{ maxWidth: '480px', width: '100%', textAlign: 'center', padding: '2.5rem 2rem' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-terracotta-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem auto',
              color: 'var(--color-terracotta)',
            }}
          >
            <AlertCircle size={26} />
          </div>
          <span className="label-academic terracotta">Verification Required</span>
          <h2 className="font-serif" style={{ fontSize: '1.4rem', marginTop: '0.35rem', marginBottom: '0.5rem' }}>
            Academic Profile Unavailable
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: '1.6' }}>
            Your authenticated session is active, but Mentra could not verify your collegiate department and academic role. Access to this role-protected route is restricted to safeguard institutional records.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={handleRetry}
              disabled={retrying}
              className="btn btn-primary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <RefreshCw size={14} style={{ animation: retrying ? 'spin 0.8s linear infinite' : 'none' }} />
              <span>{retrying ? 'Re-verifying...' : 'Retry Verification'}</span>
            </button>
            <button
              onClick={() => signOut()}
              className="btn btn-secondary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 4. Role Authorization Check
  if (allowedRole && profile && profile.role !== allowedRole) {
    if (profile.role === 'mentor') {
      return <Navigate to="/mentor" replace />;
    }
    if (profile.role === 'student') {
      return <Navigate to="/student" replace />;
    }
    return <Navigate to="/" replace />;
  }

  // 5. Authorized State
  return children;
};
