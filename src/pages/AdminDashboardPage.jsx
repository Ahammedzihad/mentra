import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { AdminLayout } from '../components/AdminLayout';
import {
  GraduationCap,
  Users,
  FolderGit2,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  ChevronRight
} from 'lucide-react';

const STANDARD_COURSES = ['B.Tech', 'B.Des', 'BBA', 'BCA', 'MCA', 'MBA', 'Other'];

export const AdminDashboardPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Metrics
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalMentors: 0,
    verifiedMentors: 0,
    pendingMentors: 0,
    totalProjects: 0,
    pendingMentorships: 0,
    courseCounts: {}
  });

  const [pendingApplications, setPendingApplications] = useState([]);
  const [verifyingId, setVerifyingId] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);
  const [actionError, setActionError] = useState(null);

  const fetchDashboardData = useCallback(async () => {
    if (!user || !isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Fetch profiles (safe collegiate columns only)
      const { data: profilesData, error: profilesErr } = await supabase
        .from('profiles')
        .select('id, role, is_verified, department, course, full_name, created_at');

      if (profilesErr) throw profilesErr;

      const allProfiles = profilesData || [];
      const students = allProfiles.filter((p) => p.role === 'student');
      const mentors = allProfiles.filter((p) => p.role === 'mentor');
      const verified = mentors.filter((m) => m.is_verified);
      const pending = mentors.filter((m) => !m.is_verified);

      // Course breakdown for students
      const courseMap = {};
      STANDARD_COURSES.forEach((c) => { courseMap[c] = 0; });
      students.forEach((s) => {
        const c = s.course || s.department || 'Other';
        if (courseMap[c] !== undefined) {
          courseMap[c] += 1;
        } else {
          courseMap['Other'] = (courseMap['Other'] || 0) + 1;
        }
      });

      // 2. Fetch projects count
      const { count: projectsCount, error: projectsErr } = await supabase
        .from('projects')
        .select('id', { count: 'exact', head: true });

      if (projectsErr) {
        console.warn('Projects count query notice:', projectsErr.message);
      }

      // 3. Fetch pending mentorships count if accessible
      let pendingMentorshipCount = 0;
      try {
        const { count: mentorReqCount } = await supabase
          .from('mentorships')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending');
        pendingMentorshipCount = mentorReqCount || 0;
      } catch (_mErr) {
        // Handled gracefully if policy restricts
      }

      setStats({
        totalStudents: students.length,
        totalMentors: mentors.length,
        verifiedMentors: verified.length,
        pendingMentors: pending.length,
        totalProjects: projectsCount || 0,
        pendingMentorships: pendingMentorshipCount,
        courseCounts: courseMap
      });

      // Show top 3 pending mentors
      setPendingApplications(pending.slice(0, 3));
    } catch (err) {
      console.error('Error loading admin dashboard stats:', err);
      setError('Unable to load full administration metrics. Please check network connection.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleQuickVerify = async (mentorId, mentorName) => {
    if (verifyingId) return;
    setVerifyingId(mentorId);
    setActionError(null);
    setActionSuccess(null);

    try {
      const { error: rpcErr } = await supabase.rpc('verify_mentor', {
        target_mentor_id: mentorId
      });
      if (rpcErr) throw rpcErr;

      setActionSuccess(`Faculty mentor "${mentorName}" verified successfully.`);
      // Refresh
      fetchDashboardData();
    } catch (err) {
      setActionError(err.message || 'Verification failed. Please retry.');
    } finally {
      setVerifyingId(null);
    }
  };

  return (
    <AdminLayout activeTab="dashboard">
      {/* Action Alerts */}
      {actionSuccess && (
        <div
          className="notice-box success"
          style={{
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            padding: '0.85rem 1.15rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid #7FA482',
            backgroundColor: '#F1F7F2',
            color: '#245C2D',
            fontSize: '0.9rem'
          }}
        >
          <CheckCircle2 size={18} />
          <span>{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div
          className="notice-box error"
          style={{
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            padding: '0.85rem 1.15rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid #D16B58',
            backgroundColor: '#FDF2F0',
            color: '#872B1B',
            fontSize: '0.9rem'
          }}
        >
          <AlertCircle size={18} />
          <span>{actionError}</span>
        </div>
      )}

      {error && (
        <div className="notice-box" style={{ marginBottom: '1.5rem' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Metric Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2.5rem'
        }}
      >
        {/* Total Students */}
        <Link to="/admin/students" style={{ textDecoration: 'none' }}>
          <div
            className="card-academic"
            style={{
              padding: '1.5rem',
              backgroundColor: 'var(--color-white)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-subtle)',
              borderTop: '3px solid var(--color-terracotta)',
              transition: 'var(--transition-smooth)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Total Students
                </span>
                <div className="font-serif" style={{ fontSize: '2.2rem', color: 'var(--color-primary-dark)', fontWeight: 600, marginTop: '0.2rem' }}>
                  {loading ? '...' : stats.totalStudents}
                </div>
              </div>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--color-terracotta-subtle)',
                  color: 'var(--color-terracotta)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <GraduationCap size={22} />
              </div>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-terracotta)', marginTop: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <span>View Roster</span>
              <ChevronRight size={14} />
            </div>
          </div>
        </Link>

        {/* Total Faculty Mentors */}
        <Link to="/admin/mentors" style={{ textDecoration: 'none' }}>
          <div
            className="card-academic"
            style={{
              padding: '1.5rem',
              backgroundColor: 'var(--color-white)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-subtle)',
              borderTop: '3px solid var(--color-warm-gold)',
              transition: 'var(--transition-smooth)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Faculty Mentors
                </span>
                <div className="font-serif" style={{ fontSize: '2.2rem', color: 'var(--color-primary-dark)', fontWeight: 600, marginTop: '0.2rem' }}>
                  {loading ? '...' : stats.totalMentors}
                </div>
              </div>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--color-warm-gold-subtle)',
                  color: '#8C6A30',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Users size={22} />
              </div>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.8rem' }}>
              <strong>{stats.verifiedMentors}</strong> verified &bull; <strong>{stats.pendingMentors}</strong> pending
            </div>
          </div>
        </Link>

        {/* Total Projects */}
        <Link to="/admin/projects" style={{ textDecoration: 'none' }}>
          <div
            className="card-academic"
            style={{
              padding: '1.5rem',
              backgroundColor: 'var(--color-white)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-subtle)',
              borderTop: '3px solid var(--color-primary-dark)',
              transition: 'var(--transition-smooth)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Collegiate Projects
                </span>
                <div className="font-serif" style={{ fontSize: '2.2rem', color: 'var(--color-primary-dark)', fontWeight: 600, marginTop: '0.2rem' }}>
                  {loading ? '...' : stats.totalProjects}
                </div>
              </div>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'rgba(23, 21, 19, 0.08)',
                  color: 'var(--color-primary-dark)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <FolderGit2 size={22} />
              </div>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <span>Registry Archive</span>
              <ChevronRight size={14} />
            </div>
          </div>
        </Link>

        {/* Pending / Flagged Actions */}
        <div
          className="card-academic"
          style={{
            padding: '1.5rem',
            backgroundColor: stats.pendingMentors > 0 ? '#FAF4EA' : 'var(--color-white)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-subtle)',
            borderTop: stats.pendingMentors > 0 ? '3px solid #D9822B' : '3px solid #7FA482',
            transition: 'var(--transition-smooth)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Pending Actions
              </span>
              <div className="font-serif" style={{ fontSize: '2.2rem', color: stats.pendingMentors > 0 ? '#8F4F08' : '#245C2D', fontWeight: 600, marginTop: '0.2rem' }}>
                {loading ? '...' : stats.pendingMentors}
              </div>
            </div>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: stats.pendingMentors > 0 ? 'rgba(217, 130, 43, 0.15)' : 'rgba(127, 164, 130, 0.15)',
                color: stats.pendingMentors > 0 ? '#8F4F08' : '#245C2D',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Clock size={22} />
            </div>
          </div>
          <div style={{ fontSize: '0.8rem', color: stats.pendingMentors > 0 ? '#8F4F08' : '#245C2D', marginTop: '0.8rem' }}>
            {stats.pendingMentors > 0 ? `${stats.pendingMentors} mentor applications pending review` : 'All faculty applications cleared'}
          </div>
        </div>
      </div>

      {/* Main Grid: Pending Review Highlight & Student Course Distribution */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '2rem' }}>
        {/* Pending Applications Review Widget */}
        <div
          className="card-academic"
          style={{
            padding: '1.75rem',
            backgroundColor: 'var(--color-white)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-subtle)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldCheck size={20} style={{ color: 'var(--color-terracotta)' }} />
              <h2 className="font-serif" style={{ fontSize: '1.25rem', color: 'var(--color-primary-dark)', margin: 0 }}>
                Faculty Verification Queue
              </h2>
            </div>
            <Link to="/admin/mentors" className="btn btn-secondary btn-sm" style={{ fontSize: '0.8rem' }}>
              Full Registry
            </Link>
          </div>

          {stats.pendingMentors === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-secondary)' }}>
              <CheckCircle2 size={36} style={{ color: '#266432', margin: '0 auto 0.75rem auto' }} />
              <div style={{ fontWeight: 600, color: 'var(--color-primary-dark)' }}>All Applications Reviewed</div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Zero faculty mentor profiles currently awaiting institutional approval.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {pendingApplications.map((mentor) => (
                <div
                  key={mentor.id}
                  style={{
                    padding: '1rem',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--color-warm-ivory-light)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '1rem'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--color-primary-dark)' }}>{mentor.full_name}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                      Department of {mentor.department || 'Academic Studies'}
                    </div>
                  </div>
                  <button
                    onClick={() => handleQuickVerify(mentor.id, mentor.full_name)}
                    disabled={verifyingId === mentor.id}
                    className="btn btn-primary btn-sm"
                    style={{ fontSize: '0.78rem', padding: '0.4rem 0.8rem', whiteSpace: 'nowrap' }}
                  >
                    {verifyingId === mentor.id ? 'Verifying...' : 'Verify'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Student Course Distribution */}
        <div
          className="card-academic"
          style={{
            padding: '1.75rem',
            backgroundColor: 'var(--color-white)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-subtle)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BookOpen size={20} style={{ color: 'var(--color-warm-gold)' }} />
              <h2 className="font-serif" style={{ fontSize: '1.25rem', color: 'var(--color-primary-dark)', margin: 0 }}>
                Course Enrollment Distribution
              </h2>
            </div>
            <Link to="/admin/students" className="btn btn-secondary btn-sm" style={{ fontSize: '0.8rem' }}>
              Filter Students
            </Link>
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
            Active collegiate enrollment across recognized academic degree programs:
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.85rem' }}>
            {STANDARD_COURSES.map((course) => {
              const count = stats.courseCounts[course] || 0;
              return (
                <Link
                  key={course}
                  to={`/admin/students?course=${encodeURIComponent(course)}`}
                  style={{
                    padding: '0.9rem',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--color-warm-ivory-light)',
                    textDecoration: 'none',
                    textAlign: 'center',
                    transition: 'var(--transition-smooth)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-terracotta)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-subtle)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-primary-dark)' }}>
                    {course}
                  </div>
                  <div className="font-serif" style={{ fontSize: '1.4rem', color: 'var(--color-terracotta)', fontWeight: 600, marginTop: '0.2rem' }}>
                    {count}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Students</div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};
