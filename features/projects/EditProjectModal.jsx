import React, { useState, useEffect } from 'react';
import { X, Edit3, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../frontend/lib/supabase';
import { useAuth } from '../../frontend/context/AuthContext';

export const EditProjectModal = ({ isOpen, project, onClose, onProjectUpdated }) => {
  const { user, profile } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (project) {
      setTitle(project.title || '');
      setDescription(project.description || '');
    }
  }, [project]);

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
