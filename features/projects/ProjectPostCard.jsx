import React, { useState, useRef, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../../frontend/lib/supabase';
import { ProjectPhotoGallery } from './ProjectPhotoGallery';
import { ProjectCommentsSection } from './ProjectCommentsSection';
import { VISIBILITY_OPTIONS } from './projectVisibilityOptions';
import {
  MoreHorizontal,
  Edit3,
  Trash2,
  Eye,
  ThumbsUp,
  MessageSquare,
  Globe,
  GraduationCap
} from 'lucide-react';

/**
 * Format timestamp into a compact relative time string (e.g., "1d", "3h", "2w", "1mo").
 *
 * @param {string|Date} dateString
 * @returns {string}
 */
function formatRelativeTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (Number.isNaN(diffInSeconds) || diffInSeconds < 0) return 'Just now';

  if (diffInSeconds < 60) return `${diffInSeconds}s`;
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d`;
  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) return `${diffInWeeks}w`;
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) return `${diffInMonths}mo`;
  const diffInYears = Math.floor(diffInDays / 365);
  return `${diffInYears}y`;
}

/**
 * Mentra Phase 7 Step 7: LinkedIn-Style Project Post Card
 *
 * Follows the agreed layout top-to-bottom:
 * 1. Header: Avatar (initial-in-a-circle), single name, relative time ("1d"), visibility icon & label.
 *    (Omitted: verified shield, headline, program, specialization, year, follow, degree).
 * 2. Owner menu: Three-dot menu at top right (Edit and Delete for owner only; non-owners see no menu).
 * 3. Text: Bold title, plain text description collapsed after ~3 lines with inline "...more" / "Show less".
 * 4. Tags: Small beige chips under text.
 * 5. Photos: Step 6 photo gallery and full-screen viewer directly under text.
 * 6. Counts row: Like count on left, comment count on right. Safe deferred presentation.
 * 7. Action bar: Exactly two buttons (Like and Comment). Presentation-ready without fake writes.
 * 8. Comment section mount point: Clean layout container for later comment section.
 */
export const ProjectPostCard = ({
  project,
  currentUserId,
  onOpenDetails,
  onEdit,
  onDelete,
  onLikeClick,
  onCommentClick,
  isLiked = false,
  onLikeToggle,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const menuRef = useRef(null);
  const commentsMountRef = useRef(null);

  // Like state management (Mentra Phase 7 Step 11)
  const rawLike = project?.likes_count ?? project?.project_likes?.[0]?.count;
  const initialLikeCount =
    rawLike !== undefined && Number.isFinite(Number(rawLike))
      ? Number(rawLike)
      : (project?.project_likes !== undefined ? 0 : null);

  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [internalIsLiked, setInternalIsLiked] = useState(Boolean(isLiked));
  const [isLiking, setIsLiking] = useState(false);
  const [likeError, setLikeError] = useState(null);
  const [showAuthNotice, setShowAuthNotice] = useState(false);

  useEffect(() => {
    setInternalIsLiked(Boolean(isLiked));
  }, [isLiked]);

  useEffect(() => {
    setLikeCount(initialLikeCount);
  }, [initialLikeCount]);

  // Comment count state management
  const rawComment = project?.comments_count ?? project?.comments?.[0]?.count;
  const initialCommentCount =
    rawComment !== undefined && Number.isFinite(Number(rawComment))
      ? Number(rawComment)
      : (project?.comments !== undefined ? 0 : null);
  const [liveCommentCount, setLiveCommentCount] = useState(initialCommentCount);

  useEffect(() => {
    setLiveCommentCount(initialCommentCount);
  }, [initialCommentCount]);

  const handleCountChange = useCallback((count) => {
    setLiveCommentCount(count);
  }, []);

  // Close dropdown on outside click or Escape
  useEffect(() => {
    if (!isMenuOpen) return;

    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsMenuOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen]);

  if (!project) return null;

  // Determine owner strictly using project.user_id
  const isOwner = Boolean(currentUserId && project.user_id && currentUserId === project.user_id);

  // Displayed Name from profiles.full_name with safe fallback
  const displayName = project.profiles?.full_name?.trim() || 'Collegiate Scholar';
  const avatarInitial = displayName[0]?.toUpperCase() || 'S';

  // Relative Time
  const relativeTime = formatRelativeTime(project.created_at);

  // Visibility Information
  const visibilityId = (project.visibility || 'college').toLowerCase();
  const visibilityOption =
    VISIBILITY_OPTIONS.find((opt) => opt.id === visibilityId) || {
      id: 'college',
      label: 'College',
      icon: GraduationCap,
    };
  const VisibilityIcon = visibilityOption.icon || Globe;

  // Description truncation calculation (~200 characters or > 3 lines)
  const descriptionText = project.description || '';
  const lines = descriptionText.split('\n');
  const isLongDescription = descriptionText.length > 200 || lines.length > 3;

  let displayedDescription = descriptionText;
  if (isLongDescription && !isExpanded) {
    // Truncate cleanly at word boundary
    const slicePoint = Math.min(200, descriptionText.indexOf('\n', 120) > 0 ? descriptionText.indexOf('\n', 120) : 200);
    displayedDescription = descriptionText.slice(0, slicePoint).trim();
  }

  // Like button click handler
  const handleLikeClick = async () => {
    setLikeError(null);
    setShowAuthNotice(false);

    if (onLikeClick) {
      try {
        onLikeClick(project.id);
      } catch {
        // Safe consumer notification
      }
    }

    // 1. Anonymous viewers receive an accessible sign-in prompt
    if (!currentUserId) {
      setShowAuthNotice(true);
      return;
    }

    // 2. Prevent concurrent requests / rapid double clicks while saving
    if (isLiking) return;

    if (!isSupabaseConfigured) {
      setLikeError('Database connection unavailable.');
      return;
    }

    setIsLiking(true);
    const prevLiked = internalIsLiked;
    const prevCount = likeCount;

    try {
      if (prevLiked) {
        // UNLIKE: Delete user's like
        const { error: deleteErr } = await supabase
          .from('project_likes')
          .delete()
          .eq('project_id', project.id)
          .eq('user_id', currentUserId);

        if (deleteErr) {
          console.warn('Failed to remove like:', deleteErr);
          setLikeError('Unable to update like status. Please try again.');
          setIsLiking(false);
          return;
        }

        // Show inactive state only after delete succeeds
        setInternalIsLiked(false);

        // Reconcile count from authoritative data
        const { count: freshCount, error: countErr } = await supabase
          .from('project_likes')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', project.id);

        let finalCount;
        if (!countErr && Number.isFinite(freshCount)) {
          finalCount = freshCount;
        } else {
          finalCount = prevCount !== null ? Math.max(0, prevCount - 1) : 0;
        }
        setLikeCount(finalCount);
        if (onLikeToggle) {
          onLikeToggle(project.id, false, finalCount);
        }
      } else {
        // LIKE: Insert user's like
        const { error: insertErr } = await supabase
          .from('project_likes')
          .insert({
            project_id: project.id,
            user_id: currentUserId,
          });

        if (insertErr) {
          // Check for duplicate constraint violation
          const isDuplicate =
            insertErr.code === '23505' ||
            (typeof insertErr.message === 'string' &&
              (insertErr.message.toLowerCase().includes('duplicate') ||
                insertErr.message.toLowerCase().includes('unique')));

          if (isDuplicate) {
            // Already liked: reconcile state without creating duplicate rows
            setInternalIsLiked(true);
            const { count: freshCount } = await supabase
              .from('project_likes')
              .select('*', { count: 'exact', head: true })
              .eq('project_id', project.id);
            if (Number.isFinite(freshCount)) {
              setLikeCount(freshCount);
              if (onLikeToggle) onLikeToggle(project.id, true, freshCount);
            }
          } else {
            console.warn('Failed to insert like:', insertErr);
            setLikeError(
              insertErr.code === '42501'
                ? 'You do not have permission to like this project.'
                : 'Unable to like project at this time. Please try again.'
            );
          }
          setIsLiking(false);
          return;
        }

        // Show active state only after write succeeds
        setInternalIsLiked(true);

        // Reconcile count from authoritative data
        const { count: freshCount, error: countErr } = await supabase
          .from('project_likes')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', project.id);

        let finalCount;
        if (!countErr && Number.isFinite(freshCount)) {
          finalCount = freshCount;
        } else {
          finalCount = prevCount !== null ? prevCount + 1 : 1;
        }
        setLikeCount(finalCount);
        if (onLikeToggle) {
          onLikeToggle(project.id, true, finalCount);
        }
      }
    } catch (err) {
      console.warn('Unexpected error in like toggle:', err);
      // Rollback to previous state
      setInternalIsLiked(prevLiked);
      setLikeCount(prevCount);
      setLikeError('An unexpected network error occurred.');
    } finally {
      setIsLiking(false);
    }
  };

  const handleCommentButtonClick = () => {
    if (onCommentClick) {
      onCommentClick(project.id);
    }
    setIsCommentsOpen((prev) => {
      const next = !prev;
      if (next) {
        setTimeout(() => {
          commentsMountRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 80);
      }
      return next;
    });
  };

  return (
    <article
      className="card-academic mentra-post-card"
      style={{
        backgroundColor: 'var(--color-white, #FFFFFF)',
        border: '1px solid var(--border-subtle, #DED4C4)',
        borderRadius: 'var(--radius-md, 6px)',
        padding: '1.25rem 1.5rem',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        boxShadow: 'var(--shadow-card, 0 2px 6px rgba(23, 21, 19, 0.04))',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* =========================================================================
          1. HEADER & 2. OWNER MENU
          ========================================================================= */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '1rem',
          marginBottom: '0.85rem',
        }}
      >
        {/* Left: Avatar & Metadata */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Circular Avatar (initial-in-a-circle style) */}
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-dark-surface, #211E1A)',
              color: 'var(--color-warm-ivory, #F5F0E8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--font-serif)',
              fontSize: '1rem',
              fontWeight: 600,
              flexShrink: 0,
              border: '1px solid var(--border-subtle, #DED4C4)',
            }}
            aria-hidden="true"
          >
            {avatarInitial}
          </div>

          {/* Name & Time / Visibility Row */}
          <div>
            <div
              style={{
                fontSize: '0.95rem',
                fontWeight: 600,
                color: 'var(--color-primary-dark, #171513)',
                lineHeight: 1.25,
                letterSpacing: '-0.01em',
              }}
            >
              {displayName}
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.75rem',
                color: 'var(--text-muted, #847C73)',
                marginTop: '0.15rem',
              }}
            >
              <span>{relativeTime || 'Recently'}</span>
              <span aria-hidden="true">•</span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  color: 'var(--text-secondary, #5A534C)',
                }}
                title={`Visibility: ${visibilityOption.label}`}
              >
                <VisibilityIcon size={11} aria-hidden="true" />
                <span>{visibilityOption.label}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Right: Three-Dot Menu (Owner Only) */}
        {isOwner && (
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              aria-label="Project post options"
              aria-expanded={isMenuOpen}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted, #847C73)',
                cursor: 'pointer',
                padding: '0.4rem',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'var(--transition-smooth, all 0.2s ease)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-soft-beige-light, #EBE4D8)';
                e.currentTarget.style.color = 'var(--color-primary-dark, #171513)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--text-muted, #847C73)';
              }}
            >
              <MoreHorizontal size={18} />
            </button>

            {/* Dropdown Menu */}
            {isMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '100%',
                  marginTop: '0.25rem',
                  backgroundColor: 'var(--color-white, #FFFFFF)',
                  border: '1px solid var(--border-subtle, #DED4C4)',
                  borderRadius: 'var(--radius-sm, 4px)',
                  boxShadow: '0 4px 16px rgba(23, 21, 19, 0.12)',
                  minWidth: '150px',
                  zIndex: 20,
                  overflow: 'hidden',
                }}
              >
                {onOpenDetails && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onOpenDetails(project);
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.6rem 0.85rem',
                      fontSize: '0.8rem',
                      color: 'var(--text-primary, #171513)',
                      background: 'transparent',
                      border: 'none',
                      borderBottom: '1px solid var(--border-subtle, #DED4C4)',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-warm-ivory-light)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <Eye size={14} />
                    <span>View Details</span>
                  </button>
                )}

                {onEdit && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onEdit(project);
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.6rem 0.85rem',
                      fontSize: '0.8rem',
                      color: 'var(--text-primary, #171513)',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-warm-ivory-light)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <Edit3 size={14} />
                    <span>Edit Project</span>
                  </button>
                )}

                {onDelete && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onDelete(project);
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.6rem 0.85rem',
                      fontSize: '0.8rem',
                      color: '#9E382A',
                      background: 'transparent',
                      border: 'none',
                      borderTop: '1px solid var(--border-subtle, #DED4C4)',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FDF2F0')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <Trash2 size={14} />
                    <span>Delete Project</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* =========================================================================
          3. TEXT: BOLD TITLE & EXPANDABLE DESCRIPTION
          ========================================================================= */}
      <div style={{ marginBottom: '0.85rem' }}>
        {/* Project Title in Bold */}
        <h2
          className="font-serif"
          onClick={() => onOpenDetails?.(project)}
          style={{
            fontSize: '1.25rem',
            fontWeight: 600,
            lineHeight: 1.35,
            color: 'var(--color-primary-dark, #171513)',
            marginBottom: '0.45rem',
            cursor: onOpenDetails ? 'pointer' : 'default',
            overflowWrap: 'anywhere',
            wordBreak: 'break-word',
          }}
        >
          {project.title}
        </h2>

        {/* Description: Plain text with inline ...more / Show less */}
        <div
          style={{
            fontSize: '0.925rem',
            lineHeight: 1.6,
            color: 'var(--text-secondary, #5A534C)',
            whiteSpace: 'pre-line',
            overflowWrap: 'anywhere',
            wordBreak: 'break-word',
          }}
        >
          {displayedDescription}
          {isLongDescription && !isExpanded && (
            <button
              type="button"
              onClick={() => setIsExpanded(true)}
              style={{
                background: 'none',
                border: 'none',
                padding: '0 0 0 0.35rem',
                color: 'var(--text-muted, #847C73)',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontFamily: 'inherit',
                display: 'inline',
              }}
            >
              ...more
            </button>
          )}
          {isLongDescription && isExpanded && (
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              style={{
                background: 'none',
                border: 'none',
                padding: '0.2rem 0 0 0',
                color: 'var(--color-terracotta, #B86F52)',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.825rem',
                fontFamily: 'inherit',
                display: 'block',
              }}
            >
              Show less
            </button>
          )}
        </div>
      </div>

      {/* =========================================================================
          4. TAGS (Phase 4 Chips)
          ========================================================================= */}
      {Array.isArray(project.tags) && project.tags.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.4rem',
            marginBottom: '0.75rem',
          }}
        >
          {project.tags.slice(0, 3).map((tag, idx) => (
            <span
              key={`${tag}-${idx}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                backgroundColor: 'var(--color-soft-beige-light, #EBE4D8)',
                border: '1px solid var(--border-subtle, #DED4C4)',
                borderRadius: 'var(--radius-sm, 4px)',
                color: 'var(--color-primary-dark, #171513)',
                fontSize: '0.78rem',
                fontWeight: 500,
                padding: '0.2rem 0.55rem',
                lineHeight: 1.4,
              }}
            >
              {tag}
            </span>
          ))}
          {project.tags.length > 3 && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                backgroundColor: 'var(--color-soft-beige-light, #EBE4D8)',
                border: '1px solid var(--border-subtle, #DED4C4)',
                borderRadius: 'var(--radius-sm, 4px)',
                color: 'var(--text-secondary, #5A534C)',
                fontSize: '0.78rem',
                fontWeight: 500,
                padding: '0.2rem 0.55rem',
                lineHeight: 1.4,
              }}
            >
              +{project.tags.length - 3} more
            </span>
          )}
        </div>
      )}

      {/* =========================================================================
          5. PHOTOS: STEP 6 REUSABLE GALLERY & FULL-SCREEN VIEWER
          ========================================================================= */}
      <ProjectPhotoGallery projectId={project.id} />

      {/* =========================================================================
          6. COUNTS ROW: LIKES & COMMENTS
          ========================================================================= */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.8125rem',
          color: 'var(--text-secondary, #5A534C)',
          borderTop: '1px solid var(--border-subtle, #DED4C4)',
          paddingTop: '0.65rem',
          paddingBottom: '0.45rem',
          marginTop: '0.25rem',
        }}
      >
        <span title={likeCount === null ? 'Like count temporarily unavailable' : 'Project likes'}>
          {likeCount === null ? '— likes' : `${likeCount} ${likeCount === 1 ? 'like' : 'likes'}`}
        </span>
        <span title={liveCommentCount === null ? 'Comment count temporarily unavailable' : 'Comment count including replies'}>
          {liveCommentCount === null ? '— comments' : `${liveCommentCount} ${liveCommentCount === 1 ? 'comment' : 'comments'}`}
        </span>
      </div>

      {/* =========================================================================
          7. ACTION BAR: LIKE & COMMENT
          ========================================================================= */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          borderTop: '1px solid var(--border-subtle, #DED4C4)',
          paddingTop: '0.35rem',
          marginTop: '0.15rem',
        }}
      >
        {/* Like Button */}
        <button
          type="button"
          onClick={handleLikeClick}
          disabled={isLiking}
          aria-pressed={internalIsLiked}
          aria-label={internalIsLiked ? 'Unlike project' : 'Like project'}
          title={internalIsLiked ? 'Unlike project' : 'Like project'}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.45rem',
            padding: '0.55rem 0.75rem',
            background: 'transparent',
            border: 'none',
            borderRadius: 'var(--radius-sm, 4px)',
            color: internalIsLiked ? 'var(--color-terracotta, #B86F52)' : 'var(--text-secondary, #5A534C)',
            fontWeight: internalIsLiked ? 600 : 500,
            fontSize: '0.875rem',
            cursor: isLiking ? 'wait' : 'pointer',
            opacity: isLiking ? 0.7 : 1,
            transition: 'var(--transition-smooth, all 0.2s ease)',
          }}
          onMouseEnter={(e) => {
            if (!isLiking) {
              e.currentTarget.style.backgroundColor = 'var(--color-warm-ivory-light, #FAF7F2)';
              e.currentTarget.style.color = 'var(--color-primary-dark, #171513)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isLiking) {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = internalIsLiked ? 'var(--color-terracotta, #B86F52)' : 'var(--text-secondary, #5A534C)';
            }
          }}
        >
          <ThumbsUp size={16} fill={internalIsLiked ? 'currentColor' : 'none'} aria-hidden="true" />
          <span>Like</span>
        </button>

        {/* Comment Button */}
        <button
          type="button"
          onClick={handleCommentButtonClick}
          aria-expanded={isCommentsOpen}
          aria-controls={`project-comments-mount-${project.id}`}
          title="View and contribute to project discourse"
          aria-label="Comment on project"
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.45rem',
            padding: '0.55rem 0.75rem',
            background: 'transparent',
            border: 'none',
            borderRadius: 'var(--radius-sm, 4px)',
            color: isCommentsOpen ? 'var(--color-primary-dark, #171513)' : 'var(--text-secondary, #5A534C)',
            fontWeight: isCommentsOpen ? 600 : 500,
            fontSize: '0.875rem',
            cursor: 'pointer',
            transition: 'var(--transition-smooth, all 0.2s ease)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-warm-ivory-light, #FAF7F2)';
            e.currentTarget.style.color = 'var(--color-primary-dark, #171513)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = isCommentsOpen ? 'var(--color-primary-dark, #171513)' : 'var(--text-secondary, #5A534C)';
          }}
        >
          <MessageSquare size={16} aria-hidden="true" />
          <span>Comment</span>
        </button>
      </div>

      {/* Anonymous Sign-in Prompt */}
      {showAuthNotice && (
        <div
          role="alert"
          style={{
            marginTop: '0.5rem',
            padding: '0.45rem 0.75rem',
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem',
            backgroundColor: 'var(--color-warm-ivory-light, #FAF7F2)',
            border: '1px solid var(--border-subtle, #DED4C4)',
            borderRadius: 'var(--radius-sm, 4px)',
            color: 'var(--color-primary-dark, #171513)',
          }}
        >
          <span>
            Please <a href="/login" style={{ color: 'var(--color-terracotta, #B86F52)', fontWeight: 600, textDecoration: 'underline' }}>sign in</a> with your collegiate account to like projects.
          </span>
          <button
            type="button"
            onClick={() => setShowAuthNotice(false)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted, #847C73)',
              fontSize: '1rem',
              lineHeight: 1,
              padding: '0 0.2rem',
            }}
            aria-label="Dismiss notice"
          >
            ×
          </button>
        </div>
      )}

      {/* Like Error Notification */}
      {likeError && (
        <div
          role="alert"
          style={{
            marginTop: '0.5rem',
            padding: '0.45rem 0.75rem',
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem',
            backgroundColor: '#FFEBEE',
            border: '1px solid #FFCDD2',
            borderRadius: 'var(--radius-sm, 4px)',
            color: '#C62828',
          }}
        >
          <span>{likeError}</span>
          <button
            type="button"
            onClick={() => setLikeError(null)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#C62828',
              fontSize: '1rem',
              lineHeight: 1,
              padding: '0 0.2rem',
            }}
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      {/* =========================================================================
          8. COMMENT SECTION MOUNT POINT
          ========================================================================= */}
      <div
        id={`project-comments-mount-${project.id}`}
        ref={commentsMountRef}
        className="project-comments-mount"
      >
        <ProjectCommentsSection
          project={project}
          projectId={project.id}
          projectOwnerId={project.user_id}
          currentUser={currentUserId ? { id: currentUserId } : undefined}
          isOpen={isCommentsOpen}
          enabled={isCommentsOpen}
          onCountChange={handleCountChange}
        />
      </div>
    </article>
  );
};

export default ProjectPostCard;

