import React, { useState, useEffect } from 'react';
import { X, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const JOURNEY_STAGES = [
  'Learn',
  'Connect',
  'Build',
  'Share',
  'Discover',
  'Grow',
];

export const AddJourneyModal = ({ isOpen, onClose, onEntryAdded }) => {
  const { user } = useAuth();
  const [stage, setStage] = useState('Learn');
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
      setError('Please provide a milestone title.');
      return;
    }

    if (!description.trim()) {
      setError('Please provide reflections or details for this journey milestone.');
      return;
    }

    if (!user) {
      setError('You must be authenticated to add a journey milestone.');
      return;
    }

    if (!isSupabaseConfigured) {
      setError('Supabase is not configured yet. Add your credentials in .env to save journey milestones.');
      return;
    }

    setLoading(true);

    try {
      // Prepend stage tag if appropriate, or store in title
      const formattedTitle = stage ? `[${stage}] ${title.trim()}` : title.trim();

      const { data, error: insertError } = await supabase
        .from('journey')
        .insert([
          {
            user_id: user.id,
            title: formattedTitle,
            description: description.trim(),
          },
        ])
        .select()
        .single();

      if (insertError) throw insertError;

      setSuccess(true);
      setTimeout(() => {
        if (onEntryAdded) onEntryAdded(data);
        setTitle('');
        setDescription('');
        setSuccess(false);
        onClose();
      }, 600);
    } catch (err) {
      console.error('Error recording journey milestone:', err);
      setError(err.message || 'Failed to record milestone. Please try again.');
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
      aria-labelledby="add-journey-title"
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
            <span className="label-academic gold">Collegiate Timeline</span>
            <h3 id="add-journey-title" style={{ marginTop: '0.2rem' }}>
              Record Journey Milestone
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
            <span>Milestone immortalized in your journey timeline!</span>
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
            <label className="form-label" htmlFor="journey-title">
              Milestone Headline <span className="req">*</span>
            </label>
            <input
              id="journey-title"
              type="text"
              className="form-input"
              placeholder="e.g. Completed Departmental Peer Review for Distributed OS"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={loading}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="journey-desc">
              Academic Reflections & Evidence <span className="req">*</span>
            </label>
            <textarea
              id="journey-desc"
              className="form-textarea"
              placeholder="Detail what you learned, whom you collaborated with, or the tangible outcomes achieved..."
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
              <Sparkles size={16} />
              <span>{loading ? 'Recording...' : 'Add Milestone'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
