import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { KeyRound, AlertCircle, CheckCircle2, Eye, EyeOff, ArrowLeft } from 'lucide-react';

export const ResetPasswordPage = () => {
  const { user, updatePassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasValidSession, setHasValidSession] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Check for recovery session and handle URL error parameters
  useEffect(() => {
    const checkRecoverySession = async () => {
      // 1. Check for URL error parameters (e.g. expired OTP / invalid token)
      const searchParams = new URLSearchParams(location.search);
      const hashStr = location.hash.startsWith('#') ? location.hash.slice(1) : location.hash;
      const hashParams = new URLSearchParams(hashStr);

      const errorCode = searchParams.get('error_code') || hashParams.get('error_code');
      const errorDesc = searchParams.get('error_description') || hashParams.get('error_description');

      if (errorCode || errorDesc) {
        if (errorCode === 'otp_expired' || errorDesc?.toLowerCase().includes('expired')) {
          setError('⚠️ Your password reset link has expired or has already been used. Please request a new link from the login page.');
        } else {
          setError(errorDesc ? decodeURIComponent(errorDesc.replace(/\+/g, ' ')) : 'Invalid or expired password reset link.');
        }
        setCheckingSession(false);
        return;
      }

      // 2. Check for active session in Supabase client
      if (!isSupabaseConfigured) {
        setError('Supabase is not configured yet. Please verify your environment variables.');
        setCheckingSession(false);
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setHasValidSession(true);
        } else {
          // If hash contains access_token, give client a moment to parse it
          if (hashParams.has('access_token')) {
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            if (currentUser) {
              setHasValidSession(true);
            } else {
              setHasValidSession(false);
            }
          } else {
            setHasValidSession(false);
          }
        }
      } catch (err) {
        console.error('Error verifying recovery session:', err);
        setHasValidSession(false);
      } finally {
        setCheckingSession(false);
      }
    };

    checkRecoverySession();

    // Listen for PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (session && event === 'SIGNED_IN')) {
        setHasValidSession(true);
        setCheckingSession(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!password) {
      setError('Please enter a new password.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long for collegiate account security.');
      return;
    }

    if (password !== confirmPassword) {
      setError('The passwords do not match. Please verify both fields.');
      return;
    }

    setLoading(true);

    try {
      if (updatePassword) {
        await updatePassword(password);
      } else {
        const { error: updateErr } = await supabase.auth.updateUser({
          password,
        });
        if (updateErr) throw updateErr;
      }

      setSuccess(true);

      const returnToLogin = async () => {
        try {
          await supabase.auth.signOut();
        } catch {
          // ignore error if session is already closed
        }
        navigate('/login', {
          state: { notice: '✅ Password updated successfully! Please sign in with your new password.' },
          replace: true,
        });
      };

      // Auto redirect to /login after 2.5 seconds
      setTimeout(returnToLogin, 2500);
    } catch (err) {
      console.error('Password update error:', err);
      setError(err.message || 'Failed to update password. Please try again or request a new reset link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        padding: '3.5rem 0',
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <div className="container container-narrow">
        <div
          className="card-academic"
          style={{
            maxWidth: '460px',
            margin: '0 auto',
            padding: '2.5rem',
          }}
        >
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <span className="label-academic gold">Account Security</span>
            <h1 className="font-serif" style={{ fontSize: '1.9rem', marginTop: '0.35rem', marginBottom: '0.4rem' }}>
              Set New Password
            </h1>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Choose a strong, secure password for your Mentra account.
            </p>
          </div>

          {/* Checking Session State */}
          {checkingSession ? (
            <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-secondary)' }}>
              <div
                style={{
                  display: 'inline-block',
                  width: '28px',
                  height: '28px',
                  border: '3px solid var(--border-subtle)',
                  borderTopColor: 'var(--color-terracotta)',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  marginBottom: '1rem',
                }}
              />
              <p style={{ fontSize: '0.9rem' }}>Verifying security recovery session...</p>
              <style>{`
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
              `}</style>
            </div>
          ) : !hasValidSession && !success ? (
            <div>
              {error ? (
                <div className="notice-box error" style={{ marginBottom: '1.5rem' }}>
                  <AlertCircle size={18} style={{ flexShrink: 0 }} />
                  <span>{error}</span>
                </div>
              ) : (
                <div
                  className="notice-box info"
                  style={{
                    marginBottom: '1.5rem',
                    backgroundColor: 'var(--color-warm-gold-subtle)',
                    border: '1px solid rgba(197, 164, 109, 0.4)',
                    color: 'var(--color-primary-dark)',
                  }}
                >
                  <AlertCircle size={18} style={{ color: 'var(--color-warm-gold)', flexShrink: 0 }} />
                  <span>No active password recovery session detected. Please request a new password reset link from the login page.</span>
                </div>
              )}
              <Link
                to="/login"
                className="btn btn-primary"
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '0.8rem',
                }}
              >
                <ArrowLeft size={16} />
                <span>Return to Sign In</span>
              </Link>
            </div>
          ) : success ? (
            <div>
              <div
                className="notice-box info"
                style={{
                  marginBottom: '1.5rem',
                  backgroundColor: 'rgba(56, 142, 60, 0.1)',
                  border: '1px solid rgba(56, 142, 60, 0.3)',
                  color: '#2e7d32',
                }}
              >
                <CheckCircle2 size={20} style={{ color: '#2e7d32', flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Password Updated!</div>
                  <div style={{ fontSize: '0.875rem' }}>Your new password is now active. Redirecting you...</div>
                </div>
              </div>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await supabase.auth.signOut();
                  } catch {
                    // ignore
                  }
                  navigate('/login', {
                    state: { notice: '✅ Password updated successfully! Please sign in with your new password.' },
                    replace: true,
                  });
                }}
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.8rem', textAlign: 'center' }}
              >
                Return to Sign In
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {error && (
                <div className="notice-box error" style={{ marginBottom: '1.25rem' }}>
                  <AlertCircle size={18} style={{ flexShrink: 0 }} />
                  <span>{error}</span>
                </div>
              )}

              {user?.email && (
                <div
                  style={{
                    padding: '0.65rem 0.85rem',
                    backgroundColor: 'var(--color-warm-gold-subtle)',
                    border: '1px solid rgba(197, 164, 109, 0.3)',
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: '1.25rem',
                    fontSize: '0.825rem',
                    color: 'var(--color-primary-dark)',
                  }}
                >
                  Updating password for: <strong>{user.email}</strong>
                </div>
              )}

              <div className="form-group">
                <label className="form-label" htmlFor="new-password">
                  New Password
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    className="form-input"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    required
                    minLength={8}
                    autoFocus
                    style={{ paddingRight: '2.75rem', width: '100%' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    title={showPassword ? 'Hide password' : 'Show password'}
                    style={{
                      position: 'absolute',
                      right: '0.75rem',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0.25rem',
                      borderRadius: 'var(--radius-sm)',
                      transition: 'var(--transition-smooth)',
                    }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                  Must be at least 8 characters.
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="confirm-password">
                  Confirm New Password
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    id="confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="form-input"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                    required
                    minLength={8}
                    style={{ paddingRight: '2.75rem', width: '100%' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    title={showConfirmPassword ? 'Hide password' : 'Show password'}
                    style={{
                      position: 'absolute',
                      right: '0.75rem',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0.25rem',
                      borderRadius: 'var(--radius-sm)',
                      transition: 'var(--transition-smooth)',
                    }}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{
                  width: '100%',
                  marginTop: '1rem',
                  padding: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                }}
                disabled={loading}
              >
                <KeyRound size={16} />
                <span>{loading ? 'Updating Password...' : 'Save New Password'}</span>
              </button>

              <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
                <Link
                  to="/login"
                  style={{
                    fontSize: '0.85rem',
                    color: 'var(--text-secondary)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    textDecoration: 'none',
                  }}
                >
                  <ArrowLeft size={14} />
                  <span>Back to Sign In</span>
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
