import React, { useState, useRef, useEffect, useCallback } from 'react';
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
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const menuRef = useRef(null);
  const commentsMountRef = useRef(null);

  const rawComment = project?.comments_count ?? project?.comments?.[0]?.count ?? 0;
  const initialCommentCount = Number.isFinite(Number(rawComment)) ? Number(rawComment) : 0;
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

  // Safe counts
  const rawLike = project.likes_count ?? project.project_likes?.[0]?.count ?? 0;
  const likeCount = Number.isFinite(Number(rawLike)) ? Number(rawLike) : 0;

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
          6. COUNTS ROW: LIKES & COMMENTS (PRESENTATION-READY DEFERRED STATE)
          ========================================================================= */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.78rem',
          color: 'var(--text-muted, #847C73)',
          borderTop: '1px solid var(--border-subtle, #DED4C4)',
          paddingTop: '0.65rem',
          paddingBottom: '0.45rem',
          marginTop: '0.25rem',
        }}
      >
        <span title="Project likes (activates in Step 11)">
          {likeCount} {likeCount === 1 ? 'like' : 'likes'}
        </span>
        <span title="Comment count including replies">
          {liveCommentCount} {liveCommentCount === 1 ? 'comment' : 'comments'}
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
          onClick={() => {
            if (onLikeClick) {
              onLikeClick(project.id);
            }
          }}
          title="Project likes arrive in Step 11"
          aria-label="Like project (available in upcoming update)"
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
            color: isLiked ? 'var(--color-terracotta, #B86F52)' : 'var(--text-secondary, #5A534C)',
            fontWeight: isLiked ? 600 : 500,
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
            e.currentTarget.style.color = isLiked ? 'var(--color-terracotta, #B86F52)' : 'var(--text-secondary, #5A534C)';
          }}
        >
          <ThumbsUp size={16} fill={isLiked ? 'currentColor' : 'none'} aria-hidden="true" />
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

