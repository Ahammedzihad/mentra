import React, { useState, useEffect } from 'react';
import { X, Trash2, AlertTriangle, AlertCircle } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../frontend/lib/supabase';
import { useAuth } from '../../frontend/context/AuthContext';

export const DeleteConfirmModal = ({ isOpen, project, onClose, onProjectDeleted }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !project) return null;

  const handleDelete = async () => {
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

    try {
      const { error: deleteErr } = await supabase
        .from('projects')
        .delete()
        .eq('id', project.id)
        .eq('user_id', user.id); // Strict check

      if (deleteErr) throw deleteErr;

      if (onProjectDeleted) onProjectDeleted(project.id);
      onClose();
    } catch (err) {
      console.error('Error deleting project:', err);
      setError(err.message || 'Failed to delete project.');
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

        <p style={{ fontSize: '0.925rem', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '1.25rem' }}>
          Are you certain you wish to withdraw <strong>"{project.title}"</strong> from the collegiate projects registry? This action will permanently remove this project record.
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
            <Trash2 size={15} />
            <span>{loading ? 'Deleting...' : 'Confirm Deletion'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
