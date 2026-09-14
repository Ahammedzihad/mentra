import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Menu, X, ShieldCheck, Clock, LogOut, Sparkles } from 'lucide-react';

export const Navbar = () => {
  const { user, profile, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const isActive = (path) => location.pathname === path;

  return (
    <header
      style={{
        backgroundColor: 'var(--color-warm-ivory)',
        borderBottom: '1px solid var(--border-subtle)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      <div
        className="container"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '4.25rem',
        }}
      >
        {/* Brand Logo */}
        <Link
          to="/"
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: '0.45rem',
            textDecoration: 'none',
          }}
        >
          <span
            className="font-serif"
            style={{
              fontSize: '1.65rem',
              fontWeight: 700,
              color: 'var(--color-primary-dark)',
              letterSpacing: '-0.02em',
            }}
          >
            Mentra
          </span>
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--color-terracotta)',
            }}
          >
            Collegiate
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav
          style={{
            display: 'none',
            alignItems: 'center',
            gap: '1.75rem',
          }}
          className="desktop-nav"
        >
          <Link
            to="/"
            style={{
              fontSize: '0.9rem',
              fontWeight: isActive('/') ? '600' : '500',
              color: isActive('/') ? 'var(--color-primary-dark)' : 'var(--text-secondary)',
              borderBottom: isActive('/') ? '2px solid var(--color-terracotta)' : '2px solid transparent',
              paddingBottom: '0.25rem',
              transition: 'var(--transition-smooth)',
            }}
          >
            Overview
          </Link>

          <Link
            to="/projects"
            style={{
              fontSize: '0.9rem',
              fontWeight: isActive('/projects') ? '600' : '500',
              color: isActive('/projects') ? 'var(--color-primary-dark)' : 'var(--text-secondary)',
              borderBottom: isActive('/projects') ? '2px solid var(--color-terracotta)' : '2px solid transparent',
              paddingBottom: '0.25rem',
              transition: 'var(--transition-smooth)',
            }}
          >
            Projects
          </Link>

          {user && (
            <Link
              to="/journey"
              style={{
                fontSize: '0.9rem',
                fontWeight: isActive('/journey') ? '600' : '500',
                color: isActive('/journey') ? 'var(--color-primary-dark)' : 'var(--text-secondary)',
                borderBottom: isActive('/journey') ? '2px solid var(--color-terracotta)' : '2px solid transparent',
                paddingBottom: '0.25rem',
                transition: 'var(--transition-smooth)',
              }}
            >
              Journey
            </Link>
          )}

          {user && profile?.role === 'admin' && (
            <Link
              to="/admin"
              style={{
                fontSize: '0.9rem',
                fontWeight: location.pathname.startsWith('/admin') ? '600' : '500',
                color: location.pathname.startsWith('/admin') ? 'var(--color-primary-dark)' : 'var(--text-secondary)',
                borderBottom: location.pathname.startsWith('/admin') ? '2px solid var(--color-terracotta)' : '2px solid transparent',
                paddingBottom: '0.25rem',
                transition: 'var(--transition-smooth)',
              }}
            >
              Admin Portal
            </Link>
          )}


          {user && profile?.role === 'mentor' && profile?.is_verified === true && (
            <>
              <Link
                to="/mentor"
                style={{
                  fontSize: '0.9rem',
                  fontWeight: isActive('/mentor') ? '600' : '500',
                  color: isActive('/mentor') ? 'var(--color-primary-dark)' : 'var(--text-secondary)',
                  borderBottom: isActive('/mentor') ? '2px solid var(--color-terracotta)' : '2px solid transparent',
                  paddingBottom: '0.25rem',
                  transition: 'var(--transition-smooth)',
                }}
              >
                Mentor Studio
              </Link>
              <Link
                to="/mentor/ai"
                style={{
                  fontSize: '0.9rem',
                  fontWeight: isActive('/mentor/ai') ? '600' : '500',
                  color: isActive('/mentor/ai') ? 'var(--color-terracotta)' : 'var(--text-secondary)',
                  borderBottom: isActive('/mentor/ai') ? '2px solid var(--color-terracotta)' : '2px solid transparent',
                  paddingBottom: '0.25rem',
                  transition: 'var(--transition-smooth)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <Sparkles size={14} style={{ color: 'var(--color-terracotta)' }} />
                <span>Personal AI</span>
              </Link>
            </>
          )}

          {user && profile?.role === 'student' && (
            <>
              <Link
                to="/student"
                style={{
                  fontSize: '0.9rem',
                  fontWeight: isActive('/student') ? '600' : '500',
                  color: isActive('/student') ? 'var(--color-primary-dark)' : 'var(--text-secondary)',
                  borderBottom: isActive('/student') ? '2px solid var(--color-terracotta)' : '2px solid transparent',
                  paddingBottom: '0.25rem',
                  transition: 'var(--transition-smooth)',
                }}
              >
                Student Space
              </Link>
              <Link
                to="/mentors"
                style={{
                  fontSize: '0.9rem',
                  fontWeight: isActive('/mentors') ? '600' : '500',
                  color: isActive('/mentors') ? 'var(--color-primary-dark)' : 'var(--text-secondary)',
                  borderBottom: isActive('/mentors') ? '2px solid var(--color-terracotta)' : '2px solid transparent',
                  paddingBottom: '0.25rem',
                  transition: 'var(--transition-smooth)',
                }}
              >
                Browse Mentors
              </Link>
              <Link
                to="/ai"
                style={{
                  fontSize: '0.9rem',
                  fontWeight: isActive('/ai') ? '600' : '500',
                  color: isActive('/ai') ? 'var(--color-terracotta)' : 'var(--text-secondary)',
                  borderBottom: isActive('/ai') ? '2px solid var(--color-terracotta)' : '2px solid transparent',
                  paddingBottom: '0.25rem',
                  transition: 'var(--transition-smooth)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <Sparkles size={14} style={{ color: 'var(--color-terracotta)' }} />
                <span>Personal AI</span>
              </Link>
            </>
          )}
        </nav>

        {/* Right side: Auth buttons / User Profile */}
        <div
          style={{
            display: 'none',
            alignItems: 'center',
            gap: '0.9rem',
          }}
          className="desktop-auth"
        >
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
              <Link
                to={profile?.role === 'admin' ? '/admin' : profile?.role === 'mentor' ? '/mentor' : '/student'}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.55rem',
                  padding: '0.35rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--color-white)',
                  border: '1px solid var(--border-subtle)',
                  textDecoration: 'none',
                }}
              >
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-dark-surface)',
                    color: 'var(--color-warm-ivory)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                  }}
                >
                  {profile?.full_name ? profile.full_name[0].toUpperCase() : 'M'}
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.825rem', fontWeight: '600', color: 'var(--text-primary)', lineHeight: 1.2 }}>
                    {profile?.full_name || 'Member'}
                  </div>
                  <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', marginTop: '0.15rem' }}>
                    <span className={`badge-dept ${profile?.role === 'admin' ? 'gold' : profile?.role === 'mentor' ? (profile?.is_verified ? 'gold' : '') : 'terracotta'}`} style={{ fontSize: '0.62rem', padding: '0.1rem 0.4rem' }}>
                      {profile?.role === 'admin' ? 'Administrator' : profile?.role === 'mentor' ? (profile?.is_verified ? 'Verified Mentor' : 'Mentor (Pending)') : 'Student'}
                    </span>
                    {profile?.department && (
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                        {profile.department}
                      </span>
                    )}
                    {profile?.role === 'mentor' && (
                      profile?.is_verified ? (
                        <ShieldCheck size={13} style={{ color: '#8C6A30' }} title="Verified Mentor" />
                      ) : (
                        <Clock size={11} style={{ color: 'var(--color-terracotta)' }} title="Verification Pending Review" />
                      )
                    )}
                  </div>
                </div>
              </Link>

              <button
                onClick={handleLogout}
                className="btn btn-secondary btn-sm"
                title="Log out"
                style={{ padding: '0.45rem 0.75rem' }}
              >
                <LogOut size={14} />
                <span>Log out</span>
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Link to="/login" className="btn btn-secondary btn-sm">
                Log In
              </Link>
              <Link to="/signup" className="btn btn-primary btn-sm">
                Join Mentra
              </Link>
            </div>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="mobile-toggle"
          aria-label="Toggle navigation menu"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '0.5rem',
            color: 'var(--color-primary-dark)',
          }}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div
          style={{
            backgroundColor: 'var(--color-warm-ivory)',
            borderTop: '1px solid var(--border-subtle)',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-primary)' }}
          >
            Overview
          </Link>
          <Link
            to="/projects"
            onClick={() => setMobileMenuOpen(false)}
            style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-primary)' }}
          >
            Projects
          </Link>

          {user && (
            <Link
              to="/journey"
              onClick={() => setMobileMenuOpen(false)}
              style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-primary)' }}
            >
              Journey Timeline
            </Link>
          )}

          {user && profile?.role === 'admin' && (
            <Link
              to="/admin"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                fontSize: '1rem',
                fontWeight: 500,
                color: location.pathname.startsWith('/admin') ? 'var(--color-terracotta)' : 'var(--text-primary)',
              }}
            >
              Admin Portal
            </Link>
          )}


          {user && profile?.role === 'mentor' && profile?.is_verified === true && (
            <>
              <Link
                to="/mentor"
                onClick={() => setMobileMenuOpen(false)}
                style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-primary)' }}
              >
                Mentor Studio
              </Link>
              <Link
                to="/mentor/ai"
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  fontSize: '1rem',
                  fontWeight: 500,
                  color: 'var(--color-terracotta)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem'
                }}
              >
                <Sparkles size={16} />
                <span>Personal AI</span>
              </Link>
            </>
          )}

          {user && profile?.role === 'student' && (
            <>
              <Link
                to="/student"
                onClick={() => setMobileMenuOpen(false)}
                style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-primary)' }}
              >
                Student Space
              </Link>
              <Link
                to="/mentors"
                onClick={() => setMobileMenuOpen(false)}
                style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-primary)' }}
              >
                Browse Mentors
              </Link>
              <Link
                to="/ai"
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  fontSize: '1rem',
                  fontWeight: 500,
                  color: 'var(--color-terracotta)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem'
                }}
              >
                <Sparkles size={16} />
                <span>Personal AI</span>
              </Link>
            </>
          )}

          <div style={{ paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
            {user ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Signed in as <strong>{profile?.full_name || user.email}</strong> ({profile?.role})
                </div>
                <button
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="btn btn-secondary btn-sm"
                  style={{ width: '100%' }}
                >
                  <LogOut size={15} /> Log Out
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="btn btn-secondary"
                  style={{ flex: 1, textAlign: 'center' }}
                >
                  Log In
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="btn btn-primary"
                  style={{ flex: 1, textAlign: 'center' }}
                >
                  Join Mentra
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Media query styling for responsive navigation */}
      <style>{`
        @media (min-width: 768px) {
          .desktop-nav { display: flex !important; }
          .desktop-auth { display: flex !important; }
          .mobile-toggle { display: none !important; }
        }
      `}</style>
    </header>
  );
};
