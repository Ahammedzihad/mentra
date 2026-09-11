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
  AlertCircle
} from 'lucide-react';

export const BrowseMentorsPage = () => {
  const { user } = useAuth();
  const [mentors, setMentors] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submittingMentorId, setSubmittingMentorId] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('browse'); // 'browse' | 'requests'

  const fetchData = useCallback(async () => {
    if (!user || !isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // 1. Fetch only verified mentors (role = 'mentor' AND is_verified = true)
      // Strictly do not select email to respect HIGH-01 column privileges
      const { data: mentorsData, error: mentorsErr } = await supabase
        .from('profiles')
        .select('id, full_name, department, role, is_verified, created_at')
        .eq('role', 'mentor')
        .eq('is_verified', true)
        .order('full_name', { ascending: true });

      if (mentorsErr) throw mentorsErr;
      setMentors(mentorsData || []);

      // 2. Fetch student's own requests
      const { data: requestsData, error: requestsErr } = await supabase
        .from('mentorships')
        .select('id, mentor_id, student_id, status, created_at, mentor:mentor_id(id, full_name, department, role, is_verified)')
        .eq('student_id', user.id)
        .order('created_at', { ascending: false });

      if (requestsErr) throw requestsErr;
      setRequests(requestsData || []);
    } catch (err) {
      console.error('Error fetching mentors/requests:', err);
      setFeedback({ type: 'error', message: err.message || 'Unable to load mentors.' });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRequestMentorship = async (mentorId) => {
    if (!user || submittingMentorId) return;

    setSubmittingMentorId(mentorId);
    setFeedback(null);

    try {
      const { data, error } = await supabase
        .from('mentorships')
        .insert({
          student_id: user.id,
          mentor_id: mentorId,
          status: 'pending'
        })
        .select('id, mentor_id, student_id, status, created_at')
        .single();

      if (error) throw error;

      // Update local state immediately
      setRequests((prev) => [data, ...prev]);
      setFeedback({
        type: 'success',
        message: 'Mentorship request submitted successfully. Awaiting mentor review.'
      });
    } catch (err) {
      console.error('Request mentorship failed:', err);
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to submit mentorship request. Please try again.'
      });
    } finally {
      setSubmittingMentorId(null);
    }
  };

  // Map mentorId -> latest request
  const requestMap = requests.reduce((acc, req) => {
    acc[req.mentor_id] = req;
    return acc;
  }, {});

  const filteredMentors = mentors.filter((m) => {
    const query = searchQuery.toLowerCase();
    const nameMatch = m.full_name?.toLowerCase().includes(query);
    const deptMatch = m.department?.toLowerCase().includes(query);
    return nameMatch || deptMatch;
  });

  const connectedMentors = requests.filter((r) => r.status === 'accepted');

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
            <span className="badge-dept gold">Phase 2: Mentorship Network</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1.5rem' }}>
            <div>
              <h1 className="font-serif" style={{ fontSize: '2.25rem', marginBottom: '0.35rem', color: 'var(--color-primary-dark)' }}>
                Collegiate Faculty Mentors
              </h1>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', maxWidth: '640px' }}>
                Connect directly with ratified faculty mentors in your discipline. Every mentor on this registry has undergone institutional review and collegiate verification.
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

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`notice-box ${feedback.type === 'error' ? 'error' : 'success'}`}
            style={{
              marginBottom: '2rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              padding: '1rem 1.25rem',
              borderRadius: 'var(--radius-sm)',
              border: feedback.type === 'error' ? '1px solid #D16B58' : '1px solid #7FA482',
              backgroundColor: feedback.type === 'error' ? '#FDF2F0' : '#F1F7F2',
              color: feedback.type === 'error' ? '#872B1B' : '#245C2D',
              fontSize: '0.9rem'
            }}
          >
            {feedback.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* TAB 1: BROWSE MENTORS */}
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
                placeholder="Search by mentor name or academic department..."
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
                <p style={{ color: 'var(--text-muted)' }}>Retrieving ratified faculty mentors...</p>
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
                  Faculty applications undergo institutional verification. Mentors will appear in this registry once officially approved.
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
                        {/* Header: Dept and Verified Tag */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                          <span className="badge-dept terracotta">{mentor.department || 'Academic Department'}</span>
                          <span className="badge-dept gold" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                            <ShieldCheck size={13} style={{ color: '#8C6A30' }} />
                            <span>Verified</span>
                          </span>
                        </div>

                        {/* Name */}
                        <h3 className="font-serif" style={{ fontSize: '1.25rem', marginBottom: '0.35rem', color: 'var(--color-primary-dark)' }}>
                          {mentor.full_name}
                        </h3>

                        {/* Subtitle */}
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.85rem' }}>
                          Collegiate Faculty Advisor &bull; {mentor.department}
                        </div>

                        {/* Short Bio */}
                        <p style={{ fontSize: '0.85rem', lineHeight: '1.6', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                          Academic mentor advising undergraduate cohorts in research methodologies, symposium presentations, and capstone investigations.
                        </p>
                      </div>

                      {/* Request Mentorship Action or Status */}
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
                                  padding: '0.35rem 0.65rem'
                                }}
                              >
                                <Clock size={13} />
                                <span>Request Pending</span>
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
                                  border: '1px solid rgba(46, 90, 54, 0.25)'
                                }}
                              >
                                <CheckCircle2 size={13} />
                                <span>Connected Mentor</span>
                              </span>
                            )}
                            {existingRequest.status === 'declined' && (
                              <span
                                className="badge-dept terracotta"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                  padding: '0.35rem 0.65rem'
                                }}
                              >
                                <XCircle size={13} />
                                <span>Request Declined</span>
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

        {/* TAB 2: MY MENTORSHIP REQUESTS (Item 3 Requirement) */}
        {activeTab === 'requests' && (
          <div>
            <div style={{ marginBottom: '1.5rem' }}>
              <h2 className="font-serif" style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>
                My Mentorship Requests
              </h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                Track the status of your inquiries submitted to verified faculty mentors.
              </p>
            </div>

            {loading ? (
              <div className="card-academic" style={{ textAlign: 'center', padding: '3rem' }}>
                <p style={{ color: 'var(--text-muted)' }}>Loading your request history...</p>
              </div>
            ) : requests.length === 0 ? (
              <div
                className="card-academic"
                style={{
                  textAlign: 'center',
                  padding: '3rem 2rem',
                  backgroundColor: 'var(--color-warm-ivory-light)'
                }}
              >
                <UserCheck size={32} style={{ color: 'var(--color-terracotta)', margin: '0 auto 1rem auto' }} />
                <h3 className="font-serif" style={{ fontSize: '1.2rem', marginBottom: '0.4rem' }}>
                  No mentorship requests yet
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto 1.5rem auto' }}>
                  Browse our registry of verified faculty advisors to request academic stweardship on your research.
                </p>
                <button onClick={() => setActiveTab('browse')} className="btn btn-primary btn-sm">
                  Browse Faculty Mentors
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {requests.map((req) => {
                  const mentorName = req.mentor?.full_name || 'Verified Mentor';
                  const mentorDept = req.mentor?.department || 'Academic Department';
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
                        display: 'flex',
                        flexWrap: 'wrap',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '1rem',
                        padding: '1.5rem'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                          <span className="badge-dept terracotta">{mentorDept}</span>
                          <span className="badge-dept gold" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <ShieldCheck size={12} style={{ color: '#8C6A30' }} />
                            <span>Verified Mentor</span>
                          </span>
                        </div>
                        <h3 style={{ fontSize: '1.15rem', marginBottom: '0.25rem', color: 'var(--color-primary-dark)' }}>
                          {mentorName}
                        </h3>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          Submitted on {requestDate}
                        </div>
                      </div>

                      <div>
                        {req.status === 'pending' && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', backgroundColor: 'var(--color-warm-gold-subtle)', padding: '0.5rem 0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(197, 164, 109, 0.4)', color: '#7A5714', fontSize: '0.85rem', fontWeight: 600 }}>
                            <Clock size={15} />
                            <span>Pending Review</span>
                          </div>
                        )}
                        {req.status === 'accepted' && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', backgroundColor: '#EBF3EC', padding: '0.5rem 0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(46, 90, 54, 0.3)', color: '#266432', fontSize: '0.85rem', fontWeight: 600 }}>
                            <CheckCircle2 size={15} />
                            <span>Accepted &bull; Connected</span>
                          </div>
                        )}
                        {req.status === 'declined' && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', backgroundColor: 'var(--color-terracotta-subtle)', padding: '0.5rem 0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(184, 111, 82, 0.3)', color: '#9E382A', fontSize: '0.85rem', fontWeight: 600 }}>
                            <XCircle size={15} />
                            <span>Declined</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* CONNECTED LIST (Accepted mentorships only - Item 5) */}
        {connectedMentors.length > 0 && (
          <div style={{ marginTop: '3.5rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '2.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <span className="label-academic gold">Active Academic Connections</span>
              <h2 className="font-serif" style={{ fontSize: '1.45rem' }}>Connected Mentors</h2>
            </div>
            <div className="grid-3">
              {connectedMentors.map((c) => (
                <div key={c.id} className="card-academic" style={{ borderLeft: '3px solid #2E5A36' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span className="badge-dept terracotta">{c.mentor?.department || 'Faculty'}</span>
                    <span className="badge-dept" style={{ backgroundColor: '#EBF3EC', color: '#266432', fontSize: '0.7rem' }}>
                      Active Mentee
                    </span>
                  </div>
                  <h3 style={{ fontSize: '1.15rem', marginBottom: '0.25rem' }}>{c.mentor?.full_name}</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Established advisor for undergraduate research and project consultation.
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
