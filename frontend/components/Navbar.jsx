import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Menu,
  X,
  LogOut,
  Edit3,
  ChevronDown,
  GraduationCap,
  Users,
  Sparkles,
  FileText
} from 'lucide-react';
import { EditProfileModal } from '../../features/profile/EditProfileModal';

export const Navbar = () => {
  const { user, profile, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [avatarDropdownOpen, setAvatarDropdownOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const dropdownRef = useRef(null);
  const avatarButtonRef = useRef(null);

  const canEditProfile = Boolean(user && (profile?.role === 'student' || profile?.role === 'mentor'));

  const handleLogout = async () => {
    try {
      setAvatarDropdownOpen(false);
      setMobileMenuOpen(false);
      await signOut();
      navigate('/');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  // Close avatar dropdown on click/touch outside or Escape key
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        avatarButtonRef.current &&
        !avatarButtonRef.current.contains(event.target)
      ) {
        setAvatarDropdownOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && avatarDropdownOpen) {
        setAvatarDropdownOpen(false);
        avatarButtonRef.current?.focus();
      }
    };

    if (avatarDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [avatarDropdownOpen]);

  // Close menus on route change
  useEffect(() => {
    setAvatarDropdownOpen(false);
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Extract first name or fallback
  const userFirstName = profile?.full_name
    ? profile.full_name.trim().split(' ')[0]
    : user?.email
    ? user.email.split('@')[0]
    : 'Account';

  // Role title for badge
  const roleLabel =
    profile?.role === 'admin'
      ? 'Administrator'
      : profile?.role === 'mentor'
      ? profile?.is_verified
        ? 'Verified Mentor'
        : 'Mentor (Pending)'
      : 'Student';

  // Role primary destination
  const roleWorkspacePath =
    profile?.role === 'admin'
      ? '/admin'
      : profile?.role === 'mentor'
      ? '/mentor'
      : '/student';

  const roleWorkspaceLabel =
    profile?.role === 'admin'
      ? 'Admin Portal'
      : profile?.role === 'mentor'
      ? 'Mentor Studio'
      : 'Student Space';

  // Academic course/program details for profile dropdown
  const userProgramDetail = [
    profile?.course || profile?.program,
    profile?.department && profile?.department !== (profile?.course || profile?.program)
      ? profile.department
      : null,
  ]
    .filter(Boolean)
    .join(' • ');

  return (
    <>
      <header
        style={{
          backgroundColor: '#FAF7F2',
          borderBottom: '1px solid rgba(222, 212, 196, 0.7)',
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
            paddingLeft: '1.5rem',
            paddingRight: '1.5rem',
            maxWidth: '1180px',
            margin: '0 auto',
            width: '100%',
          }}
        >
          {/* Brand Wordmark: Mentra (serif bold) Collegiate (serif regular) */}
          <Link
            to="/"
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: '0.45rem',
              textDecoration: 'none',
              flexShrink: 0,
            }}
          >
            <span
              className="font-serif"
              style={{
                fontSize: '1.55rem',
                fontWeight: 700,
                color: '#171513',
                letterSpacing: '-0.02em',
              }}
            >
              Mentra
            </span>
            <span
              className="font-serif"
              style={{
                fontSize: '1.45rem',
                fontWeight: 400,
                color: '#3A3530',
                letterSpacing: '-0.01em',
              }}
            >
              Collegiate
            </span>
          </Link>

          {/* ============================================================== */}
          {/* DESKTOP NAVIGATION                                            */}
          {/* ============================================================== */}
          <nav
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: user ? '2rem' : '1.6rem',
              whiteSpace: 'nowrap',
            }}
            className="desktop-nav"
            aria-label="Main Navigation"
          >
            {user ? (
              /* --- AUTHENTICATED: Only 4 Primary Links --- */
              <>
                <Link
                  to="/"
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: isActive('/') ? '600' : '450',
                    color: '#171513',
                    borderBottom: isActive('/') ? '2px solid #171513' : '2px solid transparent',
                    paddingBottom: '0.2rem',
                    textDecoration: 'none',
                    transition: 'border-color 0.15s ease',
                  }}
                >
                  Overview
                </Link>

                <Link
                  to="/projects"
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: isActive('/projects') ? '600' : '450',
                    color: isActive('/projects') ? '#171513' : '#4A443E',
                    borderBottom: isActive('/projects') ? '2px solid #171513' : '2px solid transparent',
                    paddingBottom: '0.2rem',
                    textDecoration: 'none',
                    transition: 'border-color 0.15s ease',
                  }}
                >
                  Projects
                </Link>

                <Link
                  to="/discover"
                  id="navbar-discover-link"
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: isActive('/discover') ? '600' : '450',
                    color: isActive('/discover') ? '#171513' : '#4A443E',
                    borderBottom: isActive('/discover') ? '2px solid #171513' : '2px solid transparent',
                    paddingBottom: '0.2rem',
                    textDecoration: 'none',
                    transition: 'border-color 0.15s ease',
                  }}
                >
                  Discover
                </Link>

                <Link
                  to="/journey"
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: isActive('/journey') ? '600' : '450',
                    color: isActive('/journey') ? '#171513' : '#4A443E',
                    borderBottom: isActive('/journey') ? '2px solid #171513' : '2px solid transparent',
                    paddingBottom: '0.2rem',
                    textDecoration: 'none',
                    transition: 'border-color 0.15s ease',
                  }}
                >
                  Journey
                </Link>
              </>
            ) : (
              /* --- UNAUTHENTICATED: Public Overview & Projects Links --- */
              <>
                <Link
                  to="/"
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: isActive('/') ? '600' : '450',
                    color: '#171513',
                    borderBottom: isActive('/') ? '2px solid #171513' : '2px solid transparent',
                    paddingBottom: '0.2rem',
                    textDecoration: 'none',
                  }}
                >
                  Overview
                </Link>

                <Link
                  to="/projects"
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: isActive('/projects') ? '600' : '450',
                    color: isActive('/projects') ? '#171513' : '#4A443E',
                    borderBottom: isActive('/projects') ? '2px solid #171513' : '2px solid transparent',
                    paddingBottom: '0.2rem',
                    textDecoration: 'none',
                  }}
                >
                  Projects
                </Link>
              </>
            )}
          </nav>

          {/* ============================================================== */}
          {/* RIGHT SIDE: AUTHENTICATED AVATAR DROPDOWN / PUBLIC AUTH BUTTONS */}
          {/* ============================================================== */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              flexShrink: 0,
            }}
            className="desktop-auth"
          >
            {user ? (
              /* --- AUTHENTICATED: Compact Avatar with Dropdown --- */
              <div style={{ position: 'relative' }}>
                <button
                  ref={avatarButtonRef}
                  onClick={() => setAvatarDropdownOpen(!avatarDropdownOpen)}
                  aria-haspopup="menu"
                  aria-expanded={avatarDropdownOpen}
                  aria-label="User account menu"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.55rem',
                    padding: '0.3rem 0.65rem 0.3rem 0.35rem',
                    borderRadius: '24px',
                    backgroundColor: avatarDropdownOpen ? '#F5EFEB' : '#FFFFFF',
                    border: '1px solid #DED4C4',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    color: '#171513',
                  }}
                >
                  {/* Compact circular avatar */}
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      backgroundColor: '#171513',
                      color: '#FAF7F2',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      flexShrink: 0,
                    }}
                  >
                    {profile?.full_name ? profile.full_name.trim()[0].toUpperCase() : 'M'}
                  </div>

                  {/* First Name */}
                  <span
                    style={{
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      color: '#171513',
                      whiteSpace: 'nowrap',
                      maxWidth: '110px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {userFirstName}
                  </span>

                  <ChevronDown
                    size={13}
                    style={{
                      color: '#847C73',
                      transform: avatarDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease',
                    }}
                  />
                </button>

                {/* Avatar Dropdown Panel */}
                {avatarDropdownOpen && (
                  <div
                    ref={dropdownRef}
                    role="menu"
                    aria-label="User account menu"
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 8px)',
                      right: 0,
                      width: '250px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #DED4C4',
                      borderRadius: '6px',
                      boxShadow: '0 8px 24px rgba(23, 21, 19, 0.12)',
                      zIndex: 200,
                      overflow: 'hidden',
                      animation: 'dropdownFadeIn 0.15s ease',
                    }}
                  >
                    {/* Header: User Info */}
                    <div
                      style={{
                        padding: '0.95rem 1.15rem',
                        backgroundColor: '#FAF7F2',
                        borderBottom: '1px solid #EBE4D8',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          color: '#171513',
                          lineHeight: 1.25,
                        }}
                      >
                        {profile?.full_name || 'Member'}
                      </div>
                      <div
                        style={{
                          fontSize: '0.75rem',
                          color: '#847C73',
                          marginTop: '0.2rem',
                          wordBreak: 'break-all',
                        }}
                      >
                        {user?.email}
                      </div>
                      <div style={{ marginTop: '0.45rem', display: 'flex', flexWrap: 'wrap', gap: '0.35rem', alignItems: 'center' }}>
                        <span
                          className={`badge-dept ${profile?.role === 'admin' ? 'gold' : profile?.role === 'mentor' ? (profile?.is_verified ? 'gold' : '') : 'terracotta'}`}
                          style={{ fontSize: '0.625rem', padding: '0.12rem 0.45rem' }}
                        >
                          {roleLabel}
                        </span>
                        {userProgramDetail && (
                          <span style={{ fontSize: '0.7rem', color: '#847C73', fontWeight: 500 }}>
                            &bull; {userProgramDetail}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions List */}
                    <div style={{ padding: '0.4rem 0' }}>
                      {/* 1. Student Space / Primary Role Studio */}
                      <Link
                        to={roleWorkspacePath}
                        role="menuitem"
                        onClick={() => setAvatarDropdownOpen(false)}
                        className="dropdown-item"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.65rem',
                          padding: '0.6rem 1.15rem',
                          fontSize: '0.85rem',
                          color: '#171513',
                          textDecoration: 'none',
                          transition: 'background-color 0.15s ease',
                        }}
                      >
                        <GraduationCap size={15} style={{ color: '#A84B2B' }} />
                        <span>{roleWorkspaceLabel}</span>
                      </Link>

                      {/* 2. Browse Mentors */}
                      <Link
                        to="/mentors"
                        role="menuitem"
                        onClick={() => setAvatarDropdownOpen(false)}
                        className="dropdown-item"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.65rem',
                          padding: '0.6rem 1.15rem',
                          fontSize: '0.85rem',
                          color: '#171513',
                          textDecoration: 'none',
                          transition: 'background-color 0.15s ease',
                        }}
                      >
                        <Users size={15} style={{ color: '#5A534C' }} />
                        <span>Browse Mentors</span>
                      </Link>

                      {/* 3. Personal AI */}
                      <Link
                        to={profile?.role === 'mentor' ? '/mentor/ai' : '/ai'}
                        role="menuitem"
                        onClick={() => setAvatarDropdownOpen(false)}
                        className="dropdown-item"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.65rem',
                          padding: '0.6rem 1.15rem',
                          fontSize: '0.85rem',
                          color: '#171513',
                          textDecoration: 'none',
                          transition: 'background-color 0.15s ease',
                        }}
                      >
                        <Sparkles size={15} style={{ color: '#C5A46D' }} />
                        <span>Personal AI</span>
                      </Link>

                      {/* 4. Resume Builder */}
                      <Link
                        to="/resume"
                        role="menuitem"
                        onClick={() => setAvatarDropdownOpen(false)}
                        className="dropdown-item"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.65rem',
                          padding: '0.6rem 1.15rem',
                          fontSize: '0.85rem',
                          color: '#171513',
                          textDecoration: 'none',
                          transition: 'background-color 0.15s ease',
                        }}
                      >
                        <FileText size={15} style={{ color: '#5A534C' }} />
                        <span>Resume Builder</span>
                      </Link>

                      {/* Divider */}
                      <div style={{ height: '1px', backgroundColor: '#EBE4D8', margin: '0.35rem 0' }} />

                      {/* 5. Edit Profile */}
                      {canEditProfile && (
                        <button
                          type="button"
                          id="navbar-edit-profile-btn"
                          role="menuitem"
                          title="Edit Academic Profile"
                          aria-label="Edit Academic Profile"
                          onClick={() => {
                            setAvatarDropdownOpen(false);
                            setIsEditProfileOpen(true);
                          }}
                          className="dropdown-item"
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.65rem',
                            padding: '0.6rem 1.15rem',
                            fontSize: '0.85rem',
                            color: '#171513',
                            background: 'none',
                            border: 'none',
                            textAlign: 'left',
                            cursor: 'pointer',
                            transition: 'background-color 0.15s ease',
                          }}
                        >
                          <Edit3 size={15} style={{ color: '#5A534C' }} />
                          <span>Edit Profile</span>
                        </button>
                      )}

                      {/* 5. Sign Out */}
                      <button
                        type="button"
                        role="menuitem"
                        onClick={handleLogout}
                        className="dropdown-item"
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.65rem',
                          padding: '0.6rem 1.15rem',
                          fontSize: '0.85rem',
                          color: '#A84B2B',
                          background: 'none',
                          border: 'none',
                          textAlign: 'left',
                          cursor: 'pointer',
                          transition: 'background-color 0.15s ease',
                        }}
                      >
                        <LogOut size={15} style={{ color: '#A84B2B' }} />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* --- UNAUTHENTICATED: Sign In & Join Buttons --- */
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <Link
                  to="/login"
                  style={{
                    padding: '0.45rem 1.05rem',
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    color: '#171513',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #DED4C4',
                    borderRadius: '4px',
                    textDecoration: 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  style={{
                    padding: '0.45rem 1.15rem',
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    color: '#FFFFFF',
                    backgroundColor: '#A84B2B',
                    border: '1px solid #A84B2B',
                    borderRadius: '4px',
                    textDecoration: 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Join
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              display: 'none',
              background: 'none',
              border: 'none',
              padding: '0.5rem',
              cursor: 'pointer',
              color: '#171513',
            }}
            className="mobile-toggle"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* ============================================================== */}
        {/* MOBILE NAVIGATION DRAWER                                       */}
        {/* ============================================================== */}
        {mobileMenuOpen && (
          <div
            style={{
              backgroundColor: '#FAF7F2',
              borderTop: '1px solid #DED4C4',
              padding: '1.25rem 1.5rem',
            }}
            className="mobile-nav-panel"
          >
            {user ? (
              /* --- AUTHENTICATED MOBILE MENU --- */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* User Info Card */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    paddingBottom: '0.85rem',
                    borderBottom: '1px solid #DED4C4',
                  }}
                >
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      backgroundColor: '#171513',
                      color: '#FAF7F2',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      flexShrink: 0,
                    }}
                  >
                    {profile?.full_name ? profile.full_name.trim()[0].toUpperCase() : 'M'}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#171513' }}>
                      {profile?.full_name || 'Member'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#847C73' }}>
                      {user?.email}
                    </div>
                  </div>
                </div>

                {/* Primary 4 Links */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <Link
                    to="/"
                    onClick={() => setMobileMenuOpen(false)}
                    style={{
                      fontSize: '0.95rem',
                      fontWeight: isActive('/') ? '600' : '450',
                      color: '#171513',
                      textDecoration: 'none',
                    }}
                  >
                    Overview
                  </Link>
                  <Link
                    to="/projects"
                    onClick={() => setMobileMenuOpen(false)}
                    style={{
                      fontSize: '0.95rem',
                      fontWeight: isActive('/projects') ? '600' : '450',
                      color: '#171513',
                      textDecoration: 'none',
                    }}
                  >
                    Projects
                  </Link>
                  <Link
                    to="/discover"
                    id="navbar-mobile-discover-link"
                    onClick={() => setMobileMenuOpen(false)}
                    style={{
                      fontSize: '0.95rem',
                      fontWeight: isActive('/discover') ? '600' : '450',
                      color: '#171513',
                      textDecoration: 'none',
                    }}
                  >
                    Discover
                  </Link>
                  <Link
                    to="/journey"
                    onClick={() => setMobileMenuOpen(false)}
                    style={{
                      fontSize: '0.95rem',
                      fontWeight: isActive('/journey') ? '600' : '450',
                      color: '#171513',
                      textDecoration: 'none',
                    }}
                  >
                    Journey
                  </Link>
                </div>

                {/* Account / Workspace Actions */}
                <div
                  style={{
                    borderTop: '1px solid #DED4C4',
                    paddingTop: '0.85rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.85rem',
                  }}
                >
                  <Link
                    to={roleWorkspacePath}
                    onClick={() => setMobileMenuOpen(false)}
                    style={{
                      fontSize: '0.9rem',
                      fontWeight: 500,
                      color: '#171513',
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <GraduationCap size={16} style={{ color: '#A84B2B' }} />
                    <span>{roleWorkspaceLabel}</span>
                  </Link>
                  <Link
                    to="/mentors"
                    onClick={() => setMobileMenuOpen(false)}
                    style={{
                      fontSize: '0.9rem',
                      fontWeight: 500,
                      color: '#171513',
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <Users size={16} style={{ color: '#5A534C' }} />
                    <span>Browse Mentors</span>
                  </Link>
                  <Link
                    to={profile?.role === 'mentor' ? '/mentor/ai' : '/ai'}
                    onClick={() => setMobileMenuOpen(false)}
                    style={{
                      fontSize: '0.9rem',
                      fontWeight: 500,
                      color: '#171513',
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <Sparkles size={16} style={{ color: '#C5A46D' }} />
                    <span>Personal AI</span>
                  </Link>
                  <Link
                    to="/resume"
                    onClick={() => setMobileMenuOpen(false)}
                    style={{
                      fontSize: '0.9rem',
                      fontWeight: 500,
                      color: '#171513',
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <FileText size={16} style={{ color: '#5A534C' }} />
                    <span>Resume Builder</span>
                  </Link>

                  {canEditProfile && (
                    <button
                      type="button"
                      id="navbar-mobile-edit-profile-btn"
                      title="Edit Academic Profile"
                      aria-label="Edit Academic Profile"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setIsEditProfileOpen(true);
                      }}
                      style={{
                        fontSize: '0.9rem',
                        fontWeight: 500,
                        color: '#171513',
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        textAlign: 'left',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                      }}
                    >
                      <Edit3 size={16} style={{ color: '#5A534C' }} />
                      <span>Edit Profile</span>
                    </button>
                  )}
                </div>

                {/* Sign Out Button */}
                <div style={{ borderTop: '1px solid #DED4C4', paddingTop: '0.85rem' }}>
                  <button
                    onClick={handleLogout}
                    className="btn btn-secondary btn-sm"
                    style={{ width: '100%', color: '#A84B2B' }}
                  >
                    <LogOut size={14} style={{ color: '#A84B2B' }} />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            ) : (
              /* --- UNAUTHENTICATED MOBILE MENU --- */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <Link
                  to="/"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    fontSize: '0.95rem',
                    fontWeight: isActive('/') ? '600' : '450',
                    color: '#171513',
                    textDecoration: 'none',
                  }}
                >
                  Overview
                </Link>
                <Link
                  to="/projects"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    fontSize: '0.95rem',
                    fontWeight: isActive('/projects') ? '600' : '450',
                    color: '#171513',
                    textDecoration: 'none',
                  }}
                >
                  Projects
                </Link>

                <div style={{ borderTop: '1px solid #DED4C4', paddingTop: '1rem', display: 'flex', gap: '0.75rem' }}>
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    style={{
                      flex: 1,
                      textAlign: 'center',
                      padding: '0.5rem',
                      border: '1px solid #DED4C4',
                      borderRadius: '4px',
                      backgroundColor: '#FFFFFF',
                      textDecoration: 'none',
                      color: '#171513',
                      fontSize: '0.9rem',
                    }}
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/signup"
                    onClick={() => setMobileMenuOpen(false)}
                    style={{
                      flex: 1,
                      textAlign: 'center',
                      padding: '0.5rem',
                      border: '1px solid #A84B2B',
                      borderRadius: '4px',
                      backgroundColor: '#A84B2B',
                      textDecoration: 'none',
                      color: '#FFFFFF',
                      fontSize: '0.9rem',
                    }}
                  >
                    Join
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </header>

      <style>{`
        @keyframes dropdownFadeIn {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .dropdown-item:hover,
        .dropdown-item:focus {
          background-color: #FAF7F2 !important;
          outline: none;
        }
        @media (max-width: 900px) {
          .desktop-nav {
            display: none !important;
          }
          .desktop-auth {
            display: none !important;
          }
          .mobile-toggle {
            display: block !important;
          }
        }
      `}</style>

      {/* Edit Profile Modal */}
      {isEditProfileOpen && (
        <EditProfileModal isOpen={isEditProfileOpen} onClose={() => setIsEditProfileOpen(false)} />
      )}
    </>
  );
};
