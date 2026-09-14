import React, { useState, useEffect } from 'react';
import { X, Edit3, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../frontend/lib/supabase';
import { useAuth } from '../../frontend/context/AuthContext';

const JOURNEY_STAGES = [
  'Learn',
  'Connect',
  'Build',
  'Share',
  'Discover',
  'Grow',
];

export const EditJourneyModal = ({ isOpen, entry, onClose, onEntryUpdated }) => {
  const { user } = useAuth();
  const [stage, setStage] = useState('');
  const [cleanTitle, setCleanTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (entry) {
      setDescription(entry.description || '');
      
      // Parse stage from title if present like "[Learn] Milestone title"
      const match = entry.title?.match(/^\[(.*?)\]\s*(.*)$/);
      if (match && JOURNEY_STAGES.includes(match[1])) {
        setStage(match[1]);
        setCleanTitle(match[2] || '');
      } else {
        setStage('Learn');
        setCleanTitle(entry.title || '');
      }
    }
  }, [entry]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !entry) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!cleanTitle.trim()) {
      setError('Please provide a milestone title.');
      return;
    }

    if (!description.trim()) {
      setError('Please provide milestone reflections or details.');
      return;
    }

    if (!user) {
      setError('You must be authenticated.');
      return;
    }

    if (user.id !== entry.user_id) {
      setError('Unauthorized: You can only edit your own journey milestones.');
      return;
    }

    if (!isSupabaseConfigured) {
      setError('Supabase is not configured.');
      return;
    }

    setLoading(true);

    try {
      const formattedTitle = stage ? `[${stage}] ${cleanTitle.trim()}` : cleanTitle.trim();

      const { data, error: updateError } = await supabase
        .from('journey')
        .update({
          title: formattedTitle,
          description: description.trim(),
        })
        .eq('id', entry.id)
        .eq('user_id', user.id) // Enforce user_id match
        .select()
        .single();

      if (updateError) throw updateError;

      setSuccess(true);
      setTimeout(() => {
        if (onEntryUpdated) onEntryUpdated(data);
        setSuccess(false);
        onClose();
      }, 500);
    } catch (err) {
      console.error('Error updating journey milestone:', err);
      setError(err.message || 'Failed to update milestone.');
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
      aria-labelledby="edit-journey-title"
    >
      <div className="modal-dialog">
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
            <span className="label-academic gold">Timeline Revision</span>
            <h3 id="edit-journey-title" style={{ marginTop: '0.2rem' }}>
              Revise Journey Milestone
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
            <span>Milestone updated in your journey timeline!</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Journey Phase</label>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.5rem',
                marginTop: '0.25rem',
              }}
            >
              {JOURNEY_STAGES.map((stg) => (
                <button
                  type="button"
                  key={stg}
                  onClick={() => setStage(stg)}
                  style={{
                    padding: '0.35rem 0.75rem',
                    fontSize: '0.8rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid',
                    borderColor: stage === stg ? 'var(--color-primary-dark)' : 'var(--border-subtle)',
                    backgroundColor: stage === stg ? 'var(--color-primary-dark)' : 'var(--color-white)',
                    color: stage === stg ? 'var(--color-warm-ivory)' : 'var(--text-secondary)',
                    fontWeight: stage === stg ? 600 : 500,
                    cursor: 'pointer',
                    transition: 'var(--transition-smooth)',
                  }}
                >
                  {stg}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="edit-journey-headline">
              Milestone Headline <span className="req">*</span>
            </label>
            <input
              id="edit-journey-headline"
              type="text"
              className="form-input"
              value={cleanTitle}
              onChange={(e) => setCleanTitle(e.target.value)}
              disabled={loading}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="edit-journey-desc">
              Academic Reflections & Evidence <span className="req">*</span>
            </label>
            <textarea
              id="edit-journey-desc"
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
              <span>{loading ? 'Saving...' : 'Save Milestone'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
