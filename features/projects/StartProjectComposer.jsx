import React from 'react';
import { Image as ImageIcon, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * Mentra Phase 7 Step 7: Feed-level "Start a project" Composer
 *
 * Modeled after LinkedIn's "Start a post" box:
 * - Avatar of signed-in user on the left (initial-in-a-circle style, fallback 'M' for guest).
 * - Interactive input prompt pill ("Start a project...") that triggers manual project inauguration.
 * - "Photo" action button that opens the existing Create Project flow with the photo picker ready.
 * - "Create with AI" action button that opens the existing Phase 6 AI draft composer.
 * - Reuses existing Create Project flow without duplicating forms or logic.
 *
 * @param {Object} props
 * @param {Object|null} props.user
 * @param {Object|null} props.profile
 * @param {Function} props.onStartProject (mode: 'manual' | 'photo' | 'ai') => void
 */
export const StartProjectComposer = ({
  user,
  profile,
  onStartProject,
}) => {
  const navigate = useNavigate();
  const displayName = profile?.full_name?.trim() || user?.email?.split('@')[0] || 'Scholar';
  const avatarInitial = user ? (displayName[0]?.toUpperCase() || 'S') : 'M';

  const handleAction = (mode) => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (onStartProject) {
      onStartProject(mode);
    }
  };

  return (
    <div
      className="card-academic mentra-start-project-composer"
      style={{
        backgroundColor: 'var(--color-white, #FFFFFF)',
        border: '1px solid var(--border-subtle, #DED4C4)',
        borderRadius: 'var(--radius-md, 6px)',
        padding: '1.25rem 1.5rem',
        marginBottom: '1.5rem',
        boxShadow: 'var(--shadow-card, 0 2px 6px rgba(23, 21, 19, 0.04))',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* Top Row: User Avatar Circle + Clickable Prompt Pill */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.85rem',
          marginBottom: '0.85rem',
        }}
      >
        {/* User Avatar Circle (initial-in-a-circle style) */}
        <div
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            backgroundColor: 'var(--color-dark-surface, #211E1A)',
            color: 'var(--color-warm-ivory, #F5F0E8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-serif)',
            fontSize: '1.05rem',
            fontWeight: 600,
            flexShrink: 0,
            border: '1px solid var(--border-subtle, #DED4C4)',
          }}
          aria-hidden="true"
        >
          {avatarInitial}
        </div>

        {/* Clickable Pill that triggers Create Project flow */}
        <button
          type="button"
          onClick={() => handleAction('manual')}
          aria-label="Start an academic project"
          style={{
            flex: 1,
            textAlign: 'left',
            backgroundColor: 'var(--color-warm-ivory-light, #FAF7F2)',
            border: '1px solid var(--border-subtle, #DED4C4)',
            borderRadius: '24px',
            padding: '0.75rem 1.25rem',
            fontSize: '0.9rem',
            color: 'var(--text-muted, #847C73)',
            cursor: 'pointer',
            transition: 'var(--transition-smooth, all 0.2s ease)',
            fontFamily: 'inherit',
            outline: 'none',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-soft-beige-light, #EBE4D8)';
            e.currentTarget.style.borderColor = 'var(--border-strong, #BAAE9B)';
            e.currentTarget.style.color = 'var(--text-primary, #171513)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-warm-ivory-light, #FAF7F2)';
            e.currentTarget.style.borderColor = 'var(--border-subtle, #DED4C4)';
            e.currentTarget.style.color = 'var(--text-muted, #847C73)';
          }}
        >
          {user ? 'Start a project...' : 'Start a project... (Sign in to inaugurate)'}
        </button>
      </div>

      {/* Bottom Action Row: Photo & Create with AI */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTop: '1px solid var(--border-subtle, #DED4C4)',
          paddingTop: '0.65rem',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}
      >
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
          Publish scholarly endeavor to collegiate registry
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Photo Action: Opens Create Project flow with photo picker focused */}
          <button
            type="button"
            onClick={() => handleAction('photo')}
            className="btn-composer-action"
            title="Inaugurate project with photos ready"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.45rem 0.85rem',
              backgroundColor: 'transparent',
              border: '1px solid transparent',
              borderRadius: 'var(--radius-sm, 4px)',
              color: 'var(--text-secondary, #5A534C)',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'var(--transition-smooth, all 0.2s ease)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-terracotta-subtle, #F6ECE7)';
              e.currentTarget.style.color = 'var(--color-terracotta, #B86F52)';
              e.currentTarget.style.borderColor = 'rgba(184, 111, 82, 0.25)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--text-secondary, #5A534C)';
              e.currentTarget.style.borderColor = 'transparent';
            }}
          >
            <ImageIcon size={18} style={{ color: 'var(--color-terracotta, #B86F52)' }} aria-hidden="true" />
            <span>Photo</span>
          </button>

          {/* Create with AI Action: Opens existing Phase 6 AI draft composer */}
          <button
            type="button"
            onClick={() => handleAction('ai')}
            className="btn-composer-action"
            title="Draft hypothesis with Personal AI (Phase 6)"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.45rem 0.85rem',
              backgroundColor: 'var(--color-warm-gold-subtle, #F7F3EA)',
              border: '1px solid rgba(197, 164, 109, 0.4)',
              borderRadius: 'var(--radius-sm, 4px)',
              color: '#8C6A30',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'var(--transition-smooth, all 0.2s ease)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(197, 164, 109, 0.25)';
              e.currentTarget.style.borderColor = 'var(--color-warm-gold, #C5A46D)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-warm-gold-subtle, #F7F3EA)';
              e.currentTarget.style.borderColor = 'rgba(197, 164, 109, 0.4)';
            }}
          >
            <Sparkles size={16} style={{ color: 'var(--color-warm-gold, #C5A46D)' }} aria-hidden="true" />
            <span>Create with AI</span>
          </button>
        </div>
      </div>
    </div>
  );
};
