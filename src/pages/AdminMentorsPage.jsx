import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { AdminLayout } from '../components/AdminLayout';
import {
  Users,
  ShieldCheck,
  Clock,
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Building2,
  Calendar,
  X
} from 'lucide-react';

const MENTOR_STATUS_TABS = [
  { id: 'all', label: 'All Mentors', icon: Users },
  { id: 'verified', label: 'Verified', icon: ShieldCheck },
  { id: 'pending', label: 'Pending Verification', icon: Clock },
];

const getInitials = (name) => {
  if (!name) return 'F';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const AdminMentorsPage = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Status and Search Filters
  const initialStatus = searchParams.get('status') || 'all';
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');

  // Actions State
  const [verifyingMentorId, setVerifyingMentorId] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);
  const [actionError, setActionError] = useState(null);

  const fetchMentors = useCallback(async () => {
    if (!user || !isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Query profiles with role = 'mentor' from public.profiles
      // Safe collegiate fields only; email excluded to protect PII
      const { data, error: fetchErr } = await supabase
        .from('profiles')
        .select('id, full_name, department, role, is_verified, bio, created_at')
        .eq('role', 'mentor')
        .order('created_at', { ascending: false });

      if (fetchErr) throw fetchErr;
      setMentors(data || []);
    } catch (err) {
      console.error('Error fetching faculty mentors:', err);
      setError('Unable to retrieve faculty mentor registry. Please verify database connection.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchMentors();
  }, [fetchMentors]);

  // Sync status filter with URL searchParams (e.g. from AdminLayout sub-nav)
  useEffect(() => {
    const statusParam = searchParams.get('status');
    if (statusParam) {
      const normalized = statusParam.toLowerCase();
      if (['all', 'verified', 'pending'].includes(normalized)) {
        setStatusFilter(normalized);
      }
    } else {
      setStatusFilter('all');
    }
  }, [searchParams]);

  const handleStatusChange = (statusId) => {
    setStatusFilter(statusId);
    if (statusId === 'all') {
      searchParams.delete('status');
    } else {
      searchParams.set('status', statusId);
    }
    setSearchParams(searchParams);
  };

  const handleVerifyMentor = async (mentorId, mentorName) => {
    if (!user || verifyingMentorId) return;

    setVerifyingMentorId(mentorId);
    setActionError(null);
    setActionSuccess(null);

    try {
      // Call database-enforced SECURITY DEFINER verify_mentor() function
      const { error: rpcErr } = await supabase.rpc('verify_mentor', {
        target_mentor_id: mentorId,
      });

      if (rpcErr) throw rpcErr;

      // Update local state immediately
      setMentors((prev) =>
        prev.map((m) => (m.id === mentorId ? { ...m, is_verified: true } : m))
      );

      setActionSuccess(
        `Faculty credentials verified for ${mentorName || 'Faculty Mentor'}. Mentorship privileges are now active.`
      );
    } catch (err) {
      console.error('Error verifying mentor:', err);
      setActionError(
        err.message || 'Verification could not be completed. Please ensure you have institutional administrator privileges.'
      );
    } finally {
      setVerifyingMentorId(null);
    }
  };

  // Department options
  const departments = useMemo(() => {
    return ['All', ...new Set(
      mentors
        .map((m) => m.department)
        .filter((d) => Boolean(d && d.trim()))
    )].sort();
  }, [mentors]);

  // Counts
  const verifiedCount = useMemo(() => mentors.filter((m) => m.is_verified).length, [mentors]);
  const pendingCount = useMemo(() => mentors.filter((m) => !m.is_verified).length, [mentors]);

  // Filtered mentors based on status, search, and department
  const filteredMentors = useMemo(() => {
    return mentors.filter((m) => {
      const name = (m.full_name || '').toLowerCase();
      const dept = (m.department || '').toLowerCase();
      const bio = (m.bio || '').toLowerCase();
      const id = (m.id || '').toLowerCase();
      const query = searchQuery.toLowerCase().trim();

      // 1. Status Filter
      let matchesStatus = true;
      if (statusFilter === 'verified') {
        matchesStatus = Boolean(m.is_verified);
      } else if (statusFilter === 'pending') {
        matchesStatus = !m.is_verified;
      }

      // 2. Search Filter
      const matchesSearch =
        !query ||
        name.includes(query) ||
        dept.includes(query) ||
        bio.includes(query) ||
        id.includes(query);

      // 3. Department Filter
      const matchesDept =
        selectedDept === 'All' ||
        (m.department && m.department.toLowerCase() === selectedDept.toLowerCase());

      return matchesStatus && matchesSearch && matchesDept;
    });
  }, [mentors, statusFilter, searchQuery, selectedDept]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedDept('All');
    setStatusFilter('all');
    searchParams.delete('status');
    setSearchParams(searchParams);
  };

  return (
    <AdminLayout activeTab="mentors">
      <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '1.75rem',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span className="label-academic gold">Faculty Mentorship Administration</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                &bull; {mentors.length} Total Mentors ({pendingCount} Pending Verification)
              </span>
            </div>
            <h1
              className="font-serif"
              style={{
                fontSize: '2rem',
                color: 'var(--color-primary-dark)',
                margin: 0,
                letterSpacing: '-0.02em',
              }}
            >
              Faculty Mentors Directory
            </h1>
            <p
              style={{
                color: 'var(--text-secondary)',
                fontSize: '0.95rem',
                marginTop: '0.35rem',
                maxWidth: '650px',
              }}
            >
              Oversee the collegiate faculty mentorship roster, verify pending applicant credentials, and manage active faculty advisors.
            </p>
          </div>

          <button
            onClick={fetchMentors}
            disabled={loading}
            className="btn btn-secondary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
          >
            <RefreshCw size={14} style={{ animation: loading ? 'spin 0.8s linear infinite' : 'none' }} />
            <span>Refresh Mentors</span>
          </button>
        </div>

        {/* Action Alerts */}
        {actionSuccess && (
          <div
            className="card"
            style={{
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '1rem 1.25rem',
              backgroundColor: '#F1F7F2',
              border: '1px solid #7FA482',
              color: '#245C2D',
              fontSize: '0.9rem',
            }}
          >
            <CheckCircle2 size={20} />
            <span style={{ flex: 1 }}>{actionSuccess}</span>
            <button
              onClick={() => setActionSuccess(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {actionError && (
          <div
            className="card"
            style={{
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '1rem 1.25rem',
              backgroundColor: 'var(--color-terracotta-subtle)',
              border: '1px solid var(--color-terracotta)',
              color: 'var(--color-terracotta)',
              fontSize: '0.9rem',
            }}
          >
            <AlertCircle size={20} />
            <span style={{ flex: 1 }}>{actionError}</span>
            <button
              onClick={() => setActionError(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {error && (
          <div
            className="card"
            style={{
              padding: '1rem 1.25rem',
              backgroundColor: 'var(--color-terracotta-subtle)',
              border: '1px solid var(--color-terracotta)',
              color: 'var(--color-terracotta)',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <AlertCircle size={20} />
            <span style={{ fontSize: '0.9rem' }}>{error}</span>
          </div>
        )}

        {/* Status Category Tabs Bar: All Mentors, Verified, Pending Verification */}
        <div
          style={{
            marginBottom: '1.5rem',
            backgroundColor: 'var(--surface-primary)',
            padding: '1rem',
            borderRadius: '10px',
            border: '1px solid var(--border-subtle)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginBottom: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>Mentor Category & Status</span>
            <span style={{ fontSize: '0.78rem', color: '#8C6A30', textTransform: 'none', fontWeight: 500 }}>
              {statusFilter === 'all'
                ? 'Showing All Registered Faculty'
                : statusFilter === 'verified'
                ? 'Showing Only Verified Faculty'
                : 'Showing Only Pending Verification Applications'}
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '0.65rem',
              flexWrap: 'wrap',
            }}
          >
            {MENTOR_STATUS_TABS.map((tab) => {
              const isSelected = statusFilter === tab.id;
              const Icon = tab.icon;
              const count =
                tab.id === 'all'
                  ? mentors.length
                  : tab.id === 'verified'
                  ? verifiedCount
                  : pendingCount;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleStatusChange(tab.id)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.55rem',
                    padding: '0.6rem 1.15rem',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    fontWeight: isSelected ? 600 : 500,
                    border: isSelected
                      ? tab.id === 'pending'
                        ? '1.5px solid var(--color-terracotta)'
                        : '1.5px solid var(--color-primary-dark)'
                      : '1px solid var(--border-subtle)',
                    backgroundColor: isSelected
                      ? tab.id === 'pending'
                        ? 'var(--color-terracotta)'
                        : 'var(--color-primary-dark)'
                      : 'var(--color-warm-ivory)',
                    color: isSelected ? '#FFFFFF' : 'var(--color-primary-dark)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--surface-secondary)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--color-warm-ivory)';
                  }}
                >
                  <Icon size={15} />
                  <span>{tab.label}</span>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '0.1rem 0.5rem',
                      borderRadius: '10px',
                      backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.25)' : 'var(--surface-secondary)',
                      color: isSelected ? '#FFFFFF' : 'var(--text-secondary)',
                    }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Filter Bar: Search & Department */}
        <div
          className="card"
          style={{
            padding: '1.25rem',
            backgroundColor: 'var(--surface-primary)',
            marginBottom: '1.5rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1rem',
            alignItems: 'center',
          }}
        >
          {/* Search Box */}
          <div>
            <label
              htmlFor="mentor-search-input"
              style={{
                display: 'block',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                marginBottom: '0.35rem',
              }}
            >
              Search Faculty
            </label>
            <div style={{ position: 'relative' }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                id="mentor-search-input"
                type="text"
                placeholder="Name, department, expertise bio..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field"
                style={{
                  paddingLeft: '2.35rem',
                  fontSize: '0.85rem',
                  width: '100%',
                }}
              />
            </div>
          </div>

          {/* Department Filter */}
          <div>
            <label
              htmlFor="mentor-dept-select"
              style={{
                display: 'block',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                marginBottom: '0.35rem',
              }}
            >
              Department / Discipline
            </label>
            <select
              id="mentor-dept-select"
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="input-field"
              style={{
                fontSize: '0.85rem',
                width: '100%',
                padding: '0.5rem 0.75rem',
              }}
            >
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept === 'All' ? 'All Academic Departments' : dept}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Active Filter Tags */}
        {(searchQuery || selectedDept !== 'All' || statusFilter !== 'all') && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              flexWrap: 'wrap',
              marginBottom: '1rem',
              padding: '0.25rem 0.5rem',
            }}
          >
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              Active Filters:
            </span>
            {statusFilter !== 'all' && (
              <span
                style={{
                  fontSize: '0.75rem',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '12px',
                  backgroundColor: statusFilter === 'pending' ? 'var(--color-terracotta-subtle)' : 'var(--color-warm-gold-subtle)',
                  color: statusFilter === 'pending' ? 'var(--color-terracotta)' : '#8C6A30',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  fontWeight: 600,
                }}
              >
                Status: {statusFilter === 'verified' ? 'Verified' : 'Pending Verification'}
                <button
                  type="button"
                  onClick={() => handleStatusChange('all')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: 'inherit' }}
                >
                  <X size={12} />
                </button>
              </span>
            )}
            {selectedDept !== 'All' && (
              <span
                style={{
                  fontSize: '0.75rem',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '12px',
                  backgroundColor: 'var(--surface-secondary)',
                  color: 'var(--text-primary)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                }}
              >
                Dept: {selectedDept}
                <button
                  type="button"
                  onClick={() => setSelectedDept('All')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: 'inherit' }}
                >
                  <X size={12} />
                </button>
              </span>
            )}
            {searchQuery && (
              <span
                style={{
                  fontSize: '0.75rem',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '12px',
                  backgroundColor: 'var(--surface-secondary)',
                  color: 'var(--text-primary)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                }}
              >
                Query: "{searchQuery}"
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: 'inherit' }}
                >
                  <X size={12} />
                </button>
              </span>
            )}
            <button
              type="button"
              onClick={handleResetFilters}
              style={{
                fontSize: '0.75rem',
                color: 'var(--color-terracotta)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textDecoration: 'underline',
                padding: '0.15rem 0.35rem',
              }}
            >
              Clear All
            </button>
          </div>
        )}

        {/* Results Counter */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', padding: '0 0.25rem' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Showing <strong>{filteredMentors.length}</strong> of {mentors.length} faculty mentors
            {statusFilter !== 'all' && (
              <span> ({statusFilter === 'verified' ? 'Verified Only' : 'Pending Review Only'})</span>
            )}
          </div>
        </div>

        {/* Mentor Cards Listing */}
        {loading ? (
          <div
            className="card"
            style={{
              padding: '4rem 2rem',
              textAlign: 'center',
              backgroundColor: 'var(--surface-primary)',
            }}
          >
            <RefreshCw size={28} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 1rem auto', color: 'var(--text-muted)' }} />
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Loading faculty mentor directory...</p>
          </div>
        ) : filteredMentors.length === 0 ? (
          <div
            className="card"
            style={{
              padding: '3.5rem 2rem',
              textAlign: 'center',
              backgroundColor: 'var(--surface-primary)',
            }}
          >
            <Users size={44} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem auto', opacity: 0.5 }} />
            <h3 className="font-serif" style={{ fontSize: '1.3rem', color: 'var(--color-primary-dark)', marginBottom: '0.4rem' }}>
              {statusFilter === 'pending'
                ? 'All Faculty Applications Reviewed'
                : statusFilter === 'verified'
                ? 'No Verified Mentors Found'
                : 'No Mentors Match Filter Criteria'}
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', maxWidth: '440px', margin: '0 auto 1.5rem auto', lineHeight: '1.5' }}>
              {statusFilter === 'pending'
                ? 'There are currently no outstanding faculty mentor verification requests awaiting administrative review.'
                : 'No mentor records matched your current query, department, or status selection.'}
            </p>
            <button type="button" onClick={handleResetFilters} className="btn btn-secondary btn-sm">
              Show All Mentors
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {filteredMentors.map((mentor) => {
              const isPending = !mentor.is_verified;
              const isVerifying = verifyingMentorId === mentor.id;
              const appliedDate = mentor.created_at
                ? new Date(mentor.created_at).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })
                : 'N/A';
              const initials = getInitials(mentor.full_name);

              return (
                <div
                  key={mentor.id}
                  className="card"
                  style={{
                    padding: '1.75rem',
                    backgroundColor: 'var(--surface-primary)',
                    borderLeft: isPending ? '4px solid var(--color-terracotta)' : '4px solid #2E7D32',
                    transition: 'box-shadow 0.2s ease',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '1.5rem',
                    }}
                  >
                    {/* Left Details: Profile Photo, Name, Dept, Bio */}
                    <div style={{ display: 'flex', gap: '1.25rem', flex: 1, minWidth: '300px' }}>
                      {/* Profile Photo Avatar */}
                      <div
                        style={{
                          width: '52px',
                          height: '52px',
                          borderRadius: '50%',
                          backgroundColor: isPending ? 'var(--color-terracotta)' : 'var(--color-primary-dark)',
                          color: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '1.15rem',
                          flexShrink: 0,
                          boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                        }}
                      >
                        {initials}
                      </div>

                      <div style={{ flex: 1 }}>
                        {/* Name & Badges */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                          <h3
                            className="font-serif"
                            style={{
                              fontSize: '1.25rem',
                              color: 'var(--color-primary-dark)',
                              margin: 0,
                              fontWeight: 700,
                            }}
                          >
                            {mentor.full_name}
                          </h3>

                          {/* Verification Status Badge */}
                          {mentor.is_verified ? (
                            <span
                              className="badge-dept gold"
                              style={{
                                fontSize: '0.72rem',
                                padding: '0.15rem 0.5rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                              }}
                            >
                              <ShieldCheck size={13} style={{ color: '#8C6A30' }} />
                              <span>Verified Faculty Mentor</span>
                            </span>
                          ) : (
                            <span
                              style={{
                                fontSize: '0.72rem',
                                padding: '0.15rem 0.5rem',
                                borderRadius: '4px',
                                backgroundColor: 'var(--color-terracotta-subtle)',
                                color: 'var(--color-terracotta)',
                                border: '1px solid var(--color-terracotta)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                fontWeight: 600,
                              }}
                            >
                              <Clock size={13} />
                              <span>Pending Verification</span>
                            </span>
                          )}

                          {/* Account Status Badge */}
                          <span
                            style={{
                              fontSize: '0.7rem',
                              padding: '0.12rem 0.4rem',
                              borderRadius: '4px',
                              backgroundColor: 'var(--surface-secondary)',
                              color: 'var(--text-muted)',
                              border: '1px solid var(--border-subtle)',
                            }}
                          >
                            Active Faculty Account
                          </span>
                        </div>

                        {/* Department & Metadata */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem',
                            flexWrap: 'wrap',
                            fontSize: '0.825rem',
                            color: 'var(--text-secondary)',
                            marginBottom: '0.65rem',
                          }}
                        >
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                            <Building2 size={14} style={{ color: 'var(--text-muted)' }} />
                            <span>Department of {mentor.department || 'Academic Studies'}</span>
                          </div>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                            <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
                            <span>Registered {appliedDate}</span>
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                            ID: {mentor.id.slice(0, 8)}...
                          </div>
                        </div>

                        {/* Bio / Expertise */}
                        <div
                          style={{
                            backgroundColor: 'var(--color-warm-ivory)',
                            padding: '0.85rem 1rem',
                            borderRadius: '8px',
                            border: '1px solid var(--border-subtle)',
                            marginTop: '0.5rem',
                          }}
                        >
                          <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                            Academic Expertise & Biography
                          </div>
                          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: '1.5' }}>
                            {mentor.bio || `Collegiate faculty member specializing in ${mentor.department || 'higher academic instruction and student mentorship'}.`}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Right Action: Verification Control */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.75rem' }}>
                      {isPending ? (
                        <div style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={() => handleVerifyMentor(mentor.id, mentor.full_name)}
                            disabled={isVerifying}
                            className="btn btn-primary btn-sm"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.45rem',
                              padding: '0.55rem 1.1rem',
                              fontSize: '0.85rem',
                              backgroundColor: 'var(--color-terracotta)',
                              borderColor: 'var(--color-terracotta)',
                            }}
                          >
                            <ShieldCheck size={16} />
                            <span>{isVerifying ? 'Authorizing...' : 'Approve & Verify Mentor'}</span>
                          </button>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                            Grants institutional mentorship privileges
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#2E7D32', fontSize: '0.85rem', fontWeight: 600 }}>
                          <CheckCircle2 size={16} />
                          <span>Credentials Approved</span>
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
    </AdminLayout>
  );
};
