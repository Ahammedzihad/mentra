import React, { useState, useEffect } from 'react';
import { X, Trash2, AlertTriangle, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../frontend/lib/supabase';
import { useAuth } from '../../frontend/context/AuthContext';
import {
  cleanupProjectMediaBeforeDelete,
  checkProjectStorageStatus,
} from './projectMediaService';

export const DeleteConfirmModal = ({ isOpen, project, onClose, onProjectDeleted }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [photosAlreadyRemoved, setPhotosAlreadyRemoved] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Inspect storage status when modal opens to restore recovery state across page reloads/modal closes
  useEffect(() => {
    let isCancelled = false;

    const inspectStorage = async () => {
      if (!isOpen || !project || !isSupabaseConfigured) return;
      setError(null);

      try {
        const status = await checkProjectStorageStatus({
          supabaseClient: supabase,
          projectId: project.id,
        });

        if (!isCancelled) {
          // Do not label a project with no photos as "photos already removed".
          // Only true if storage is confirmed empty and project_media rows still exist.
          if (status.hadPhotosRemoved) {
            setPhotosAlreadyRemoved(true);
          } else {
            setPhotosAlreadyRemoved(false);
          }
        }
      } catch (err) {
        console.warn('Storage status check in DeleteConfirmModal:', err);
      }
    };

    inspectStorage();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, project]);

  if (!isOpen || !project) return null;

  const handleDelete = async () => {
    if (loading) return; // Prevent duplicate cleanup actions while one is running

    if (!user) {
      setError('You must be signed in.');
      return;
    }

    if (user.id !== project.user_id) {
      setError('Unauthorized: You can only delete projects you authored.');
      return;
    }

    if (!isSupabaseConfigured) {
      setError('Supabase is not configured.');
      return;
    }

    setLoading(true);
    setError(null);

    let cleanupResult = null;

    // 1. Enumerate and delete storage objects first, and confirm folder is empty.
    // If cleanup was already done previously, this rechecks the folder, cleans up any remaining objects, and confirms empty.
    try {
      cleanupResult = await cleanupProjectMediaBeforeDelete({
        supabaseClient: supabase,
        projectId: project.id,
        currentUserId: user.id,
      });

      if (cleanupResult?.hadPhotos) {
        setPhotosAlreadyRemoved(true);
      }
    } catch (cleanupErr) {
      console.error('Storage cleanup failed before project deletion:', cleanupErr);
      setError(cleanupErr.message || 'Storage cleanup failed. Project deletion stopped.');
      setLoading(false);
      return; // Stop and keep project row!
    }

    // 2. Immediately request deletion of the project row after verifying empty folder
    try {
      const { error: deleteErr } = await supabase
        .from('projects')
        .delete()
        .eq('id', project.id)
        .eq('user_id', user.id); // Strict ownership check

      if (deleteErr) throw deleteErr;

      // 3. Confirm that project row is absent via authenticated read-back.
      // A returned error: null alone is not proof of deletion (RLS could silently block write).
      const { data: readBackProject, error: readBackErr } = await supabase
        .from('projects')
        .select('id')
        .eq('id', project.id)
        .maybeSingle();

      if (readBackErr) {
        throw new Error(
          `Project deletion request sent, but verification read-back failed: ${readBackErr.message}. Project deletion is unconfirmed.`
        );
      }

      if (readBackProject !== null) {
        throw new Error(
          'Project deletion was not applied (the project record remains in database). Deletion unconfirmed.'
        );
      }

      // Confirmed absent! Report success and close dialog
      if (onProjectDeleted) onProjectDeleted(project.id);
      onClose();
    } catch (dbErr) {
      console.error('Error deleting project row:', dbErr);
      if (cleanupResult?.hadPhotos || photosAlreadyRemoved) {
        setPhotosAlreadyRemoved(true);
        setError(
          `Photos have already been removed from storage, but deleting the project record failed (${dbErr.message}). You can retry project deletion.`
        );
      } else {
        setError(
          `Failed to delete project record: ${dbErr.message}. You can retry project deletion.`
        );
      }
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
      aria-labelledby="delete-dialog-title"
    >
      <div className="modal-dialog" style={{ maxWidth: '480px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1rem',
            borderBottom: '1px solid var(--border-subtle)',
            paddingBottom: '0.85rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={20} style={{ color: 'var(--color-terracotta)' }} />
            <h3 id="delete-dialog-title" style={{ fontSize: '1.25rem' }}>
              Withdraw Project
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

        {photosAlreadyRemoved && (
          <div
            className="notice-box warning"
            style={{
              marginBottom: '1rem',
              backgroundColor: '#FFF8E1',
              borderColor: '#FFE082',
              color: '#5D4037',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.6rem 0.85rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
            }}
          >
            <CheckCircle2 size={18} style={{ color: '#2e7d32', flexShrink: 0 }} />
            <span>
              Storage photos have already been removed. Confirm deletion to recheck the folder and retry deleting the project record.
            </span>
          </div>
        )}

        <p style={{ fontSize: '0.925rem', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '1.25rem' }}>
          Are you certain you wish to withdraw <strong>&quot;{project.title}&quot;</strong> from the collegiate projects registry? This action will permanently remove this project record.
        </p>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.75rem',
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
            type="button"
            className="btn btn-terracotta"
            onClick={handleDelete}
            disabled={loading}
            style={{ backgroundColor: '#A23E30', borderColor: '#A23E30' }}
          >
            {photosAlreadyRemoved ? <RefreshCw size={15} /> : <Trash2 size={15} />}
            <span>
              {loading
                ? 'Deleting...'
                : photosAlreadyRemoved
                ? 'Retry Project Deletion'
                : 'Confirm Deletion'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
