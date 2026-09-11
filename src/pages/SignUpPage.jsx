import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isSupabaseConfigured } from '../lib/supabase';
import { UserPlus, AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';

const DEPARTMENTS = ['B.Tech', 'B.Des', 'BBA', 'BCA'];

export const SignUpPage = () => {
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState('student');
  const [department, setDepartment] = useState('B.Tech');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [confirmationNotice, setConfirmationNotice] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setConfirmationNotice(null);

    // Validation
    if (!fullName.trim()) {
      setError('Please provide your full legal or academic name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid academic or personal email address.');
      return;
    }
    if (!password || password.length < 6) {
      setError('Password must contain at least 6 characters.');
      return;
    }

    if (!isSupabaseConfigured) {
      setError('Supabase credentials are not configured in your .env file yet. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
      return;
    }

    setLoading(true);

    try {
      const result = await signUp({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        role,
        department,
      });

      // If session exists immediately, redirect based on role
      if (result.session) {
        if (role === 'mentor') {
          navigate('/mentor/pending');
        } else {
          navigate('/student');
        }
      } else {
        // Supabase has email confirmation enabled
        setConfirmationNotice(
          role === 'mentor'
            ? `Your mentor application is under review. Please confirm your academic email (${email}) to finalize submission. Your credentials will then undergo manual institutional review.`
            : `Collegiate registration initiated for ${email}. Please check your inbox to confirm your email before signing in.`
        );
      }
    } catch (err) {
      console.error('Sign up error:', err);
      const errMsg = err?.message || '';
      if (
        errMsg.includes('already registered') ||
        errMsg.includes('already in use') ||
        errMsg.includes('user already exists') ||
        errMsg.includes('already exists')
      ) {
        setError('⚠️ This email is already registered. Please use a different Gmail account or sign in with this email.');
      } else {
        setError(err.message || 'An error occurred during collegiate registration.');
      }
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
            maxWidth: '520px',
            margin: '0 auto',
            padding: '2.5rem',
          }}
        >
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <span className="label-academic terracotta">Matriculation</span>
            <h1 className="font-serif" style={{ fontSize: '1.9rem', marginTop: '0.35rem', marginBottom: '0.4rem' }}>
              Join Mentra
            </h1>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Enter the collegiate fellowship of students, mentors, and collaborative projects.
            </p>
          </div>

          {error && (
            <div className="notice-box error">
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {confirmationNotice ? (
            <div className="notice-box info" style={{ flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle2 size={18} style={{ color: 'var(--color-terracotta)' }} />
                <strong>Registration Initiated</strong>
              </div>
              <p style={{ fontSize: '0.875rem', lineHeight: '1.5' }}>{confirmationNotice}</p>
              <Link to="/login" className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-start', marginTop: '0.5rem' }}>
                Go to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {/* Full Name */}
              <div className="form-group">
                <label className="form-label" htmlFor="fullname">
                  Full Name <span className="req">*</span>
                </label>
                <input
                  id="fullname"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Dr. Arthur Vance or Eleanor Rigby"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              {/* Email */}
              <div className="form-group">
                <label className="form-label" htmlFor="email">
                  Email Address <span className="req">*</span>
                </label>
                <input
                  id="email"
                  type="email"
                  className="form-input"
                  placeholder="student@college.edu or mentor@mentra.org"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              {/* Password */}
              <div className="form-group">
                <label className="form-label" htmlFor="password">
                  Password <span className="req">*</span>
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    className="form-input"
                    placeholder="At least 6 characters"
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
                      transition: 'var(--transition-smooth)',
                    }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Role Selection */}
              <div className="form-group">
                <label className="form-label">
                  Collegiate Role <span className="req">*</span>
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.2rem' }}>
                  <button
                    type="button"
                    onClick={() => setRole('student')}
                    style={{
                      padding: '0.75rem',
                      border: '1px solid',
                      borderColor: role === 'student' ? 'var(--color-primary-dark)' : 'var(--border-subtle)',
                      backgroundColor: role === 'student' ? 'var(--color-soft-beige-light)' : 'var(--color-white)',
                      color: 'var(--color-primary-dark)',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'var(--transition-smooth)',
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Student</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Build projects & journey</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole('mentor')}
                    style={{
                      padding: '0.75rem',
                      border: '1px solid',
                      borderColor: role === 'mentor' ? 'var(--color-primary-dark)' : 'var(--border-subtle)',
                      backgroundColor: role === 'mentor' ? 'var(--color-soft-beige-light)' : 'var(--color-white)',
                      color: 'var(--color-primary-dark)',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'var(--transition-smooth)',
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Mentor</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Guide student cohorts</div>
                  </button>
                </div>
              </div>

              {/* Department Selection */}
              <div className="form-group">
                <label className="form-label" htmlFor="department">
                  Department <span className="req">*</span>
                </label>
                <select
                  id="department"
                  className="form-select"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  disabled={loading}
                >
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '1rem', padding: '0.8rem' }}
                disabled={loading}
              >
                <UserPlus size={16} />
                <span>{loading ? 'Registering...' : 'Complete Registration'}</span>
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
            Already an enrolled member?{' '}
            <Link to="/login" style={{ color: 'var(--color-terracotta)', fontWeight: 600 }}>
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
