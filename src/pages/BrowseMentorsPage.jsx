import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  GraduationCap,
  Send,
  UserCheck,
  Search,
  ArrowLeft,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

export const BrowseMentorsPage = () => {
  const { user } = useAuth();
  const [mentors, setMentors] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);
  const [submittingMentorId, setSubmittingMentorId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('browse'); // 'browse' | 'requests'

  const fetchData = useCallback(async () => {
    if (!user || !isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setDbError(null);

    try {
      // 1. Fetch verified mentors only (role = 'mentor' AND is_verified = true)
      // Expose only safe columns; never select email to protect PII
      const { data: mentorsData, error: mentorsErr } = await supabase
        .from('profiles')
        .select('id, full_name, department, role, is_verified, bio, created_at')
        .eq('role', 'mentor')
        .eq('is_verified', true)
        .order('full_name', { ascending: true });

      if (mentorsErr) throw mentorsErr;

      // Defensive filtering: unverified or pending mentors must NEVER appear in this list
      const verifiedOnly = (mentorsData || []).filter(
        (m) => m.role === 'mentor' && m.is_verified === true
      );
      setMentors(verifiedOnly);

      // 2. Fetch authenticated student's own requests (newest first by created_at)
      // Join with mentor profile to display mentor name, department, bio without exposing PII
      const { data: requestsData, error: requestsErr } = await supabase
        .from('mentorships')
        .select('id, mentor_id, student_id, status, created_at, mentor:mentor_id(id, full_name, department, role, is_verified, bio)')
        .eq('student_id', user.id)
        .order('created_at', { ascending: false });

      if (requestsErr) throw requestsErr;
      setRequests(requestsData || []);
    } catch (err) {
      console.error('Error fetching mentors or requests:', err);
      // Clean, user-friendly error message that never exposes raw database/SQL/token details
      setDbError('Unable to load mentorship data at this time. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Request Mentorship behavior (Step 2)
  const handleRequestMentorship = async (mentorId) => {
    if (!user || submittingMentorId) return;

    setActionError(null);
    setActionSuccess(null);

    // Check whether the student already has an active request with this mentor
    const existingReq = requests.find((r) => r.mentor_id === mentorId);
    if (existingReq) {
      setActionError(`You already have a ${existingReq.status} mentorship request with this mentor.`);
      return;
    }

    setSubmittingMentorId(mentorId);

    try {
      // Create new row in public.mentorships
      // student_id is strictly derived from user.id (never client-chosen or spoofed)
      const { data, error } = await supabase
        .from('mentorships')
        .insert({
          student_id: user.id,
          mentor_id: mentorId,
          status: 'pending'
        })
        .select('id, mentor_id, student_id, status, created_at, mentor:mentor_id(id, full_name, department, role, is_verified, bio)')
        .single();

      if (error) throw error;

      // Update local state immediately with newest requests on top
      setRequests((prev) => [data, ...prev]);
      setActionSuccess('Mentorship request submitted successfully. Status is now Pending.');
    } catch (err) {
      console.error('Request mentorship failed:', err);
      if (err.code === '23505' || err.message?.includes('duplicate') || err.message?.includes('unique')) {
        setActionError('A mentorship request already exists for this mentor.');
        fetchData();
      } else {
        setActionError('Failed to submit mentorship request. Please try again.');
      }
    } finally {
      setSubmittingMentorId(null);
    }
  };

  // Map mentorId -> latest request for fast lookup on mentor cards
  const requestMap = requests.reduce((acc, req) => {
    acc[req.mentor_id] = req;
    return acc;
  }, {});

  const filteredMentors = mentors.filter((m) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    const nameMatch = m.full_name?.toLowerCase().includes(query);
    const deptMatch = m.department?.toLowerCase().includes(query);
    const bioMatch = m.bio?.toLowerCase().includes(query);
    return nameMatch || deptMatch || bioMatch;
  });

  return (
    <div style={{ padding: '3rem 0 5rem 0', minHeight: '80vh', backgroundColor: 'var(--color-warm-ivory)' }}>
      <div className="container">
        {/* Page Header */}
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.5rem' }}>
            <Link to="/student" className="btn btn-secondary btn-sm" style={{ padding: '0.3rem 0.6rem' }}>
              <ArrowLeft size={14} />
              <span>Student Space</span>
            </Link>
            <span className="badge-dept gold">Faculty Mentorship Network</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1.5rem' }}>
            <div>
              <h1 className="font-serif" style={{ fontSize: '2.25rem', marginBottom: '0.35rem', color: 'var(--color-primary-dark)' }}>
                {activeTab === 'browse' ? 'Browse Mentors' : 'My Mentorship Requests'}
              </h1>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', maxWidth: '640px' }}>
                {activeTab === 'browse'
                  ? 'Connect directly with verified faculty mentors in your discipline. Every mentor on this registry has undergone collegiate verification.'
                  : 'Track the status and history of your research stewardship inquiries submitted to verified faculty advisors.'}
              </p>
            </div>

            {/* Navigation Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', backgroundColor: 'var(--color-white)', padding: '0.35rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              <button
                onClick={() => setActiveTab('browse')}
                className={`btn btn-sm ${activeTab === 'browse' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.825rem' }}
              >
                Browse Mentors ({mentors.length})
              </button>
              <button
                onClick={() => setActiveTab('requests')}
                className={`btn btn-sm ${activeTab === 'requests' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.825rem' }}
              >
                My Requests ({requests.length})
              </button>
            </div>
          </div>
        </div>

        {/* Global Database Error Banner with Retry */}
        {dbError && (
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
              <span>{dbError}</span>
            </div>
            <button
              onClick={fetchData}
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

        {/* =========================================================================
            TAB 1: BROWSE MENTORS (STEP 2 - PRESERVED)
           ========================================================================= */}
        {activeTab === 'browse' && (
          <div>
            {/* Search Filter Bar */}
            <div
              style={{
                backgroundColor: 'var(--color-white)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem 1.5rem',
                marginBottom: '2rem',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                boxShadow: 'var(--shadow-subtle)'
              }}
            >
              <Search size={18} style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search by mentor name, department, or research interests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  border: 'none',
                  outline: 'none',
                  fontSize: '0.925rem',
                  width: '100%',
                  backgroundColor: 'transparent',
                  color: 'var(--color-primary-dark)'
                }}
              />
            </div>

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
                <p style={{ color: 'var(--text-muted)' }}>Retrieving verified faculty mentors...</p>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            ) : filteredMentors.length === 0 ? (
              <div
                className="card-academic"
                style={{
                  textAlign: 'center',
                  padding: '3.5rem 2rem',
                  backgroundColor: 'var(--color-warm-ivory-light)'
                }}
              >
                <GraduationCap size={36} style={{ color: 'var(--color-warm-gold)', margin: '0 auto 1rem auto' }} />
                <h3 className="font-serif" style={{ fontSize: '1.3rem', marginBottom: '0.5rem' }}>
                  No Verified Mentors Available
                </h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', maxWidth: '460px', margin: '0 auto' }}>
                  {searchQuery
                    ? 'No verified mentors match your search criteria. Try a different name or department.'
                    : 'Faculty applications undergo institutional verification. Verified mentors will appear in this registry once approved.'}
                </p>
              </div>
            ) : (
              <div className="grid-3" style={{ gap: '1.5rem' }}>
                {filteredMentors.map((mentor) => {
                  const existingRequest = requestMap[mentor.id];
                  const isSubmitting = submittingMentorId === mentor.id;

                  return (
                    <div
                      key={mentor.id}
                      className="card-academic"
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        padding: '1.75rem',
                        backgroundColor: 'var(--color-white)',
                        boxShadow: 'var(--shadow-subtle)',
                        borderRadius: 'var(--radius-md)'
                      }}
                    >
                      <div>
                        {/* Header: Dept and Clear Verification Status */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
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
                            <ShieldCheck size={13} style={{ color: '#8C6A30' }} />
                            <span>Verified Mentor</span>
                          </span>
                        </div>

                        {/* Mentor Name */}
                        <h3 className="font-serif" style={{ fontSize: '1.25rem', marginBottom: '0.35rem', color: 'var(--color-primary-dark)' }}>
                          {mentor.full_name}
                        </h3>

                        {/* Department Subtitle */}
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.85rem' }}>
                          Department of {mentor.department || 'Academic Studies'}
                        </div>

                        {/* Short Bio (if available) */}
                        {mentor.bio ? (
                          <p style={{ fontSize: '0.85rem', lineHeight: '1.6', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                            {mentor.bio}
                          </p>
                        ) : (
                          <p style={{ fontSize: '0.85rem', lineHeight: '1.6', color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: '1.5rem' }}>
                            Faculty advisor specializing in research stewardship and project consultation in {mentor.department || 'academic studies'}.
                          </p>
                        )}
                      </div>

                      {/* Request Mentorship Action or Existing Request Status */}
                      <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
                        {existingRequest ? (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Status:</span>
                            {existingRequest.status === 'pending' && (
                              <span
                                className="badge-dept gold"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                  padding: '0.35rem 0.65rem',
                                  fontWeight: 600
                                }}
                              >
                                <Clock size={13} />
                                <span>Pending</span>
                              </span>
                            )}
                            {existingRequest.status === 'accepted' && (
                              <span
                                className="badge-dept"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                  padding: '0.35rem 0.65rem',
                                  backgroundColor: '#EBF3EC',
                                  color: '#266432',
                                  border: '1px solid rgba(46, 90, 54, 0.25)',
                                  fontWeight: 600
                                }}
                              >
                                <CheckCircle2 size={13} />
                                <span>Connected</span>
                              </span>
                            )}
                            {existingRequest.status === 'declined' && (
                              <span
                                className="badge-dept terracotta"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                  padding: '0.35rem 0.65rem',
                                  fontWeight: 600
                                }}
                              >
                                <XCircle size={13} />
                                <span>Declined</span>
                              </span>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => handleRequestMentorship(mentor.id)}
                            disabled={isSubmitting}
                            className="btn btn-primary btn-sm"
                            style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.45rem' }}
                          >
                            <Send size={13} />
                            <span>{isSubmitting ? 'Sending Request...' : 'Request Mentorship'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 2: MY MENTORSHIP REQUESTS (STEP 3)
           ========================================================================= */}
        {activeTab === 'requests' && (
          <div>
            <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2 className="font-serif" style={{ fontSize: '1.5rem', marginBottom: '0.25rem', color: 'var(--color-primary-dark)' }}>
                  My Mentorship Requests
                </h2>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  Track the status of your inquiries submitted to verified faculty mentors.
                </p>
              </div>
              <button
                onClick={fetchData}
                disabled={loading}
                className="btn btn-secondary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <RefreshCw size={13} style={{ animation: loading ? 'spin 0.8s linear infinite' : 'none' }} />
                <span>Refresh Status</span>
              </button>
            </div>

            {/* Loading State: Do NOT show empty state while loading */}
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
                <p style={{ color: 'var(--text-muted)' }}>Loading your mentorship requests...</p>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            ) : dbError && requests.length === 0 ? (
              /* Error State: Clear error message + Retry action without exposing internal SQL/details */
              <div
                className="card-academic"
                style={{
                  textAlign: 'center',
                  padding: '3rem 2rem',
                  backgroundColor: 'var(--color-warm-ivory-light)'
                }}
              >
                <AlertCircle size={36} style={{ color: 'var(--color-terracotta)', margin: '0 auto 1rem auto' }} />
                <h3 className="font-serif" style={{ fontSize: '1.25rem', marginBottom: '0.4rem', color: 'var(--color-primary-dark)' }}>
                  Unable to Load Requests
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', maxWidth: '440px', margin: '0 auto 1.5rem auto' }}>
                  {dbError}
                </p>
                <button
                  onClick={fetchData}
                  className="btn btn-primary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <RefreshCw size={14} />
                  <span>Retry</span>
                </button>
              </div>
            ) : requests.length === 0 ? (
              /* Empty State: Clear message + Useful action to take student to Browse Mentors */
              <div
                className="card-academic"
                style={{
                  textAlign: 'center',
                  padding: '3.5rem 2rem',
                  backgroundColor: 'var(--color-warm-ivory-light)'
                }}
              >
                <UserCheck size={36} style={{ color: 'var(--color-terracotta)', margin: '0 auto 1rem auto' }} />
                <h3 className="font-serif" style={{ fontSize: '1.25rem', marginBottom: '0.4rem', color: 'var(--color-primary-dark)' }}>
                  No mentorship requests yet.
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', maxWidth: '420px', margin: '0 auto 1.5rem auto' }}>
                  Browse our registry of verified faculty advisors to request academic stewardship on your research.
                </p>
                <button onClick={() => setActiveTab('browse')} className="btn btn-primary btn-sm">
                  Browse Faculty Mentors
                </button>
              </div>
            ) : (
              /* Requests List: Ordered newest first (created_at descending) */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {requests.map((req) => {
                  const mentorName = req.mentor?.full_name || 'Verified Faculty Mentor';
                  const mentorDept = req.mentor?.department || 'Academic Department';
                  const mentorBio = req.mentor?.bio;
                  const requestDate = req.created_at
                    ? new Date(req.created_at).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })
                    : 'Recent';

                  return (
                    <div
                      key={req.id}
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
                          gap: '1.25rem'
                        }}
                      >
                        <div style={{ flex: 1, minWidth: '260px' }}>
                          {/* Mentor Department & Verified Badge */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.45rem' }}>
                            <span className="badge-dept terracotta">{mentorDept}</span>
                            <span
                              className="badge-dept gold"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                backgroundColor: 'var(--color-warm-gold-subtle)',
                                color: '#7A5714',
                                border: '1px solid rgba(197, 164, 109, 0.4)'
                              }}
                            >
                              <ShieldCheck size={12} style={{ color: '#8C6A30' }} />
                              <span>Verified Mentor</span>
                            </span>
                          </div>

                          {/* Mentor Name */}
                          <h3
                            className="font-serif"
                            style={{ fontSize: '1.25rem', marginBottom: '0.25rem', color: 'var(--color-primary-dark)' }}
                          >
                            {mentorName}
                          </h3>

                          {/* Request Date & Department Subtitle */}
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                            Department of {mentorDept} &bull; Requested on {requestDate}
                          </div>

                          {/* Short Bio (if available) */}
                          {mentorBio ? (
                            <p style={{ fontSize: '0.85rem', lineHeight: '1.6', color: 'var(--text-secondary)', margin: '0' }}>
                              {mentorBio}
                            </p>
                          ) : (
                            <p style={{ fontSize: '0.85rem', lineHeight: '1.6', color: 'var(--text-muted)', fontStyle: 'italic', margin: '0' }}>
                              Faculty advisor in the Department of {mentorDept}.
                            </p>
                          )}
                        </div>

                        {/* Current Status Display with clear contextual indicators */}
                        <div style={{ alignSelf: 'flex-start', minWidth: '180px', textAlign: 'right' }}>
                          {req.status === 'pending' && (
                            <div>
                              <div
                                className="badge-dept gold"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.45rem',
                                  padding: '0.5rem 0.85rem',
                                  borderRadius: 'var(--radius-sm)',
                                  backgroundColor: 'var(--color-warm-gold-subtle)',
                                  border: '1px solid rgba(197, 164, 109, 0.4)',
                                  color: '#7A5714',
                                  fontSize: '0.85rem',
                                  fontWeight: 600
                                }}
                              >
                                <Clock size={15} />
                                <span>Pending</span>
                              </div>
                              <p style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginTop: '0.4rem', marginBottom: 0 }}>
                                Waiting for mentor response
                              </p>
                            </div>
                          )}

                          {req.status === 'accepted' && (
                            <div>
                              <div
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.45rem',
                                  padding: '0.5rem 0.85rem',
                                  borderRadius: 'var(--radius-sm)',
                                  backgroundColor: '#EBF3EC',
                                  border: '1px solid rgba(46, 90, 54, 0.3)',
                                  color: '#266432',
                                  fontSize: '0.85rem',
                                  fontWeight: 600
                                }}
                              >
                                <CheckCircle2 size={15} />
                                <span>Connected</span>
                              </div>
                              <p style={{ fontSize: '0.775rem', color: '#266432', marginTop: '0.4rem', marginBottom: 0, fontWeight: 500 }}>
                                Mentorship has been accepted
                              </p>
                            </div>
                          )}

                          {req.status === 'declined' && (
                            <div>
                              <div
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.45rem',
                                  padding: '0.5rem 0.85rem',
                                  borderRadius: 'var(--radius-sm)',
                                  backgroundColor: 'var(--color-terracotta-subtle)',
                                  border: '1px solid rgba(184, 111, 82, 0.3)',
                                  color: '#9E382A',
                                  fontSize: '0.85rem',
                                  fontWeight: 600
                                }}
                              >
                                <XCircle size={15} />
                                <span>Declined</span>
                              </div>
                              <p style={{ fontSize: '0.775rem', color: '#9E382A', marginTop: '0.4rem', marginBottom: 0, fontWeight: 500 }}>
                                Mentor declined the request
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
