import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  UserCheck,
  AlertCircle,
  RefreshCw,
  ArrowLeft,
  Building,
  GraduationCap
} from 'lucide-react';

export const AdminMentorVerificationPage = () => {
  const { user, profile } = useAuth();
  const [pendingMentors, setPendingMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [verifyingMentorId, setVerifyingMentorId] = useState(null);

  const fetchPendingMentors = useCallback(async () => {
    if (!user || !isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Query pending mentor profiles (role = 'mentor' AND is_verified = false)
      // Strictly safe public collegiate fields; no email selected to honor PII protection
      const { data, error: fetchErr } = await supabase
        .from('profiles')
        .select('id, full_name, department, role, is_verified, bio, created_at')
        .eq('role', 'mentor')
        .eq('is_verified', false)
        .order('created_at', { ascending: false });

      if (fetchErr) throw fetchErr;
      setPendingMentors(data || []);
    } catch (err) {
      console.error('Error fetching pending mentors:', err);
      setError('Unable to retrieve pending faculty mentor applications. Please verify connection and retry.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPendingMentors();
  }, [fetchPendingMentors]);

  const handleVerifyMentor = async (mentorId, mentorName) => {
    if (!user || verifyingMentorId) return;

    setVerifyingMentorId(mentorId);
    setActionError(null);
    setActionSuccess(null);

    try {
      // Call database-enforced SECURITY DEFINER verify_mentor() function
      const { data, error: rpcErr } = await supabase.rpc('verify_mentor', {
        target_mentor_id: mentorId
      });

      if (rpcErr) throw rpcErr;

      // Update state: remove from pending list
      setPendingMentors((prev) => prev.filter((m) => m.id !== mentorId));
      setActionSuccess(
        `Faculty mentor "${mentorName || 'Applicant'}" has been successfully verified. They now appear in the Browse Mentors directory.`
      );
    } catch (err) {
      console.error('Error verifying mentor:', err);
      setActionError(err.message || 'Failed to verify mentor. Please try again.');
    } finally {
      setVerifyingMentorId(null);
    }
  };

  return (
    <div style={{ padding: '3rem 0 5rem 0', minHeight: '80vh', backgroundColor: 'var(--color-warm-ivory)' }}>
      <div className="container">
        {/* Header Breadcrumb & Tag */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.5rem' }}>
            <Link to="/" className="btn btn-secondary btn-sm" style={{ padding: '0.3rem 0.6rem' }}>
              <ArrowLeft size={14} />
              <span>Home</span>
            </Link>
            <span
              className="badge-dept gold"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                backgroundColor: 'var(--color-warm-gold-subtle)',
                color: '#7A5714',
                border: '1px solid rgba(197, 164, 109, 0.4)'
              }}
            >
              <ShieldCheck size={13} style={{ color: '#8C6A30' }} />
              <span>Collegiate Administration</span>
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1.5rem' }}>
            <div>
              <h1 className="font-serif" style={{ fontSize: '2.25rem', marginBottom: '0.35rem', color: 'var(--color-primary-dark)' }}>
                Mentor Verification Panel
              </h1>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', maxWidth: '640px' }}>
                Review faculty mentor credentialing applications. Only verified faculty advisors may receive student research inquiries and participate in the mentorship network.
              </p>
            </div>

            <button
              onClick={fetchPendingMentors}
              disabled={loading}
              className="btn btn-secondary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <RefreshCw size={14} style={{ animation: loading ? 'spin 0.8s linear infinite' : 'none' }} />
              <span>Refresh Applications</span>
            </button>
          </div>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div
            className="notice-box error"
            style={{
              marginBottom: '2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              padding: '1rem 1.25rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid #D16B58',
              backgroundColor: '#FDF2F0',
              color: '#872B1B',
              fontSize: '0.9rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
            <button
              onClick={fetchPendingMentors}
              className="btn btn-secondary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', borderColor: '#D16B58', color: '#872B1B' }}
            >
              <RefreshCw size={13} />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* Action Error Banner */}
        {actionError && (
          <div
            className="notice-box error"
            style={{
              marginBottom: '2rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              padding: '1rem 1.25rem',
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

        {/* Action Success Banner */}
        {actionSuccess && (
          <div
            className="notice-box success"
            style={{
              marginBottom: '2rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              padding: '1rem 1.25rem',
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

        {/* Applications Content */}
        {loading ? (
          <div className="card-academic" style={{ textAlign: 'center', padding: '3.5rem' }}>
            <div
              style={{
                width: '28px',
                height: '28px',
                border: '2px solid var(--border-subtle)',
                borderTopColor: 'var(--color-primary-dark)',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
                margin: '0 auto 1rem auto'
              }}
            />
            <p style={{ color: 'var(--text-muted)' }}>Loading pending faculty applications...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : pendingMentors.length === 0 ? (
          <div
            className="card-academic"
            style={{
              textAlign: 'center',
              padding: '3.5rem 2rem',
              backgroundColor: 'var(--color-warm-ivory-light)'
            }}
          >
            <CheckCircle2 size={40} style={{ color: '#266432', margin: '0 auto 1rem auto' }} />
            <h3 className="font-serif" style={{ fontSize: '1.3rem', marginBottom: '0.4rem', color: 'var(--color-primary-dark)' }}>
              All Faculty Applications Reviewed
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', maxWidth: '440px', margin: '0 auto 1.5rem auto' }}>
              There are currently no faculty mentor profiles pending collegiate review. New mentor registrations will appear here for institutional verification.
            </p>
            <Link to="/mentors" className="btn btn-secondary btn-sm">
              View Verified Mentors Registry
            </Link>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="label-academic gold">Action Required</span>
                <h2 className="font-serif" style={{ fontSize: '1.4rem', color: 'var(--color-primary-dark)' }}>
                  Pending Verification ({pendingMentors.length})
                </h2>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {pendingMentors.map((mentor) => {
                const isVerifying = verifyingMentorId === mentor.id;
                const appliedDate = mentor.created_at
                  ? new Date(mentor.created_at).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })
                  : 'Recent';

                return (
                  <div
                    key={mentor.id}
                    className="card-academic"
                    style={{
                      padding: '1.75rem',
                      backgroundColor: 'var(--color-white)',
                      borderRadius: 'var(--radius-md)',
                      boxShadow: 'var(--shadow-subtle)'
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: '1.5rem'
                      }}
                    >
                      <div style={{ flex: 1, minWidth: '280px' }}>
                        {/* Department Badge & Status Tag */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.45rem' }}>
                          <span className="badge-dept terracotta">{mentor.department || 'Academic Department'}</span>
                          <span
                            className="badge-dept gold"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              backgroundColor: 'var(--color-warm-gold-subtle)',
                              color: '#7A5714',
                              border: '1px solid rgba(197, 164, 109, 0.4)'
                            }}
                          >
                            <Clock size={12} />
                            <span>Pending Review</span>
                          </span>
                        </div>

                        {/* Mentor Name */}
                        <h3 className="font-serif" style={{ fontSize: '1.3rem', marginBottom: '0.25rem', color: 'var(--color-primary-dark)' }}>
                          {mentor.full_name}
                        </h3>

                        {/* Department Subtitle & Date */}
                        <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginBottom: '0.85rem' }}>
                          Department of {mentor.department || 'Academic Studies'} &bull; Applied on {appliedDate}
                        </div>

                        {/* Short Bio / Credentials Statement */}
                        {mentor.bio ? (
                          <p style={{ fontSize: '0.875rem', lineHeight: '1.6', color: 'var(--text-secondary)', margin: '0' }}>
                            {mentor.bio}
                          </p>
                        ) : (
                          <p style={{ fontSize: '0.875rem', lineHeight: '1.6', color: 'var(--text-muted)', fontStyle: 'italic', margin: '0' }}>
                            Faculty advisor in the Department of {mentor.department || 'Academic Studies'}. No extended statement provided.
                          </p>
                        )}
                      </div>

                      {/* Verify Action Button */}
                      <div style={{ alignSelf: 'center' }}>
                        <button
                          onClick={() => handleVerifyMentor(mentor.id, mentor.full_name)}
                          disabled={isVerifying}
                          className="btn btn-primary btn-sm"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.45rem',
                            padding: '0.55rem 1.1rem',
                            fontWeight: 600
                          }}
                        >
                          <ShieldCheck size={16} />
                          <span>{isVerifying ? 'Verifying...' : 'Verify Faculty Mentor'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
