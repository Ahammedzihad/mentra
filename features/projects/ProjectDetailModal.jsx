import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  X,
  Lock,
  Users,
  Calendar,
  Search,
  UserPlus,
  UserMinus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import { VISIBILITY_OPTIONS } from './projectVisibilityOptions';
import { ProjectVisibilitySelector } from './ProjectVisibilitySelector';
import { supabase, isSupabaseConfigured } from '../../frontend/lib/supabase';
import { useAuth } from '../../frontend/context/AuthContext';

/**
 * Phase 3 PDF Visibility Badge Styling:
 * - Private → beige
 * - Selected → terracotta outline
 * - College → plain text
 * - Public → gold accent
 */
const getVisibilityBadgeStyle = (visibilityId) => {
  switch (visibilityId?.toLowerCase()) {
    case 'private':
      return {
        backgroundColor: 'var(--color-soft-beige-light)',
        border: '1px solid var(--color-soft-beige)',
        color: 'var(--color-primary-dark)',
      };
    case 'selected':
      return {
        backgroundColor: 'transparent',
        border: '1px solid var(--color-terracotta)',
        color: 'var(--color-terracotta)',
      };
    case 'college':
      return {
        backgroundColor: 'transparent',
        border: 'none',
        color: 'var(--text-secondary)',
        padding: '0.15rem 0.35rem',
      };
    case 'public':
      return {
        backgroundColor: 'var(--color-warm-gold-subtle)',
        border: '1px solid rgba(197, 164, 109, 0.4)',
        color: '#8C6A30',
      };
    default:
      return {
        backgroundColor: 'var(--color-soft-beige-light)',
        border: '1px solid var(--color-soft-beige)',
        color: 'var(--text-secondary)',
      };
  }
};

export const ProjectDetailModal = ({
  isOpen,
  project,
  onClose,
  onProjectUpdated,
}) => {
  const { user } = useAuth();

  // Local copy of project to reflect immediate updates
  const [currentProject, setCurrentProject] = useState(project);
  const [selectedVisibility, setSelectedVisibility] = useState('college');
  const [isUpdatingVisibility, setIsUpdatingVisibility] = useState(false);
  const [visibilitySuccess, setVisibilitySuccess] = useState(false);
  const [visibilityError, setVisibilityError] = useState(null);

  // Selected-shares state
  const [shares, setShares] = useState([]);
  const [loadingShares, setLoadingShares] = useState(false);
  const [sharesError, setSharesError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [mutatingShareId, setMutatingShareId] = useState(null);

  const isOwner = Boolean(user?.id && project?.user_id && user.id === project.user_id);

  // Sync state when project changes
  const lastProjectIdRef = useRef(project?.id);
  useEffect(() => {
    if (project) {
      if (lastProjectIdRef.current !== project.id) {
        lastProjectIdRef.current = project.id;
        setSelectedVisibility(project.visibility || 'college');
        setVisibilitySuccess(false);
        setVisibilityError(null);
        setSharesError(null);
        setSearchQuery('');
        setSearchResults([]);
        setSearchError(null);
      }
      setCurrentProject(project);
    }
  }, [project]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Fetch Selected shares when owner views a selected project
  const fetchShares = useCallback(async () => {
    if (!currentProject || !user || user.id !== currentProject.user_id || !isSupabaseConfigured) {
      return;
    }

    setLoadingShares(true);
    setSharesError(null);

    try {
      const { data: shareRows, error: sErr } = await supabase
        .from('project_shares')
        .select('id, project_id, shared_with, created_at')
        .eq('project_id', currentProject.id)
        .order('created_at', { ascending: true });

      if (sErr) throw sErr;

      if (shareRows && shareRows.length > 0) {
        const userIds = shareRows.map((r) => r.shared_with);
        const { data: profRows, error: pErr } = await supabase
          .from('profiles')
          .select('id, full_name, department, role, is_verified')
          .in('id', userIds);

        if (pErr) throw pErr;

        const profMap = new Map((profRows || []).map((p) => [p.id, p]));
        const enriched = shareRows.map((r) => ({
          ...r,
          profile: profMap.get(r.shared_with) || {
            id: r.shared_with,
            full_name: 'Collegiate Scholar',
            role: 'student',
          },
        }));
        setShares(enriched);
      } else {
        setShares([]);
      }
    } catch (err) {
      console.error('Error loading project shares:', err);
      setSharesError('Unable to load current project shares.');
    } finally {
      setLoadingShares(false);
    }
  }, [currentProject, user]);

  // Trigger share fetch when modal opens with Selected visibility
  useEffect(() => {
    if (isOpen && isOwner && (currentProject?.visibility === 'selected' || selectedVisibility === 'selected')) {
      fetchShares();
    }
  }, [isOpen, isOwner, currentProject?.visibility, selectedVisibility, fetchShares]);

  if (!isOpen || !currentProject) return null;

  // Canonical option resolution
  const activeVisibilityId = currentProject.visibility || 'college';
  const visibilityOption =
    VISIBILITY_OPTIONS.find((opt) => opt.id === activeVisibilityId.toLowerCase()) || {
      id: activeVisibilityId,
      label: activeVisibilityId,
      description: 'Project visibility status.',
      icon: Lock,
    };
  const VisibilityIcon = visibilityOption.icon;
  const badgeStyle = getVisibilityBadgeStyle(visibilityOption.id);

  // Creator metadata
  const creatorName = currentProject.profiles?.full_name || 'Collegiate Scholar';
  const creatorDept = currentProject.profiles?.department || 'Academic Studies';
  const isCreatorVerifiedMentor = Boolean(
    currentProject.profiles?.role === 'mentor' && currentProject.profiles?.is_verified === true
  );
  const createdDate = currentProject.created_at
    ? new Date(currentProject.created_at).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Archived';

  // Handle owner visibility change
  const handleSaveVisibility = async () => {
    if (!isOwner || !isSupabaseConfigured) return;
    if (selectedVisibility === currentProject.visibility) return;

    setIsUpdatingVisibility(true);
    setVisibilityError(null);
    setVisibilitySuccess(false);

    try {
      const { data, error: updateErr } = await supabase
        .from('projects')
        .update({ visibility: selectedVisibility })
        .eq('id', currentProject.id)
        .select('*, profiles:user_id(full_name, department, role, is_verified)')
        .single();

      if (updateErr) throw updateErr;

      setCurrentProject(data);
      setVisibilitySuccess(true);
      if (onProjectUpdated) {
        onProjectUpdated(data);
      }
    } catch (err) {
      console.error('Error updating project visibility:', err);
      setVisibilityError(err.message || 'Failed to update visibility.');
    } finally {
      setIsUpdatingVisibility(false);
    }
  };

  // Directory search for Selected sharing
  const handleSearchProfiles = async (query) => {
    setSearchQuery(query);
    setSearchError(null);
    const trimmed = query.trim();
    if (!trimmed) {
      setSearchResults([]);
      return;
    }
    if (!user || !isSupabaseConfigured) return;

    setIsSearching(true);
    try {
      const { data, error: sErr } = await supabase
        .from('profiles')
        .select('id, full_name, department, role, is_verified')
        .ilike('full_name', `%${trimmed}%`)
        .neq('id', user.id) // Cannot share with oneself
        .limit(6);

      if (sErr) throw sErr;
      setSearchResults(data || []);
    } catch (err) {
      console.error('Error searching collegiate directory:', err);
      setSearchError('Unable to search collegiate profiles. Please retry.');
    } finally {
      setIsSearching(false);
    }
  };

  // Add a scholar to project_shares
  const handleAddShare = async (candidate) => {
    if (!candidate || !candidate.id) return;
    if (!isOwner) {
      setSearchError('Unauthorized: Only the project creator can manage access.');
      return;
    }
    if (candidate.id === user.id) {
      setSearchError('You cannot add yourself as a shared recipient.');
      return;
    }
    if (shares.some((s) => s.shared_with === candidate.id)) {
      setSearchError('This scholar has already been granted access.');
      return;
    }

    setMutatingShareId(candidate.id);
    setSearchError(null);
    setSharesError(null);

    try {
      const { data, error: insertErr } = await supabase
        .from('project_shares')
        .insert([
          {
            project_id: currentProject.id,
            shared_with: candidate.id,
          },
        ])
        .select('id, project_id, shared_with, created_at')
        .single();

      if (insertErr) throw insertErr;

      setShares((prev) => [
        ...prev,
        {
          ...data,
          profile: candidate,
        },
      ]);
    } catch (err) {
      console.error('Error granting project share:', err);
      setSearchError(err.message || 'Failed to grant access to selected user.');
    } finally {
      setMutatingShareId(null);
    }
  };

  // Remove a scholar from project_shares
  const handleRemoveShare = async (shareId) => {
    if (!shareId) return;
    if (!isOwner) {
      setSharesError('Unauthorized: Only the project creator can revoke access.');
      return;
    }

    setMutatingShareId(shareId);
    setSharesError(null);

    try {
      const { error: delErr } = await supabase
        .from('project_shares')
        .delete()
        .eq('id', shareId);

      if (delErr) throw delErr;

      setShares((prev) => prev.filter((s) => s.id !== shareId));
    } catch (err) {
      console.error('Error removing project share:', err);
      setSharesError(err.message || 'Failed to remove share access.');
    } finally {
      setMutatingShareId(null);
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="project-detail-title"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(3px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      <div
        className="card"
        style={{
          maxWidth: '680px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          backgroundColor: 'var(--surface-primary, var(--color-white))',
          padding: '2rem',
          position: 'relative',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-modal)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '1.25rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
              <span className="badge-dept terracotta">
                {creatorDept}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                <Calendar size={12} />
                <span>{createdDate}</span>
              </span>
            </div>
            <h2
              id="project-detail-title"
              className="font-serif"
              style={{
                fontSize: '1.65rem',
                color: 'var(--color-primary-dark)',
                margin: 0,
                lineHeight: 1.25,
              }}
            >
              {currentProject.title}
            </h2>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0.35rem',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 'var(--radius-sm)',
            }}
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>

        {/* Phase 3 Visibility Badge Section */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            padding: '0.85rem 1rem',
            backgroundColor: 'var(--color-warm-ivory-light)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
            marginBottom: '1.5rem',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span
              className="badge-dept"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.72rem',
                padding: '0.25rem 0.65rem',
                borderRadius: 'var(--radius-sm)',
                textTransform: 'uppercase',
                fontWeight: 600,
                letterSpacing: '0.05em',
                ...badgeStyle,
              }}
              title={visibilityOption.description}
            >
              {VisibilityIcon && <VisibilityIcon size={12} aria-hidden="true" />}
              <span>{visibilityOption.label}</span>
            </span>

            <span style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
              {visibilityOption.description}
            </span>
          </div>

          {isOwner && (
            <span
              className="badge-dept gold"
              style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem' }}
            >
              Your Project
            </span>
          )}
        </div>

        {/* Project Narrative / Description */}
        <div style={{ marginBottom: '1.75rem' }}>
          <div
            style={{
              fontSize: '0.78rem',
              fontWeight: 600,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '0.5rem',
            }}
          >
            Abstract & Project Scope
          </div>
          <p
            style={{
              fontSize: '0.925rem',
              lineHeight: '1.7',
              color: 'var(--text-primary)',
              whiteSpace: 'pre-line',
              margin: 0,
            }}
          >
            {currentProject.description}
          </p>
        </div>

        {/* Creator Identity Card */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem',
            padding: '1rem 1.15rem',
            backgroundColor: 'var(--color-warm-ivory)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
            marginBottom: '1.75rem',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: isCreatorVerifiedMentor ? '#8C6A30' : 'var(--color-primary-dark)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.95rem',
              flexShrink: 0,
            }}
          >
            {creatorName[0]?.toUpperCase() || 'S'}
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-primary-dark)' }}>
                {creatorName}
              </span>
              <span
                className={`badge-dept ${isCreatorVerifiedMentor ? 'gold' : 'terracotta'}`}
                style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}
              >
                {currentProject.profiles?.role === 'mentor' ? 'Faculty Mentor' : 'Student Scholar'}
              </span>
              {isCreatorVerifiedMentor && (
                <ShieldCheck size={14} style={{ color: '#8C6A30' }} title="Verified Faculty Mentor" />
              )}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
              Department of {creatorDept}
            </div>
          </div>
        </div>

        {/* =================================================================== */}
        {/* OWNER MANAGEMENT PANEL (Strictly rendered for project owner)        */}
        {/* =================================================================== */}
        {isOwner && (
          <div
            style={{
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '1.5rem',
              marginTop: '1.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
              <h3
                className="font-serif"
                style={{
                  fontSize: '1.15rem',
                  color: 'var(--color-primary-dark)',
                  margin: 0,
                }}
              >
                Visibility & Sharing Management
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Owner Authority
              </span>
            </div>

            {visibilitySuccess && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.65rem 0.85rem',
                  backgroundColor: '#E8F5E9',
                  color: '#2E7D32',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.825rem',
                  marginBottom: '1rem',
                  border: '1px solid #C8E6C9',
                }}
              >
                <CheckCircle2 size={16} />
                <span>Project visibility successfully updated to {currentProject.visibility}!</span>
              </div>
            )}

            {visibilityError && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.65rem 0.85rem',
                  backgroundColor: '#FFEBEE',
                  color: '#C62828',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.825rem',
                  marginBottom: '1rem',
                  border: '1px solid #FFCDD2',
                }}
              >
                <AlertCircle size={16} />
                <span>{visibilityError}</span>
              </div>
            )}

            {/* Visibility Selector */}
            <ProjectVisibilitySelector
              value={selectedVisibility}
              onChange={(newVal) => {
                setSelectedVisibility(newVal);
                setVisibilitySuccess(false);
                setVisibilityError(null);
              }}
              disabled={isUpdatingVisibility}
            />

            {/* Save Visibility Button (enabled when selection differs from current) */}
            {selectedVisibility !== currentProject.visibility && (
              <div style={{ marginTop: '0.85rem', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={handleSaveVisibility}
                  disabled={isUpdatingVisibility}
                  className="btn btn-primary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  {isUpdatingVisibility && <Loader2 size={13} className="spin" />}
                  <span>Save Visibility as {selectedVisibility}</span>
                </button>
              </div>
            )}

            {/* Selected-List Share Management (Rendered when visibility is Selected) */}
            {(selectedVisibility === 'selected' || currentProject.visibility === 'selected') && (
              <div
                style={{
                  marginTop: '1.5rem',
                  padding: '1.15rem',
                  backgroundColor: 'var(--color-warm-ivory-light)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '0.65rem',
                  }}
                >
                  <label
                    className="form-label"
                    style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <Users size={15} style={{ color: 'var(--color-terracotta)' }} />
                    <span>Selected Scholars Access List</span>
                  </label>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {shares.length} granted
                  </span>
                </div>

                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 0.85rem 0' }}>
                  Only the scholars explicitly listed below will be authorized to view this project.
                </p>

                {sharesError && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      color: '#C62828',
                      fontSize: '0.78rem',
                      marginBottom: '0.75rem',
                    }}
                  >
                    <AlertCircle size={14} />
                    <span>{sharesError}</span>
                  </div>
                )}

                {/* Current Shares Roster */}
                {loadingShares ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.85rem 0', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    <Loader2 size={14} className="spin" />
                    <span>Retrieving authorized scholars...</span>
                  </div>
                ) : shares.length === 0 ? (
                  <div
                    style={{
                      padding: '0.75rem 0.85rem',
                      backgroundColor: 'var(--color-white)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px dashed var(--border-subtle)',
                      fontSize: '0.78rem',
                      color: 'var(--text-muted)',
                      fontStyle: 'italic',
                      marginBottom: '0.85rem',
                    }}
                  >
                    No scholars have been granted individual access yet. Search the directory below to add scholars.
                  </div>
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.4rem',
                      marginBottom: '1rem',
                      maxHeight: '180px',
                      overflowY: 'auto',
                    }}
                  >
                    {shares.map((sh) => (
                      <div
                        key={sh.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.45rem 0.75rem',
                          backgroundColor: 'var(--color-white)',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-subtle)',
                          fontSize: '0.825rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 600, color: 'var(--color-primary-dark)' }}>
                            {sh.profile?.full_name || 'Collegiate Scholar'}
                          </span>
                          {sh.profile?.department && (
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              • {sh.profile.department}
                            </span>
                          )}
                          <span
                            className={`badge-dept ${sh.profile?.role === 'mentor' ? 'gold' : 'terracotta'}`}
                            style={{ fontSize: '0.62rem', padding: '0.05rem 0.35rem' }}
                          >
                            {sh.profile?.role === 'mentor' ? 'Mentor' : 'Student'}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveShare(sh.id)}
                          disabled={mutatingShareId === sh.id}
                          className="btn btn-secondary btn-sm"
                          style={{
                            padding: '0.2rem 0.5rem',
                            fontSize: '0.7rem',
                            color: '#9E382A',
                            borderColor: '#F1D5D2',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                          }}
                          title="Revoke access"
                        >
                          {mutatingShareId === sh.id ? (
                            <Loader2 size={11} className="spin" />
                          ) : (
                            <UserMinus size={11} />
                          )}
                          <span>Remove</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Search & Add Scholar to Shares */}
                <div style={{ marginTop: '0.5rem' }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      marginBottom: '0.35rem',
                    }}
                  >
                    Grant Access to Scholar
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Search collegiate directory by scholar name..."
                      value={searchQuery}
                      onChange={(e) => handleSearchProfiles(e.target.value)}
                      style={{
                        paddingLeft: '2rem',
                        fontSize: '0.8rem',
                        paddingTop: '0.45rem',
                        paddingBottom: '0.45rem',
                      }}
                    />
                    <Search
                      size={14}
                      style={{
                        position: 'absolute',
                        left: '0.75rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--text-muted)',
                      }}
                    />
                    {isSearching && (
                      <Loader2
                        size={14}
                        className="spin"
                        style={{
                          position: 'absolute',
                          right: '0.75rem',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          color: 'var(--text-muted)',
                        }}
                      />
                    )}
                  </div>

                  {searchError && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        color: '#C62828',
                        fontSize: '0.75rem',
                        marginTop: '0.35rem',
                      }}
                    >
                      <AlertCircle size={13} />
                      <span>{searchError}</span>
                    </div>
                  )}

                  {/* Search Results Dropdown */}
                  {searchResults.length > 0 && (
                    <div
                      style={{
                        marginTop: '0.4rem',
                        backgroundColor: 'var(--color-white)',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-subtle)',
                        boxShadow: 'var(--shadow-subtle)',
                        maxHeight: '160px',
                        overflowY: 'auto',
                      }}
                    >
                      {searchResults.map((cand) => {
                        const isAlreadyShared = shares.some((s) => s.shared_with === cand.id);
                        return (
                          <div
                            key={cand.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '0.45rem 0.75rem',
                              borderBottom: '1px solid var(--color-warm-ivory)',
                              fontSize: '0.8rem',
                            }}
                          >
                            <div>
                              <span style={{ fontWeight: 600, color: 'var(--color-primary-dark)' }}>
                                {cand.full_name}
                              </span>
                              {cand.department && (
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '0.4rem' }}>
                                  ({cand.department})
                                </span>
                              )}
                            </div>

                            {isAlreadyShared ? (
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                Granted
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleAddShare(cand)}
                                disabled={mutatingShareId === cand.id}
                                className="btn btn-secondary btn-sm"
                                style={{
                                  padding: '0.2rem 0.5rem',
                                  fontSize: '0.7rem',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                }}
                              >
                                {mutatingShareId === cand.id ? (
                                  <Loader2 size={11} className="spin" />
                                ) : (
                                  <UserPlus size={11} />
                                )}
                                <span>Grant</span>
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.75rem',
            borderTop: '1px solid var(--border-subtle)',
            paddingTop: '1.25rem',
            marginTop: '1.5rem',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary btn-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
