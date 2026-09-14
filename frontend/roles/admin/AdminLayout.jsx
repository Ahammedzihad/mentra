import React from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  GraduationCap,
  Users,
  FolderGit2,
  FileText,
  Shield,
  ArrowLeft,
  CheckCircle2,
  Clock
} from 'lucide-react';

const MAIN_NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
  { id: 'students', label: 'Students', path: '/admin/students', icon: GraduationCap },
  { id: 'mentors', label: 'Mentors', path: '/admin/mentors', icon: Users },
  { id: 'projects', label: 'Projects', path: '/admin/projects', icon: FolderGit2 },
  { id: 'reports', label: 'Reports', path: '/admin/reports', icon: FileText },
];

const STUDENT_COURSES = [
  { id: 'All', label: 'All Students' },
  { id: 'B.Tech', label: 'B.Tech' },
  { id: 'B.Des', label: 'B.Des' },
  { id: 'BBA', label: 'BBA' },
  { id: 'BCA', label: 'BCA' },
  { id: 'MCA', label: 'MCA' },
  { id: 'MBA', label: 'MBA' },
  { id: 'Other', label: 'Other' },
];

const MENTOR_CATEGORIES = [
  { id: 'all', label: 'All Mentors', icon: Users },
  { id: 'verified', label: 'Verified', icon: CheckCircle2 },
  { id: 'pending', label: 'Pending Verification', icon: Clock },
];

const PROJECT_VIEWS = [
  { id: 'all', label: 'All Projects', icon: FolderGit2 },
  { id: 'student', label: 'Student Projects', icon: GraduationCap },
  { id: 'mentor', label: 'Mentor Projects', icon: Users },
];

export const AdminLayout = ({ children, activeTab }) => {
  const { profile } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const currentCourse = searchParams.get('course') || 'All';
  const currentStatus = searchParams.get('status') || 'all';
  const currentView = searchParams.get('view') || 'all';

  return (
    <div style={{ backgroundColor: 'var(--color-warm-ivory)', minHeight: 'calc(100vh - 4.25rem)' }}>
      {/* Primary Admin Header */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid var(--border-subtle)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        <div className="container" style={{ paddingTop: '1.25rem', paddingBottom: '0.75rem' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
              marginBottom: '1rem',
            }}
          >
            {/* Title & Badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--color-primary-dark)',
                  color: 'var(--color-warm-gold)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Shield size={20} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <h2
                    className="font-serif"
                    style={{
                      fontSize: '1.35rem',
                      color: 'var(--color-primary-dark)',
                      margin: 0,
                      fontWeight: 700,
                      letterSpacing: '-0.01em',
                    }}
                  >
                    Institutional Administration Portal
                  </h2>
                  <span
                    className="badge-dept gold"
                    style={{
                      fontSize: '0.65rem',
                      padding: '0.1rem 0.45rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    Administrator
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                  Logged in as <strong>{profile?.full_name || 'Academic Administrator'}</strong> &bull; Institutional Governance
                </div>
              </div>
            </div>

            {/* Back to Public Site Link */}
            <div>
              <Link
                to="/"
                style={{
                  fontSize: '0.825rem',
                  color: 'var(--text-secondary)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  textDecoration: 'none',
                  padding: '0.35rem 0.65rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-subtle)',
                  backgroundColor: 'var(--surface-primary)',
                  transition: 'var(--transition-smooth)',
                }}
              >
                <ArrowLeft size={13} />
                <span>Return to Public Site</span>
              </Link>
            </div>
          </div>

          {/* Primary Admin Navigation Tabs */}
          <nav
            style={{
              display: 'flex',
              gap: '0.5rem',
              overflowX: 'auto',
              paddingBottom: '0.25rem',
              scrollbarWidth: 'none',
            }}
          >
            {MAIN_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isSelected = activeTab === item.id || location.pathname === item.path;

              return (
                <Link
                  key={item.id}
                  to={item.path}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    padding: '0.6rem 1rem',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    fontWeight: isSelected ? 600 : 500,
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                    transition: 'var(--transition-smooth)',
                    color: isSelected ? 'var(--color-primary-dark)' : 'var(--text-secondary)',
                    backgroundColor: isSelected ? 'var(--surface-secondary)' : 'transparent',
                    borderBottom: isSelected ? '2.5px solid var(--color-terracotta)' : '2.5px solid transparent',
                  }}
                >
                  <Icon
                    size={16}
                    style={{
                      color: isSelected ? 'var(--color-terracotta)' : 'var(--text-muted)',
                    }}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sub-Navigation Bar for Students */}
        {activeTab === 'students' && (
          <div
            style={{
              backgroundColor: 'var(--color-warm-ivory)',
              borderTop: '1px solid var(--border-subtle)',
              padding: '0.5rem 0',
            }}
          >
            <div
              className="container"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                overflowX: 'auto',
                scrollbarWidth: 'none',
              }}
            >
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginRight: '0.5rem', whiteSpace: 'nowrap' }}>
                Course:
              </span>
              {STUDENT_COURSES.map((course) => {
                const isCurrent = currentCourse.toLowerCase() === course.id.toLowerCase();
                const linkTo = course.id === 'All' ? '/admin/students' : `/admin/students?course=${encodeURIComponent(course.id)}`;

                return (
                  <Link
                    key={course.id}
                    to={linkTo}
                    style={{
                      display: 'inline-block',
                      padding: '0.3rem 0.75rem',
                      borderRadius: '16px',
                      fontSize: '0.8rem',
                      fontWeight: isCurrent ? 600 : 500,
                      textDecoration: 'none',
                      whiteSpace: 'nowrap',
                      backgroundColor: isCurrent ? 'var(--color-primary-dark)' : 'transparent',
                      color: isCurrent ? '#FFFFFF' : 'var(--text-secondary)',
                      border: isCurrent ? '1px solid var(--color-primary-dark)' : '1px solid transparent',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {course.label}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Sub-Navigation Bar for Mentors */}
        {activeTab === 'mentors' && (
          <div
            style={{
              backgroundColor: 'var(--color-warm-ivory)',
              borderTop: '1px solid var(--border-subtle)',
              padding: '0.5rem 0',
            }}
          >
            <div
              className="container"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                overflowX: 'auto',
                scrollbarWidth: 'none',
              }}
            >
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginRight: '0.5rem', whiteSpace: 'nowrap' }}>
                Status:
              </span>
              {MENTOR_CATEGORIES.map((cat) => {
                const isCurrent = currentStatus.toLowerCase() === cat.id.toLowerCase();
                const linkTo = cat.id === 'all' ? '/admin/mentors' : `/admin/mentors?status=${cat.id}`;
                const CatIcon = cat.icon;

                return (
                  <Link
                    key={cat.id}
                    to={linkTo}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.3rem 0.75rem',
                      borderRadius: '16px',
                      fontSize: '0.8rem',
                      fontWeight: isCurrent ? 600 : 500,
                      textDecoration: 'none',
                      whiteSpace: 'nowrap',
                      backgroundColor: isCurrent ? 'var(--color-primary-dark)' : 'transparent',
                      color: isCurrent ? '#FFFFFF' : 'var(--text-secondary)',
                      border: isCurrent ? '1px solid var(--color-primary-dark)' : '1px solid transparent',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <CatIcon size={13} />
                    <span>{cat.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Sub-Navigation Bar for Projects */}
        {activeTab === 'projects' && (
          <div
            style={{
              backgroundColor: 'var(--color-warm-ivory)',
              borderTop: '1px solid var(--border-subtle)',
              padding: '0.5rem 0',
            }}
          >
            <div
              className="container"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                overflowX: 'auto',
                scrollbarWidth: 'none',
              }}
            >
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginRight: '0.5rem', whiteSpace: 'nowrap' }}>
                View:
              </span>
              {PROJECT_VIEWS.map((v) => {
                const isCurrent = currentView.toLowerCase() === v.id.toLowerCase();
                const linkTo = v.id === 'all' ? '/admin/projects' : `/admin/projects?view=${v.id}`;
                const ViewIcon = v.icon;

                return (
                  <Link
                    key={v.id}
                    to={linkTo}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.3rem 0.75rem',
                      borderRadius: '16px',
                      fontSize: '0.8rem',
                      fontWeight: isCurrent ? 600 : 500,
                      textDecoration: 'none',
                      whiteSpace: 'nowrap',
                      backgroundColor: isCurrent ? 'var(--color-primary-dark)' : 'transparent',
                      color: isCurrent ? '#FFFFFF' : 'var(--text-secondary)',
                      border: isCurrent ? '1px solid var(--color-primary-dark)' : '1px solid transparent',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <ViewIcon size={13} />
                    <span>{v.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Main Page Content */}
      <main>{children}</main>
    </div>
  );
};
