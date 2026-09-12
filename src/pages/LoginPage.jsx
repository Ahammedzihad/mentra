import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { LogIn, AlertCircle, CheckCircle2, Eye, EyeOff, Mail, ArrowLeft } from 'lucide-react';

export const LoginPage = ({ initialView = 'login' }) => {
  const { user, profile, signIn, resetPasswordForEmail } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isForgotPassword, setIsForgotPassword] = useState(initialView === 'forgot');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(location.state?.notice || null);

  // Forgot password form states
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [forgotError, setForgotError] = useState(null);

  // Check URL parameters and hash for recovery tokens, confirmation tokens, or errors
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const hashStr = location.hash.startsWith('#') ? location.hash.slice(1) : location.hash;
    const hashParams = new URLSearchParams(hashStr);

    const errorCode = searchParams.get('error_code') || hashParams.get('error_code');
    const errorDesc = searchParams.get('error_description') || hashParams.get('error_description');
    const errorType = searchParams.get('error') || hashParams.get('error');
    const type = searchParams.get('type') || hashParams.get('type');

    // Handle errors from confirmation or recovery links
    if (errorCode || errorType) {
      if (errorCode === 'otp_expired' || errorDesc?.toLowerCase().includes('expired')) {
        setError('⚠️ Your email verification or reset link has expired or has already been used. Please request a new link below.');
      } else {
        setError(errorDesc ? decodeURIComponent(errorDesc.replace(/\+/g, ' ')) : 'Authentication verification failed. Please try signing in with your password.');
      }
      return;
    }

    // If type is recovery or access_token is accompanied by type=recovery, redirect to /reset-password
    if (type === 'recovery' || hashParams.get('type') === 'recovery') {
      navigate('/reset-password' + location.hash, { replace: true });
      return;
    }

    // Normal email verification
    if (type === 'signup' || type === 'email_change' || (hashParams.has('access_token') && type !== 'recovery')) {
      setNotice('✅ Your email has been verified successfully! Welcome to Mentra.');
    }
  }, [location, navigate]);

  // If user is already authenticated (and not in recovery flow), navigate to their role dashboard
  useEffect(() => {
    const hashStr = location.hash.startsWith('#') ? location.hash.slice(1) : location.hash;
    const hashParams = new URLSearchParams(hashStr);
    const searchParams = new URLSearchParams(location.search);
    const isRecovery = searchParams.get('type') === 'recovery' || hashParams.get('type') === 'recovery';

    if (isRecovery) {
      navigate('/reset-password' + location.hash, { replace: true });
      return;
    }

    if (user && profile) {
      const from = location.state?.from?.pathname;
      if (from && from !== '/login' && from !== '/signup') {
        navigate(from, { replace: true });
      } else if (profile.role === 'admin') {
        navigate('/admin/mentors', { replace: true });
      } else if (profile.role === 'mentor') {
        navigate('/mentor', { replace: true });
      } else {
        navigate('/student', { replace: true });
      }
    }
  }, [user, profile, location, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Please provide your academic email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    if (!isSupabaseConfigured) {
      setError('Supabase is not configured in your .env file yet. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to log in.');
      return;
    }

    setLoading(true);

    try {
      const { profile: loggedInProfile } = await signIn({
        email: email.trim(),
        password,
      });

      // Redirect to state.from or role-based default
      const from = location.state?.from?.pathname;
      if (from && from !== '/login' && from !== '/signup') {
        navigate(from, { replace: true });
      } else if (loggedInProfile?.role === 'admin') {
        navigate('/admin/mentors', { replace: true });
      } else if (loggedInProfile?.role === 'mentor') {
        navigate('/mentor', { replace: true });
      } else {
        navigate('/student', { replace: true });
      }
    } catch (err) {
      console.error('Sign in error:', err);
      setError(err.message || 'Invalid email or password credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    setForgotError(null);
    setForgotSuccess(false);

    if (!forgotEmail.trim()) {
      setForgotError('Please enter your registered academic email address.');
      return;
    }

    if (!isSupabaseConfigured) {
      setForgotError('Supabase is not configured in your .env file yet.');
      return;
    }

    setForgotLoading(true);

    try {
      if (resetPasswordForEmail) {
        await resetPasswordForEmail(forgotEmail.trim());
      } else {
        const origin = window.location.origin || 'https://mentra-eta.vercel.app';
        const { error: resetErr } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
          redirectTo: `${origin}/reset-password`,
        });
        if (resetErr) throw resetErr;
      }
      setForgotSuccess(true);
    } catch (err) {
      console.error('Password reset request error:', err);
      setForgotError(err.message || 'Failed to send recovery email. Please try again.');
    } finally {
      setForgotLoading(false);
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
            <span className="label-academic gold">Collegiate Portal</span>
            <h1 className="font-serif" style={{ fontSize: '1.9rem', marginTop: '0.35rem', marginBottom: '0.4rem' }}>
              {isForgotPassword ? 'Reset Password' : 'Sign In to Mentra'}
            </h1>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              {isForgotPassword
                ? "Enter your academic email and we'll send you a password recovery link."
                : 'Access your college projects, student journey, or mentorship studio.'}
            </p>
          </div>

          {notice && !isForgotPassword && (
            <div
              className="notice-box info"
              style={{
                marginBottom: '1.5rem',
                backgroundColor: 'var(--color-warm-gold-subtle)',
                border: '1px solid rgba(197, 164, 109, 0.4)',
                color: 'var(--color-primary-dark)',
              }}
            >
              <CheckCircle2 size={18} style={{ color: 'var(--color-warm-gold)', flexShrink: 0 }} />
              <span>{notice}</span>
            </div>
          )}

          {error && !isForgotPassword && (
            <div className="notice-box error">
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {isForgotPassword ? (
            /* Forgot Password Flow */
            <div>
              {forgotSuccess ? (
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
                      <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Recovery Email Sent!</div>
                      <div style={{ fontSize: '0.85rem' }}>
                        We sent a password reset link to <strong>{forgotEmail}</strong>. Please check your inbox and follow the instructions to set your new password.
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setIsForgotPassword(false);
                      setForgotSuccess(false);
                      setForgotError(null);
                    }}
                    style={{ width: '100%', padding: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                  >
                    <ArrowLeft size={16} />
                    <span>Return to Sign In</span>
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotPasswordSubmit}>
                  {forgotError && (
                    <div className="notice-box error" style={{ marginBottom: '1.25rem' }}>
                      <AlertCircle size={18} style={{ flexShrink: 0 }} />
                      <span>{forgotError}</span>
                    </div>
                  )}

                  <div className="form-group">
                    <label className="form-label" htmlFor="forgot-email">
                      Academic Email
                    </label>
                    <input
                      id="forgot-email"
                      type="email"
                      className="form-input"
                      placeholder="name@college.edu"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      disabled={forgotLoading}
                      required
                      autoFocus
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ width: '100%', marginTop: '1rem', padding: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                    disabled={forgotLoading}
                  >
                    <Mail size={16} />
                    <span>{forgotLoading ? 'Sending Instructions...' : 'Send Recovery Link'}</span>
                  </button>

                  <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotPassword(false);
                        setForgotError(null);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: 0,
                      }}
                    >
                      <ArrowLeft size={14} />
                      <span>Back to Sign In</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            /* Normal Sign In Form */
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="email">
                  Academic Email
                </label>
                <input
                  id="email"
                  type="email"
                  className="form-input"
                  placeholder="name@college.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <label className="form-label" htmlFor="password" style={{ marginBottom: 0 }}>
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setNotice(null);
                      setIsForgotPassword(true);
                      if (email.trim()) setForgotEmail(email.trim());
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: '0.8rem',
                      color: 'var(--color-terracotta)',
                      fontWeight: 500,
                      cursor: 'pointer',
                      padding: 0,
                      textDecoration: 'underline',
                    }}
                  >
                    Forgot password?
                  </button>
                </div>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    className="form-input"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    required
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
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '1rem', padding: '0.8rem' }}
                disabled={loading}
              >
                <LogIn size={16} />
                <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
              </button>
            </form>
          )}

          {/* Footer note */}
          <div
            style={{
              textAlign: 'center',
              marginTop: '1.75rem',
              paddingTop: '1.25rem',
              borderTop: '1px solid var(--border-subtle)',
              fontSize: '0.85rem',
              color: 'var(--text-secondary)',
            }}
          >
            Not yet enrolled in the Mentra fellowship?{' '}
            <Link to="/signup" style={{ color: 'var(--color-terracotta)', fontWeight: 600 }}>
              Join Mentra
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
