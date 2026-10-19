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
  Image as ImageIcon,
  Upload,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { ProjectVisibilitySelector } from './ProjectVisibilitySelector';
import { ProjectTagsInput } from './ProjectTagsInput';
import { supabase, isSupabaseConfigured } from '../../frontend/lib/supabase';
import { useAuth } from '../../frontend/context/AuthContext';
import {
  MAX_PROJECT_PHOTOS,
  validateImageFile,
  compressImageToWebp,
  uploadSingleProjectPhoto,
  deleteSingleProjectPhoto,
  deleteProjectMediaRowOnly,
  fetchProjectMediaWithSignedUrls,
  getAvailablePositions,
} from './projectMediaService';

export const EditProjectModal = ({ isOpen, project, onClose, onProjectUpdated }) => {
  const { user, profile } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState([]);
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

  // Project Photos State (Mentra Phase 7)
  const [existingMedia, setExistingMedia] = useState([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [mediaError, setMediaError] = useState(null);
  const [stagedNewPhotos, setStagedNewPhotos] = useState([]);
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
  const [removingMediaId, setRemovingMediaId] = useState(null);
  const [photoGeneralError, setPhotoGeneralError] = useState(null);

  // Initialize form when project changes
  useEffect(() => {
    if (project) {
      setTitle(project.title || '');
      setDescription(project.description || '');
      setTags(Array.isArray(project.tags) ? [...project.tags] : []);
      setVisibility(project.visibility || 'college');
      setError(null);
      setSharesError(null);
      setSearchQuery('');
      setSearchResults([]);
      setSearchError(null);
    }
  }, [project]);

  const loadExistingMedia = useCallback(async () => {
    if (!project || !isSupabaseConfigured) return;
    setLoadingMedia(true);
    setMediaError(null);
    try {
      const rows = await fetchProjectMediaWithSignedUrls(supabase, project.id);
      setExistingMedia(rows);
    } catch (err) {
      console.error('Error loading project media:', err);
      setMediaError('Unable to load attached photos.');
    } finally {
      setLoadingMedia(false);
    }
  }, [project]);

  useEffect(() => {
    if (isOpen && project) {
      loadExistingMedia();
      setStagedNewPhotos([]);
      setPhotoGeneralError(null);
    }
  }, [isOpen, project, loadExistingMedia]);

  const handleCloseModal = useCallback(() => {
    stagedNewPhotos.forEach((p) => {
      if (p.previewUrl) {
        try {
          URL.revokeObjectURL(p.previewUrl);
        } catch {
          // ignore cleanup exception
        }
      }
    });
    setStagedNewPhotos([]);
    setPhotoGeneralError(null);
    onClose();
  }, [stagedNewPhotos, onClose]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        handleCloseModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleCloseModal]);

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

  const handlePhotoSelect = (e) => {
    setPhotoGeneralError(null);
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    e.target.value = '';

    const currentTotal = existingMedia.length + stagedNewPhotos.length;
    const remainingSlots = MAX_PROJECT_PHOTOS - currentTotal;

    if (remainingSlots <= 0) {
      setPhotoGeneralError(`A project may have at most ${MAX_PROJECT_PHOTOS} photos. Maximum limit reached.`);
      return;
    }

    let filesToProcess = files;
    if (files.length > remainingSlots) {
      setPhotoGeneralError(
        `Only ${remainingSlots} more photo(s) allowed (maximum ${MAX_PROJECT_PHOTOS}). Excess files were not added.`
      );
      filesToProcess = files.slice(0, remainingSlots);
    }

    const newEntries = [];
    for (const file of filesToProcess) {
      const validation = validateImageFile(file);
      if (!validation.valid) {
        setPhotoGeneralError(validation.error);
        continue;
      }

      const id = `new-photo-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const previewUrl = URL.createObjectURL(file);
      newEntries.push({
        id,
        file,
        name: file.name,
        size: file.size,
        previewUrl,
        status: 'staged',
        error: null,
        mediaRow: null,
      });
    }

    if (newEntries.length > 0) {
      setStagedNewPhotos((prev) => [...prev, ...newEntries]);
    }
  };

  const handleRemoveStagedPhoto = (photoId) => {
    setStagedNewPhotos((prev) => {
      const target = prev.find((p) => p.id === photoId);
      if (target && target.previewUrl) {
        try {
          URL.revokeObjectURL(target.previewUrl);
        } catch {
          // ignore
        }
      }
      return prev.filter((p) => p.id !== photoId);
    });
  };

  const handleRemoveExistingMedia = async (mediaItem) => {
    if (!mediaItem || !mediaItem.id) return;
    if (removingMediaId || loading || isUploadingPhotos) return; // Prevent duplicate cleanup actions
    if (!user || user.id !== project.user_id) {
      setPhotoGeneralError('Unauthorized: Only the project owner may remove photos.');
      return;
    }

    setRemovingMediaId(mediaItem.id);
    setPhotoGeneralError(null);

    try {
      if (mediaItem.isStorageMissing) {
        // Safe recovery: file is already confirmed absent from storage; retry deleting database row directly
        await deleteProjectMediaRowOnly({
          supabaseClient: supabase,
          mediaId: mediaItem.id,
        });
      } else {
        // Safe order: delete storage object first, confirm absent, delete database row, confirm absent
        await deleteSingleProjectPhoto({
          supabaseClient: supabase,
          projectId: project.id,
          mediaId: mediaItem.id,
          path: mediaItem.path,
        });
      }

      // Update local state after successful removal
      setExistingMedia((prev) => prev.filter((m) => m.id !== mediaItem.id));
    } catch (err) {
      console.error('Failed to remove photo:', err);
      if (err?.isStorageDeleted) {
        // Storage deletion succeeded and confirmed absent, but DB row deletion or read-back failed!
        // Keep modal open, mark row as missing from storage, show clear actionable notice
        setExistingMedia((prev) =>
          prev.map((m) => (m.id === mediaItem.id ? { ...m, isStorageMissing: true } : m))
        );
        setPhotoGeneralError(
          err.message ||
            'Photo file was confirmed removed from storage, but deleting the database record failed. The file is gone from storage but its record remains below. Click "Retry DB Removal" to complete cleanup.'
        );
      } else {
        // Storage deletion failed or inconclusive; database row was kept intact
        setPhotoGeneralError(
          err.message || 'Failed to remove attached photo. Database record was preserved.'
        );
      }
    } finally {
      setRemovingMediaId(null);
    }
  };

  const handleRetryDeleteRow = async (mediaItem) => {
    if (!mediaItem || !mediaItem.id) return;
    if (removingMediaId || loading || isUploadingPhotos) return; // Prevent duplicate cleanup actions
    if (!user || user.id !== project.user_id) {
      setPhotoGeneralError('Unauthorized: Only the project owner may remove photos.');
      return;
    }

    setRemovingMediaId(mediaItem.id);
    setPhotoGeneralError(null);

    try {
      // Retry database row removal directly without requiring the file to exist in storage, and verify read-back
      await deleteProjectMediaRowOnly({
        supabaseClient: supabase,
        mediaId: mediaItem.id,
      });

      // Update local state after confirmed successful removal
      setExistingMedia((prev) => prev.filter((m) => m.id !== mediaItem.id));
    } catch (err) {
      console.error('Failed to retry database row removal:', err);
      setPhotoGeneralError(
        `Failed to remove database record: ${err.message}. The record remains available for retry.`
      );
    } finally {
      setRemovingMediaId(null);
    }
  };

  const executePhotoUploads = async (targetPhotoIds = null) => {
    if (!project?.id || !user) return false;

    setIsUploadingPhotos(true);
    setPhotoGeneralError(null);

    // Re-fetch fresh rows from DB to ensure positions are preserved and accurate
    let freshRows = [];
    try {
      freshRows = await fetchProjectMediaWithSignedUrls(supabase, project.id);
      setExistingMedia(freshRows);
    } catch {
      freshRows = [...existingMedia];
    }

    const photosToProcess = stagedNewPhotos.filter((p) => {
      if (p.status === 'success') return false;
      if (targetPhotoIds) return targetPhotoIds.includes(p.id);
      return true;
    });

    if (photosToProcess.length === 0) {
      setIsUploadingPhotos(false);
      return true;
    }

    let anyFailed = false;

    for (const item of photosToProcess) {
      const availablePositions = getAvailablePositions(freshRows);
      if (availablePositions.length === 0) {
        setStagedNewPhotos((prev) =>
          prev.map((p) =>
            p.id === item.id
              ? { ...p, status: 'error', error: 'No available photo slots remaining (maximum 5).' }
              : p
          )
        );
        anyFailed = true;
        continue;
      }
      const assignedPosition = availablePositions[0]; // Assign lowest available position

      setStagedNewPhotos((prev) =>
        prev.map((p) => (p.id === item.id ? { ...p, status: 'compressing', error: null } : p))
      );

      let webpBlob = null;
      try {
        webpBlob = await compressImageToWebp(item.file);
      } catch (compErr) {
        setStagedNewPhotos((prev) =>
          prev.map((p) =>
            p.id === item.id ? { ...p, status: 'error', error: compErr.message } : p
          )
        );
        anyFailed = true;
        continue;
      }

      setStagedNewPhotos((prev) =>
        prev.map((p) => (p.id === item.id ? { ...p, status: 'uploading' } : p))
      );

      try {
        const mediaRow = await uploadSingleProjectPhoto({
          supabaseClient: supabase,
          projectId: project.id,
          uploaderId: user.id,
          blobOrFile: webpBlob,
          position: assignedPosition,
        });

        freshRows.push(mediaRow);

        setStagedNewPhotos((prev) =>
          prev.map((p) =>
            p.id === item.id ? { ...p, status: 'success', mediaRow, error: null } : p
          )
        );
      } catch (upErr) {
        setStagedNewPhotos((prev) =>
          prev.map((p) =>
            p.id === item.id ? { ...p, status: 'error', error: upErr.message } : p
          )
        );
        anyFailed = true;
      }
    }

    // Refresh database state after completion
    try {
      const updatedRows = await fetchProjectMediaWithSignedUrls(supabase, project.id);
      setExistingMedia(updatedRows);
    } catch {
      // ignore
    }

    setIsUploadingPhotos(false);
    return !anyFailed;
  };

  const handleRetrySinglePhoto = async (photoId) => {
    await executePhotoUploads([photoId]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSharesError(null);
    setPhotoGeneralError(null);

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
          tags: tags,
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

      // Upload any new staged photos
      const pendingPhotos = stagedNewPhotos.filter((p) => p.status !== 'success');
      if (pendingPhotos.length === 0) {
        setSuccess(true);
        setTimeout(() => {
          if (onProjectUpdated) onProjectUpdated(updatedItem);
          setSuccess(false);
          handleCloseModal();
        }, 500);
        return;
      }

      const allSucceeded = await executePhotoUploads();

      if (allSucceeded) {
        setSuccess(true);
        setTimeout(() => {
          if (onProjectUpdated) onProjectUpdated(updatedItem);
          setSuccess(false);
          handleCloseModal();
        }, 500);
      } else {
        if (onProjectUpdated) onProjectUpdated(updatedItem);
        setPhotoGeneralError(
          'Project details updated, but one or more photos encountered an upload error. You can retry the failed photos below, or close this dialog.'
        );
      }
    } catch (err) {
      console.error('Error updating project:', err);
      if (err?.message?.includes('tags_max_count') || err?.details?.includes('tags_max_count')) {
        setError('Too many tags — please use 6 or fewer.');
      } else {
        setError(err.message || 'Failed to update project.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleCloseModal();
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
            onClick={handleCloseModal}
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

          {/* Project Tags Input */}
          <ProjectTagsInput
            tags={tags}
            onChange={setTags}
            disabled={loading}
          />

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

          {/* Project Photos Section (Mentra Phase 7) */}
          <div
            style={{
              marginTop: '1.25rem',
              padding: '1rem',
              backgroundColor: 'var(--color-warm-ivory-light)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '0.45rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <ImageIcon size={16} style={{ color: 'var(--color-terracotta)' }} />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-primary-dark)' }}>
                  Project Photos
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  ({existingMedia.length + stagedNewPhotos.length}/{MAX_PROJECT_PHOTOS})
                </span>
              </div>

              <label
                className="btn btn-secondary btn-sm"
                style={{
                  cursor:
                    existingMedia.length + stagedNewPhotos.length >= MAX_PROJECT_PHOTOS ||
                    loading ||
                    isUploadingPhotos ||
                    !!removingMediaId
                      ? 'not-allowed'
                      : 'pointer',
                  opacity:
                    existingMedia.length + stagedNewPhotos.length >= MAX_PROJECT_PHOTOS ||
                    loading ||
                    isUploadingPhotos ||
                    !!removingMediaId
                      ? 0.6
                      : 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.75rem',
                  padding: '0.3rem 0.65rem',
                }}
              >
                <Upload size={13} />
                <span>Add Photos</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  disabled={
                    existingMedia.length + stagedNewPhotos.length >= MAX_PROJECT_PHOTOS ||
                    loading ||
                    isUploadingPhotos ||
                    !!removingMediaId
                  }
                  onChange={handlePhotoSelect}
                  style={{ display: 'none' }}
                />
              </label>
            </div>

            <p style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', margin: '0 0 0.75rem 0', lineHeight: 1.45 }}>
              Attach up to 5 photos (JPEG, PNG, WebP). Existing photo slots are preserved; new photos take the lowest available slot.
            </p>

            {mediaError && (
              <div
                className="notice-box error"
                style={{ padding: '0.45rem 0.65rem', marginBottom: '0.75rem', fontSize: '0.78rem' }}
              >
                <AlertCircle size={14} style={{ flexShrink: 0 }} />
                <span>{mediaError}</span>
              </div>
            )}

            {photoGeneralError && (
              <div
                className="notice-box error"
                style={{ padding: '0.45rem 0.65rem', marginBottom: '0.75rem', fontSize: '0.78rem' }}
              >
                <AlertCircle size={14} style={{ flexShrink: 0 }} />
                <span>{photoGeneralError}</span>
              </div>
            )}

            {existingMedia.some((m) => m.isStorageMissing) && (
              <div
                className="notice-box warning"
                style={{
                  padding: '0.45rem 0.65rem',
                  marginBottom: '0.75rem',
                  fontSize: '0.78rem',
                  backgroundColor: '#FFF8E1',
                  borderColor: '#FFE082',
                  color: '#5D4037',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <AlertCircle size={14} style={{ flexShrink: 0, color: '#F57C00' }} />
                <span>
                  One or more photos were deleted from storage, but their database records remain. Click &quot;Retry DB Removal&quot; on the affected slot to finalize cleanup.
                </span>
              </div>
            )}

            {loadingMedia ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.5rem 0', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                <Loader2 size={15} className="spin" />
                <span>Loading attached project photos...</span>
              </div>
            ) : (
              (existingMedia.length > 0 || stagedNewPhotos.length > 0) && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                    gap: '0.75rem',
                    marginTop: '0.5rem',
                  }}
                >
                  {/* Existing attached photos */}
                  {existingMedia.map((photo) => {
                    const isRemoving = removingMediaId === photo.id;
                    const isMissing = !!photo.isStorageMissing;
                    return (
                      <div
                        key={photo.id}
                        style={{
                          position: 'relative',
                          borderRadius: 'var(--radius-sm)',
                          border: isMissing
                            ? '1px solid var(--color-terracotta)'
                            : '1px solid var(--border-subtle)',
                          backgroundColor: 'var(--color-white)',
                          overflow: 'hidden',
                          display: 'flex',
                          flexDirection: 'column',
                        }}
                      >
                        <div style={{ position: 'relative', width: '100%', height: '85px', backgroundColor: '#e9e4dc' }}>
                          {isMissing ? (
                            <div
                              style={{
                                width: '100%',
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '0.35rem',
                                textAlign: 'center',
                                backgroundColor: '#fbf4f2',
                              }}
                            >
                              <AlertCircle size={15} style={{ color: 'var(--color-terracotta)', marginBottom: '2px' }} />
                              <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--color-terracotta)' }}>
                                Storage File Removed
                              </span>
                              <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)' }}>
                                Record remains in DB
                              </span>
                            </div>
                          ) : photo.signedUrl ? (
                            <img
                              src={photo.signedUrl}
                              alt={`Slot ${photo.position}`}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : (
                            <div
                              style={{
                                width: '100%',
                                height: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.7rem',
                                color: 'var(--text-muted)',
                              }}
                            >
                              Image unavailable
                            </div>
                          )}

                          {/* Removing Overlay */}
                          {isRemoving && (
                            <div
                              style={{
                                position: 'absolute',
                                inset: 0,
                                backgroundColor: 'rgba(23, 21, 19, 0.75)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--color-warm-ivory)',
                                fontSize: '0.65rem',
                                gap: '0.2rem',
                                zIndex: 3,
                              }}
                            >
                              <Loader2 size={16} className="spin" />
                              <span>Removing...</span>
                            </div>
                          )}

                          {/* Position Badge */}
                          <div
                            style={{
                              position: 'absolute',
                              top: '4px',
                              left: '4px',
                              backgroundColor: isMissing
                                ? 'var(--color-terracotta)'
                                : 'rgba(23, 21, 19, 0.75)',
                              color: 'var(--color-warm-ivory)',
                              fontSize: '0.65rem',
                              padding: '1px 5px',
                              borderRadius: '3px',
                              fontWeight: 600,
                              zIndex: 2,
                            }}
                          >
                            Slot {photo.position}
                          </div>

                          {/* Remove Button (Owner-only single photo removal) */}
                          {!isRemoving && (
                            <button
                              type="button"
                              onClick={() => handleRemoveExistingMedia(photo)}
                              disabled={loading || isUploadingPhotos || !!removingMediaId}
                              title={isMissing ? 'Remove database record' : 'Remove photo from project'}
                              style={{
                                position: 'absolute',
                                top: '4px',
                                right: '4px',
                                background: 'rgba(162, 62, 48, 0.85)',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '50%',
                                width: '20px',
                                height: '20px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: 0,
                                zIndex: 2,
                              }}
                            >
                              <Trash2 size={11} />
                            </button>
                          )}

                          {/* Retry DB Row Removal Action for missing storage files */}
                          {!isRemoving && isMissing && (
                            <button
                              type="button"
                              onClick={() => handleRetryDeleteRow(photo)}
                              disabled={loading || isUploadingPhotos || !!removingMediaId}
                              title="Retry database record removal"
                              style={{
                                position: 'absolute',
                                bottom: '4px',
                                left: '4px',
                                right: '4px',
                                background: 'var(--color-terracotta)',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '3px',
                                fontSize: '0.62rem',
                                fontWeight: 600,
                                padding: '3px 4px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '3px',
                                zIndex: 2,
                              }}
                            >
                              <RefreshCw size={10} />
                              <span>Retry DB Removal</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Staged new photos */}
                  {stagedNewPhotos.map((photo) => (
                    <div
                      key={photo.id}
                      style={{
                        position: 'relative',
                        borderRadius: 'var(--radius-sm)',
                        border:
                          photo.status === 'error'
                            ? '1px solid var(--color-error)'
                            : photo.status === 'success'
                            ? '1px solid #2e7d32'
                            : '1px dashed var(--color-terracotta)',
                        backgroundColor: 'var(--color-white)',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                    >
                      <div style={{ position: 'relative', width: '100%', height: '85px', backgroundColor: '#e9e4dc' }}>
                        <img
                          src={photo.previewUrl}
                          alt={photo.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />

                        {(photo.status === 'compressing' || photo.status === 'uploading') && (
                          <div
                            style={{
                              position: 'absolute',
                              inset: 0,
                              backgroundColor: 'rgba(23, 21, 19, 0.65)',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'var(--color-warm-ivory)',
                              fontSize: '0.65rem',
                              gap: '0.25rem',
                            }}
                          >
                            <Loader2 size={16} className="spin" />
                            <span>{photo.status === 'compressing' ? 'Optimizing...' : 'Uploading...'}</span>
                          </div>
                        )}

                        {photo.status === 'success' && (
                          <div
                            style={{
                              position: 'absolute',
                              bottom: '4px',
                              right: '4px',
                              backgroundColor: 'rgba(46, 125, 50, 0.9)',
                              color: '#fff',
                              borderRadius: '50%',
                              padding: '2px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                            title="Uploaded successfully"
                          >
                            <CheckCircle2 size={13} />
                          </div>
                        )}

                        <div
                          style={{
                            position: 'absolute',
                            top: '4px',
                            left: '4px',
                            backgroundColor: 'rgba(184, 111, 82, 0.85)',
                            color: 'var(--color-warm-ivory)',
                            fontSize: '0.65rem',
                            padding: '1px 5px',
                            borderRadius: '3px',
                            fontWeight: 600,
                          }}
                        >
                          {photo.mediaRow?.position !== undefined ? `Slot ${photo.mediaRow.position}` : 'New'}
                        </div>

                        {photo.status !== 'uploading' && photo.status !== 'compressing' && (
                          <button
                            type="button"
                            onClick={() => handleRemoveStagedPhoto(photo.id)}
                            title="Remove staged photo"
                            style={{
                              position: 'absolute',
                              top: '4px',
                              right: '4px',
                              background: 'rgba(23, 21, 19, 0.75)',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '50%',
                              width: '18px',
                              height: '18px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: 0,
                            }}
                          >
                            <X size={11} />
                          </button>
                        )}
                      </div>

                      {photo.status === 'error' && (
                        <div
                          style={{
                            padding: '0.35rem 0.45rem',
                            backgroundColor: '#fdeded',
                            fontSize: '0.68rem',
                            color: 'var(--color-error)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.25rem',
                          }}
                        >
                          <span style={{ lineHeight: 1.25 }} title={photo.error}>
                            {photo.error?.length > 45 ? `${photo.error.slice(0, 45)}...` : photo.error || 'Upload failed'}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRetrySinglePhoto(photo.id)}
                            disabled={isUploadingPhotos}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--color-terracotta)',
                              fontWeight: 600,
                              cursor: 'pointer',
                              padding: 0,
                              textAlign: 'left',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.2rem',
                            }}
                          >
                            <RefreshCw size={10} />
                            <span>Retry</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )
            )}
          </div>

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
              onClick={handleCloseModal}
              disabled={loading || isUploadingPhotos || !!removingMediaId}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || isUploadingPhotos || !!removingMediaId}
            >
              <Edit3 size={15} />
              <span>
                {loading
                  ? 'Saving Changes...'
                  : isUploadingPhotos
                  ? 'Uploading Photos...'
                  : 'Save Changes'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
