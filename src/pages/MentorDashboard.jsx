import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  ShieldCheck,
  Clock,
  GraduationCap,
  FolderGit2,
  BookOpen,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  LogOut
} from 'lucide-react';

export const MentorDashboard = () => {
  const { user, profile, loading: authLoading, refreshProfile, signOut } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isVerified = Boolean(profile?.role === 'mentor' && profile?.is_verified === true);

  useEffect(() => {
    // Only fetch student projects if the mentor is actively verified
    if (!isVerified || !isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    const fetchProjects = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: projErr } = await supabase
          .from('projects')
          .select('*, profiles:user_id(full_name, department, role)')
          .order('created_at', { ascending: false });

        if (projErr) throw projErr;
        setProjects(data || []);
      } catch (err) {
        console.error('Error fetching projects for mentor:', err);
        setError(err.message || 'Unable to fetch project registry.');
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [isVerified]);

  // 1. Loading State (Do not briefly render Mentor Studio while loading)
  if (authLoading) {
    return (
      <div
        style={{
          minHeight: '70vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          backgroundColor: 'var(--color-warm-ivory)',
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
          Verifying faculty credentials...
        </p>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // 2. Profile Unavailable / Error State (Fail Closed)
  if (!profile) {
    return (
      <div style={{ padding: '4rem 1.5rem', minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-warm-ivory)' }}>
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
            Could not retrieve your academic profile to verify mentor accreditation. Access to Mentor Studio is restricted.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => refreshProfile()}
              className="btn btn-primary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <RefreshCw size={14} />
              <span>Retry</span>
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

  // 3. Unverified Mentor State (Pending Review Screen)
  // Must strictly depend on: role === 'mentor' && is_verified === false
  if (profile.role === 'mentor' && !profile.is_verified) {
    return (
      <div
        style={{
          padding: '4rem 1.5rem 6rem 1.5rem',
          minHeight: '80vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--color-warm-ivory)',
        }}
      >
        <div className="container container-narrow">
          <div
            className="card-academic"
            style={{
              maxWidth: '560px',
              margin: '0 auto',
              padding: '3rem 2.5rem',
              textAlign: 'center',
              backgroundColor: 'var(--color-white)',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            {/* Review Status Icon */}
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-warm-gold-subtle)',
                border: '1px solid rgba(197, 164, 109, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.25rem auto',
                color: '#7A5714',
              }}
            >
              <Clock size={26} />
            </div>

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
              <span className="badge-dept gold">Faculty Review Protocol</span>
              {profile?.department && (
                <span className="badge-dept">{profile.department}</span>
              )}
            </div>

            {/* Exact Required Heading */}
            <h1
              className="font-serif"
              style={{
                fontSize: 'clamp(1.65rem, 3.5vw, 2.1rem)',
                color: 'var(--color-primary-dark)',
                marginTop: '0.35rem',
                marginBottom: '1rem',
                lineHeight: 1.3,
              }}
            >
              Your mentor account is pending review. You'll get full access once approved.
            </h1>

            {/* Applicant Context */}
            <p
              style={{
                fontSize: '0.925rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.6,
                marginBottom: '1.75rem',
              }}
            >
              Thank you for applying to advise scholars, <strong>{profile.full_name || 'Colleague'}</strong>. To safeguard academic rigor and student guidance standards, the college academic committee manually ratifies mentor appointments.
            </p>

            {/* Clean, minimal actions — NO dashboard tools, NO project review actions, NO fake verify button */}
            <div
              style={{
                display: 'flex',
                gap: '0.75rem',
                justifyContent: 'center',
                flexWrap: 'wrap',
                borderTop: '1px solid var(--border-subtle)',
                paddingTop: '1.5rem',
              }}
            >
              <Link to="/projects" className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                <FolderGit2 size={14} />
                <span>Explore Public Projects</span>
              </Link>
              <button
                onClick={() => refreshProfile()}
                className="btn btn-secondary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                title="Check if your verification has been updated by administration"
              >
                <RefreshCw size={14} />
                <span>Check Status</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 4. Verified Mentor Studio (Full Access)
  return (
    <div style={{ padding: '3rem 0 5rem 0', backgroundColor: 'var(--color-warm-ivory)', minHeight: '80vh' }}>
      <div className="container">
        {/* Mentor Profile Overview Header */}
        <div
          style={{
            backgroundColor: 'var(--color-white)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '2.5rem',
            marginBottom: '2rem',
            boxShadow: 'var(--shadow-subtle)',
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1.5rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.5rem' }}>
                <span className="badge-dept gold">Mentor Studio</span>
                <span className="badge-dept">{profile?.department || 'Faculty Department'}</span>
              </div>
              <h1 className="font-serif" style={{ fontSize: '2.25rem', marginBottom: '0.35rem' }}>
                {profile?.full_name || 'Academic Mentor'}
              </h1>
              <p style={{ fontSize: '0.925rem', color: 'var(--text-secondary)' }}>
                {user?.email} &bull; Collegiate Advisor &bull; Mentra Faculty Network
              </p>
            </div>

            {/* Verified Status Pill */}
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  backgroundColor: 'var(--color-warm-gold-subtle)',
                  border: '1px solid rgba(197, 164, 109, 0.4)',
                  padding: '0.6rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  color: '#7A5714',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                }}
              >
                <ShieldCheck size={18} style={{ color: '#8C6A30' }} />
                <span>Verified Mentor</span>
              </div>
            </div>
          </div>

          {/* Verification Protocol Notice */}
          <div
            style={{
              marginTop: '1.75rem',
              paddingTop: '1.5rem',
              borderTop: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              <CheckCircle2 size={18} style={{ color: 'var(--color-warm-gold)', flexShrink: 0, marginTop: '0.15rem' }} />
              <span>
                <strong>Accredited Institutional Mentor:</strong> Your credentials have been officially ratified by the Academic Advisory Board. You hold full authority to endorse student capstones, advise cohorts, and guide undergraduate research.
              </span>
            </div>
          </div>
        </div>

        {error && (
          <div className="notice-box error" style={{ marginBottom: '2rem' }}>
            <span>{error}</span>
          </div>
        )}

        {/* Mentor Responsibilities Grid */}
        <div className="grid-3" style={{ marginBottom: '2.5rem' }}>
          <div className="card-academic">
            <div style={{ color: 'var(--color-terracotta)', marginBottom: '0.65rem' }}>
              <BookOpen size={22} />
            </div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.35rem' }}>Methodological Review</h3>
            <p style={{ fontSize: '0.85rem' }}>
              Evaluate student research approaches, code architecture, and analytical hypotheses across the project registry.
            </p>
          </div>

          <div className="card-academic">
            <div style={{ color: 'var(--color-warm-gold)', marginBottom: '0.65rem' }}>
              <GraduationCap size={22} />
            </div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.35rem' }}>Cohort Guidance</h3>
            <p style={{ fontSize: '0.85rem' }}>
              Steward students through the 6 stages of their academic journey, advising on research papers and symposium preparations.
            </p>
          </div>

          <div className="card-academic">
            <div style={{ color: 'var(--color-primary-dark)', marginBottom: '0.65rem' }}>
              <FolderGit2 size={22} />
            </div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.35rem' }}>Interdisciplinary Synergy</h3>
            <p style={{ fontSize: '0.85rem' }}>
              Connect talented undergraduates in {profile?.department || 'your department'} with cross-functional peers in other cohorts.
            </p>
          </div>
        </div>

        {/* Student Projects Under Review */}
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem',
            }}
          >
            <div>
              <span className="label-academic charcoal">Active Registry</span>
              <h2 style={{ fontSize: '1.65rem', marginTop: '0.2rem' }}>Student Projects for Review</h2>
            </div>
            <Link to="/projects" className="btn btn-secondary btn-sm">
              <span>View Full Registry</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          {loading ? (
            <div className="card-academic" style={{ textAlign: 'center', padding: '3rem' }}>
              <p style={{ color: 'var(--text-muted)' }}>Retrieving submitted collegiate projects...</p>
            </div>
          ) : projects.length === 0 ? (
            <div
              className="card-academic"
              style={{
                textAlign: 'center',
                padding: '3rem 2rem',
                backgroundColor: 'var(--color-warm-ivory-light)',
              }}
            >
              <FolderGit2 size={32} style={{ color: 'var(--color-terracotta)', margin: '0 auto 1rem auto' }} />
              <h3 className="font-serif" style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>
                No active student projects
              </h3>
              <p style={{ fontSize: '0.875rem', maxWidth: '420px', margin: '0 auto' }}>
                When undergraduates in your department or the community inaugurate new research initiatives, they will appear here for mentorship and scholarly appraisal.
              </p>
            </div>
          ) : (
            <div className="grid-2">
              {projects.map((proj) => {
                const creatorName = proj.profiles?.full_name || 'Collegiate Scholar';
                const creatorDept = proj.profiles?.department;
                const createdDate = proj.created_at
                  ? new Date(proj.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
                  : 'Active';

                return (
                  <div key={proj.id} className="card-academic" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                          {creatorDept ? (
                            <span className="badge-dept terracotta">{creatorDept}</span>
                          ) : (
                            <span className="badge-dept">Student Project</span>
                          )}
                        </div>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {createdDate}
                        </span>
                      </div>

                      <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: 'var(--color-primary-dark)' }}>
                        {proj.title}
                      </h3>
                      <p style={{ fontSize: '0.875rem', lineHeight: '1.6', color: 'var(--text-secondary)', marginBottom: '1.25rem', whiteSpace: 'pre-line' }}>
                        {proj.description}
                      </p>
                    </div>

                    <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                        By <strong>{creatorName}</strong>
                      </div>
                      <Link to="/projects" style={{ fontSize: '0.8rem', color: 'var(--color-terracotta)', fontWeight: 600 }}>
                        Review in Registry &rarr;
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
