import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isSupabaseConfigured } from '../lib/supabase';
import { LogIn, AlertCircle, Eye, EyeOff } from 'lucide-react';

export const LoginPage = () => {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
      const { profile } = await signIn({
        email: email.trim(),
        password,
      });

      // Redirect to state.from or role-based default
      const from = location.state?.from?.pathname;
      if (from && from !== '/login' && from !== '/signup') {
        navigate(from, { replace: true });
      } else if (profile?.role === 'mentor') {
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
              Sign In to Mentra
            </h1>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Access your college projects, student journey, or mentorship studio.
            </p>
          </div>

          {error && (
            <div className="notice-box error">
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

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
              <label className="form-label" htmlFor="password">
                Password
              </label>
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
