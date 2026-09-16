import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Edit3,
  AlertCircle,
  CheckCircle2,
  Users,
  Search,
  UserPlus,
  UserMinus,
  Loader2,
} from 'lucide-react';
import { ProjectVisibilitySelector } from './ProjectVisibilitySelector';
import { supabase, isSupabaseConfigured } from '../../frontend/lib/supabase';
import { useAuth } from '../../frontend/context/AuthContext';



export const EditProjectModal = ({ isOpen, project, onClose, onProjectUpdated }) => {
  const { user, profile } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState('college');
  const [shares, setShares] = useState([]);
  const [loadingShares, setLoadingShares] = useState(false);
  const [sharesError, setSharesError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [mutatingShareId, setMutatingShareId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Initialize form when project changes
  useEffect(() => {
    if (project) {
      setTitle(project.title || '');
      setDescription(project.description || '');
      setVisibility(project.visibility || 'college');
      setError(null);
      setSharesError(null);
      setSearchQuery('');
      setSearchResults([]);
      setSearchError(null);
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

  // Load existing shares when project exists and visibility is selected
  const fetchShares = useCallback(async () => {
    if (!project || !user || user.id !== project.user_id || !isSupabaseConfigured) return;

    setLoadingShares(true);
    setSharesError(null);

    try {
      const { data: shareRows, error: sErr } = await supabase
        .from('project_shares')
        .select('id, project_id, shared_with, created_at')
        .eq('project_id', project.id)
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
  }, [project, user]);

  useEffect(() => {
    if (isOpen && project && visibility === 'selected') {
      fetchShares();
    }
  }, [isOpen, project, visibility, fetchShares]);

  if (!isOpen || !project) return null;

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
        .neq('id', user.id) // Creator cannot select themselves
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

  const handleAddShare = async (candidate) => {
    if (!candidate || !candidate.id) return;
    if (!user || user.id !== project.user_id) {
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
            project_id: project.id,
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

  const handleRemoveShare = async (shareId) => {
    if (!shareId) return;
    if (!user || user.id !== project.user_id) {
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Please provide a project title.');
      return;
    }

    if (!description.trim()) {
      setError('Please provide a project description or scope.');
      return;
    }

    if (!user) {
      setError('You must be signed in to edit this project.');
      return;
    }

    // Authorization check
    if (user.id !== project.user_id) {
      setError('Unauthorized: You can only edit projects that you authored.');
      return;
    }

    if (!isSupabaseConfigured) {
      setError('Supabase is not configured.');
      return;
    }

    setLoading(true);

    try {
      const { data, error: updateError } = await supabase
        .from('projects')
        .update({
          title: title.trim(),
          description: description.trim(),
          visibility: visibility,
        })
        .eq('id', project.id)
        .eq('user_id', user.id) // Enforce user_id match
        .select('*, profiles:user_id(full_name, department, role, is_verified)')
        .single();

      if (updateError) throw updateError;

      // Attach existing profile information if join is empty
      const updatedItem = {
        ...data,
        profiles: data?.profiles || project.profiles || profile,
      };

      setSuccess(true);
      setTimeout(() => {
        if (onProjectUpdated) onProjectUpdated(updatedItem);
        setSuccess(false);
        onClose();
      }, 500);
    } catch (err) {
      console.error('Error updating project:', err);
      setError(err.message || 'Failed to update project.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-project-title"
    >
      <div className="modal-dialog">
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.25rem',
            borderBottom: '1px solid var(--border-subtle)',
            paddingBottom: '0.85rem',
          }}
        >
          <div>
            <span className="label-academic terracotta">Edit Initiative</span>
            <h3 id="edit-project-title" style={{ marginTop: '0.2rem' }}>
              Revise Project Details
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: '0.25rem',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="notice-box error">
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {sharesError && (
          <div className="notice-box error">
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{sharesError}</span>
          </div>
        )}

        {success && (
          <div className="notice-box success">
            <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
            <span>Project details updated successfully!</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="edit-title">
              Project Title <span className="req">*</span>
            </label>
            <input
              id="edit-title"
              type="text"
              className="form-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={loading}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="edit-desc">
              Academic Description & Scope <span className="req">*</span>
            </label>
            <textarea
              id="edit-desc"
              className="form-textarea"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          {/* Visibility Selector */}
          <ProjectVisibilitySelector
            value={visibility}
            onChange={setVisibility}
            disabled={loading}
          />

          {/* Selected Users Management Section (Visible when visibility === 'selected') */}
          {visibility === 'selected' && (
            <div
              style={{
                marginTop: '1.25rem',
                padding: '1rem',
                backgroundColor: 'var(--color-warm-ivory-light)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <div style={{ marginBottom: '0.65rem' }}>
                <div
                  style={{
                    fontSize: '0.825rem',
                    fontWeight: 600,
                    color: 'var(--color-primary-dark)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  <Users size={14} />
                  <span>Selected Access Roster</span>
                </div>
                <p
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    margin: '0.2rem 0 0 0',
                  }}
                >
                  Search and grant read access to specific collegiate scholars or mentors.
                </p>
              </div>

              {searchError && (
                <div
                  className="notice-box error"
                  style={{ padding: '0.4rem 0.65rem', marginBottom: '0.65rem', fontSize: '0.78rem' }}
                >
                  <AlertCircle size={14} style={{ flexShrink: 0 }} />
                  <span>{searchError}</span>
                </div>
              )}

              {/* Profile Search Input */}
              <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: '0.65rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {isSearching ? <Loader2 size={14} className="spin" /> : <Search size={14} />}
                </div>
                <input
                  type="text"
                  className="form-input"
                  style={{
                    paddingLeft: '2.1rem',
                    fontSize: '0.825rem',
                    paddingTop: '0.45rem',
                    paddingBottom: '0.45rem',
                  }}
                  placeholder="Search scholars by name to grant access..."
                  value={searchQuery}
                  onChange={(e) => handleSearchProfiles(e.target.value)}
                  disabled={loading || !!mutatingShareId}
                />
              </div>

              {/* Search Results Dropdown/List */}
              {searchResults.length > 0 && (
                <div
                  style={{
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--color-white)',
                    marginBottom: '0.85rem',
                    overflow: 'hidden',
                  }}
                >
                  {searchResults.map((person) => {
                    const isAlreadyShared = shares.some((s) => s.shared_with === person.id);
                    const isMutatingThis = mutatingShareId === person.id;
                    return (
                      <div
                        key={person.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.5rem 0.75rem',
                          borderBottom: '1px solid var(--border-subtle)',
                          fontSize: '0.8rem',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            {person.full_name}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            {person.role === 'mentor' ? 'Faculty Mentor' : 'Student'}
                            {person.department ? ` • ${person.department}` : ''}
                          </div>
                        </div>

                        {isAlreadyShared ? (
                          <span
                            style={{
                              fontSize: '0.72rem',
                              color: 'var(--text-muted)',
                              fontStyle: 'italic',
                            }}
                          >
                            Granted
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
                            disabled={loading || !!mutatingShareId}
                            onClick={() => handleAddShare(person)}
                          >
                            {isMutatingThis ? (
                              <Loader2 size={12} className="spin" />
                            ) : (
                              <UserPlus size={12} />
                            )}
                            <span>{isMutatingThis ? 'Adding...' : 'Add'}</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Existing Active Shares Roster */}
              <div>
                <div
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    marginBottom: '0.4rem',
                  }}
                >
                  Active Roster ({shares.length})
                </div>

                {loadingShares ? (
                  <p
                    style={{
                      fontSize: '0.78rem',
                      color: 'var(--text-muted)',
                      margin: 0,
                    }}
                  >
                    Retrieving current access roster...
                  </p>
                ) : shares.length === 0 ? (
                  <p
                    style={{
                      fontSize: '0.78rem',
                      color: 'var(--text-muted)',
                      fontStyle: 'italic',
                      margin: 0,
                    }}
                  >
                    No scholars granted access yet. Use the search bar above to grant access.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    {shares.map((shareItem) => {
                      const prof = shareItem.profile || {};
                      const isMutatingThis = mutatingShareId === shareItem.id;
                      return (
                        <div
                          key={shareItem.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.4rem 0.65rem',
                            backgroundColor: 'var(--color-white)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.8rem',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div
                              style={{
                                width: '22px',
                                height: '22px',
                                borderRadius: '50%',
                                backgroundColor: 'var(--color-primary-dark)',
                                color: 'var(--color-warm-ivory)',
                                fontSize: '0.7rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                              }}
                            >
                              {prof.full_name ? prof.full_name[0].toUpperCase() : 'S'}
                            </div>
                            <div>
                              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                {prof.full_name || 'Collegiate Scholar'}
                              </span>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '0.4rem' }}>
                                ({prof.role === 'mentor' ? 'Mentor' : 'Student'})
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            disabled={loading || !!mutatingShareId}
                            onClick={() => handleRemoveShare(shareItem.id)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              color: 'var(--color-error)',
                              padding: '0.2rem',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                            title="Revoke scholar access"
                          >
                            {isMutatingThis ? (
                              <Loader2 size={14} className="spin" />
                            ) : (
                              <UserMinus size={14} />
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              marginTop: '1.5rem',
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '1.25rem',
            }}
          >
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              <Edit3 size={15} />
              <span>{loading ? 'Saving Changes...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
