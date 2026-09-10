import React, { useState, useEffect } from 'react';
import { X, FolderPlus, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export const CreateProjectModal = ({ isOpen, onClose, onProjectCreated }) => {
  const { user, profile } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
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

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

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
      const { data, error: insertError } = await supabase
        .from('projects')
        .insert([
          {
            user_id: user.id,
            title: title.trim(),
            description: description.trim(),
          },
        ])
        .select('*, profiles:user_id(full_name, department, role, email)')
        .single();

      if (insertError) throw insertError;

      const projectWithProfile = {
        ...data,
        profiles: data?.profiles || {
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
