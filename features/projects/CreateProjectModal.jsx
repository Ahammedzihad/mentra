import React, { useState, useEffect } from 'react';
import {
  X,
  FolderPlus,
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



export const CreateProjectModal = ({ isOpen, onClose, onProjectCreated }) => {
  const { user, profile } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState('college'); // Default: College
  const [stagedUsers, setStagedUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [sharesError, setSharesError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset search and staged state when visibility changes away from selected
  useEffect(() => {
    if (visibility !== 'selected') {
      setSearchQuery('');
      setSearchResults([]);
      setSearchError(null);
    }
  }, [visibility]);

  if (!isOpen) return null;

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

  const handleAddStagedUser = (candidate) => {
    if (!candidate || !candidate.id) return;
    if (candidate.id === user?.id) {
      setSearchError('You cannot add yourself as a shared recipient.');
      return;
    }
    if (stagedUsers.some((u) => u.id === candidate.id)) {
      setSearchError('This scholar is already in your selected list.');
      return;
    }
    setStagedUsers((prev) => [...prev, candidate]);
    setSearchError(null);
  };

  const handleRemoveStagedUser = (userId) => {
    setStagedUsers((prev) => prev.filter((u) => u.id !== userId));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSharesError(null);

    if (!title.trim()) {
      setError('Please provide a project title.');
      return;
    }

    if (!description.trim()) {
      setError('Please provide a project description or abstract.');
      return;
    }

    if (!user) {
      setError('You must be authenticated to create a project.');
      return;
    }

    if (!isSupabaseConfigured) {
      setError('Supabase is not configured yet. Add your credentials in .env to publish projects.');
      return;
    }

    setLoading(true);

    try {
      // 1. Insert into projects with visibility
      const { data: projectData, error: insertError } = await supabase
        .from('projects')
        .insert([
          {
            user_id: user.id,
            title: title.trim(),
            description: description.trim(),
            visibility: visibility,
          },
        ])
        .select('*, profiles:user_id(full_name, department, role, is_verified)')
        .single();

      if (insertError) throw insertError;

      // 2. If visibility is 'selected' and there are staged users, insert shares
      if (visibility === 'selected' && stagedUsers.length > 0) {
        const shareRows = stagedUsers.map((u) => ({
          project_id: projectData.id,
          shared_with: u.id,
        }));

        const { error: shareInsertError } = await supabase
          .from('project_shares')
          .insert(shareRows);

        if (shareInsertError) {
          console.error('Error creating project shares:', shareInsertError);
          setSharesError(
            'Project created, but some shares could not be saved: ' +
              shareInsertError.message
          );
        }
      }

      const projectWithProfile = {
        ...projectData,
        profiles: projectData?.profiles || {
          full_name: profile?.full_name || 'You',
          department: profile?.department,
          role: profile?.role || 'student',
        },
      };

      setSuccess(true);
      setTimeout(() => {
        if (onProjectCreated) onProjectCreated(projectWithProfile);
        setTitle('');
        setDescription('');
        setVisibility('college');
        setStagedUsers([]);
        setSearchQuery('');
        setSearchResults([]);
        setSuccess(false);
        onClose();
      }, 500);
    } catch (err) {
      console.error('Error creating project:', err);
      setError(err.message || 'Failed to publish project. Please try again.');
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
      aria-labelledby="create-project-title"
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
            <span className="label-academic">Student Initiative</span>
            <h3 id="create-project-title" style={{ marginTop: '0.2rem' }}>
              Inaugurate a Project
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
            <span>Project published to the collegiate registry!</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="project-title">
              Project Title <span className="req">*</span>
            </label>
            <input
              id="project-title"
              type="text"
              className="form-input"
              placeholder="e.g. Distributed Computational Linguistics Pipeline"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={loading}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="project-desc">
              Academic Description & Scope <span className="req">*</span>
            </label>
            <textarea
              id="project-desc"
              className="form-textarea"
              placeholder="Detail the technical hypothesis, design methodology, tools utilized, or collaboration objectives..."
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
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
                  Search and add collegiate scholars or mentors who should be granted read access.
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
                  disabled={loading}
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
                    const isAlreadyStaged = stagedUsers.some((u) => u.id === person.id);
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

                        {isAlreadyStaged ? (
                          <span
                            style={{
                              fontSize: '0.72rem',
                              color: 'var(--text-muted)',
                              fontStyle: 'italic',
                            }}
                          >
                            Added
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
                            onClick={() => handleAddStagedUser(person)}
                          >
                            <UserPlus size={12} />
                            <span>Add</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Staged Selected Users List */}
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
                  Selected Scholars ({stagedUsers.length})
                </div>
                {stagedUsers.length === 0 ? (
                  <p
                    style={{
                      fontSize: '0.78rem',
                      color: 'var(--text-muted)',
                      fontStyle: 'italic',
                      margin: 0,
                    }}
                  >
                    No scholars selected yet. Use the search bar above to grant access.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    {stagedUsers.map((userItem) => (
                      <div
                        key={userItem.id}
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
                            {userItem.full_name ? userItem.full_name[0].toUpperCase() : 'S'}
                          </div>
                          <div>
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                              {userItem.full_name}
                            </span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '0.4rem' }}>
                              ({userItem.role === 'mentor' ? 'Mentor' : 'Student'})
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveStagedUser(userItem.id)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--color-error)',
                            padding: '0.2rem',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                          title="Remove scholar from access"
                        >
                          <UserMinus size={14} />
                        </button>
                      </div>
                    ))}
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
              <FolderPlus size={16} />
              <span>{loading ? 'Publishing...' : 'Publish Project'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
