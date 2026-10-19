import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../../frontend/lib/supabase';
import { useAuth } from '../../frontend/context/AuthContext';

/**
 * Format timestamp into a compact relative time string (e.g., "1d", "3h", "2w", "1mo").
 * Defined locally to avoid circular dependencies with ProjectPostCard.
 */
function formatRelativeTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return `${Math.max(1, diffInSeconds)}s`;
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m`;
  const diffInHours = Math.floor(diffInSeconds / 60);
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
 * Error boundary that isolates the comments section so any unexpected
 * comment rendering error cannot crash the surrounding project card or feed.
 */
export class CommentsErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.warn('ProjectCommentsSection error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="notice-box error"
          style={{
            margin: '0.75rem 0',
            fontSize: '0.825rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem',
          }}
        >
          <span>Unable to display project discourse at this time.</span>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
import {
  MessageSquare,
  CornerDownRight,
  Pin,
  Trash2,
  Flag,
  Send,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';

/**
 * Mentra Phase 7 Step 9: Delete Comment Confirmation Modal
 * Reuses Mentra's confirmation pattern and explains cascade behavior.
 */
const DeleteCommentModal = ({ isOpen, comment, isTopLevel, onClose, onConfirm, isDeleting, error }) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isDeleting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, isDeleting, onClose]);

  if (!isOpen || !comment) return null;

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDeleting) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-comment-dialog-title"
    >
      <div className="modal-dialog" style={{ maxWidth: '440px', padding: '1.75rem' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1rem',
            borderBottom: '1px solid var(--border-subtle, #DED4C4)',
            paddingBottom: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={18} style={{ color: 'var(--color-terracotta, #B86F52)' }} aria-hidden="true" />
            <h3 id="delete-comment-dialog-title" style={{ fontSize: '1.15rem', margin: 0 }}>
              {isTopLevel ? 'Delete Comment' : 'Delete Reply'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            aria-label="Close deletion dialog"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: isDeleting ? 'not-allowed' : 'pointer',
              color: 'var(--text-muted, #847C73)',
              padding: '0.25rem',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="notice-box error" style={{ marginBottom: '1rem' }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <p style={{ fontSize: '0.885rem', color: 'var(--text-secondary, #5A534C)', lineHeight: '1.6', marginBottom: '0.75rem' }}>
          {isTopLevel ? (
            <>
              Are you certain you wish to delete this comment? <strong>Deleting this top-level comment will also permanently remove all of its replies through the database cascade.</strong>
            </>
          ) : (
            <>
              Are you certain you wish to delete this reply? This action cannot be undone.
            </>
          )}
        </p>

        {comment.text && (
          <div
            style={{
              padding: '0.65rem 0.85rem',
              backgroundColor: 'var(--color-warm-ivory-light, #FAF7F2)',
              border: '1px solid var(--border-subtle, #DED4C4)',
              borderRadius: 'var(--radius-sm, 4px)',
              fontStyle: 'italic',
              fontSize: '0.825rem',
              color: 'var(--text-secondary, #5A534C)',
              marginBottom: '1.25rem',
              overflowWrap: 'anywhere',
              wordBreak: 'break-word',
              maxHeight: '100px',
              overflowY: 'auto',
            }}
          >
            &ldquo;{comment.text}&rdquo;
          </div>
        )}

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.65rem',
            borderTop: '1px solid var(--border-subtle, #DED4C4)',
            paddingTop: '1rem',
          }}
        >
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-terracotta btn-sm"
            onClick={onConfirm}
            disabled={isDeleting}
            style={{ backgroundColor: '#A23E30', borderColor: '#A23E30' }}
          >
            {isDeleting ? <Loader2 size={13} className="spin" aria-hidden="true" /> : <Trash2 size={13} aria-hidden="true" />}
            <span>{isDeleting ? 'Deleting...' : 'Confirm Deletion'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Mentra Phase 7 Step 9: Report Comment Modal
 * Enforces authenticated reporter, optional reason <= 300 chars, no client snapshot,
 * no select on insert, handles unique constraint duplicates gracefully.
 */
const ReportCommentModal = ({ isOpen, comment, onClose }) => {
  const { user } = useAuth();
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'duplicate' | 'error', message: string }
  const inputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 50);

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen || !comment) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      setFeedback({ type: 'error', message: 'You must be signed in to submit a report.' });
      return;
    }
    if (isSubmitting) return;

    const trimmedReason = reason.trim();
    if (trimmedReason.length > 300) {
      setFeedback({ type: 'error', message: 'Report reason cannot exceed 300 characters.' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      // Direct INSERT without calling .select()
      const { error: insertErr } = await supabase
        .from('comment_reports')
        .insert({
          comment_id: comment.id,
          reporter_id: user.id,
          reason: trimmedReason || null,
        });

      if (insertErr) {
        // Check for unique constraint duplicate violation
        const isDuplicate =
          insertErr.code === '23505' ||
          (typeof insertErr.message === 'string' &&
            (insertErr.message.toLowerCase().includes('duplicate') ||
              insertErr.message.toLowerCase().includes('unique')));

        if (isDuplicate) {
          setFeedback({
            type: 'duplicate',
            message: 'You have already submitted a report for this comment.',
          });
        } else {
          // Do not expose database error details to end users
          setFeedback({
            type: 'error',
            message: 'Unable to submit report at this time. Please try again later.',
          });
        }
        return;
      }

      // Successful insertion (error === null)
      setFeedback({
        type: 'success',
        message: 'Report submitted. Thank you for maintaining collegiate academic integrity.',
      });
      setTimeout(() => {
        onClose();
      }, 1600);
    } catch {
      setFeedback({
        type: 'error',
        message: 'Unable to submit report at this time. Please try again later.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-dialog-title"
    >
      <div className="modal-dialog" style={{ maxWidth: '440px', padding: '1.75rem' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1rem',
            borderBottom: '1px solid var(--border-subtle, #DED4C4)',
            paddingBottom: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Flag size={18} style={{ color: 'var(--color-terracotta, #B86F52)' }} aria-hidden="true" />
            <h3 id="report-dialog-title" style={{ fontSize: '1.15rem', margin: 0 }}>
              Report Comment
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close report dialog"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              color: 'var(--text-muted, #847C73)',
              padding: '0.25rem',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {feedback && (
          <div
            className={`notice-box ${feedback.type === 'success' ? 'success' : feedback.type === 'duplicate' ? 'warning' : 'error'}`}
            style={{ marginBottom: '1rem' }}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 size={16} style={{ flexShrink: 0 }} aria-hidden="true" />
            ) : (
              <AlertCircle size={16} style={{ flexShrink: 0 }} aria-hidden="true" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '0.85rem' }}>
            <label
              htmlFor={`report-reason-${comment.id}`}
              className="form-label"
              style={{ fontSize: '0.825rem', display: 'block', marginBottom: '0.35rem' }}
            >
              Reason for Report (optional, max 300 characters)
            </label>
            <textarea
              id={`report-reason-${comment.id}`}
              ref={inputRef}
              rows={3}
              maxLength={300}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe the policy violation, academic misconduct, or offensive content..."
              disabled={isSubmitting || feedback?.type === 'success'}
              className="form-textarea"
              style={{
                width: '100%',
                fontSize: '0.875rem',
                minHeight: '80px',
                padding: '0.55rem 0.75rem',
              }}
            />
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                fontSize: '0.72rem',
                color: 'var(--text-muted, #847C73)',
                marginTop: '0.25rem',
              }}
            >
              <span>{reason.length} / 300</span>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.65rem',
              borderTop: '1px solid var(--border-subtle, #DED4C4)',
              paddingTop: '1rem',
            }}
          >
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-terracotta btn-sm"
              disabled={isSubmitting || feedback?.type === 'success'}
            >
              {isSubmitting && <Loader2 size={13} className="spin" aria-hidden="true" />}
              <span>{isSubmitting ? 'Submitting...' : 'Submit Report'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/**
 * Mentra Phase 7 Step 9: Reusable Project Comments Section
 *
 * Implements:
 * - Top-level comments newest first; pinned comment always at top with visible badge.
 * - Replies grouped under top-level parent; sorted oldest first.
 * - Plain text only (no HTML/Markdown execution).
 * - Mentra initial-in-a-circle avatar & profile display with fallbacks.
 * - Relative timestamps using formatRelativeTime.
 * - 1-1000 char limits on top-level comments and replies.
 * - Owner-only pinning using set_pinned_comment RPC with verified read-back.
 * - Author / project-owner deletion with cascade explanation and read-back verification.
 * - Reporting with optional <=300 char reason, no client snapshot, handling duplicate constraints.
 * - Accessible labels, focus restoration, keyboard navigation.
 */
const ProjectCommentsSectionContent = ({
  projectId: propProjectId,
  projectOwnerId: propOwnerId,
  project: propProject,
  currentUser: propCurrentUser,
  isOpen = true,
  enabled = true,
  onCountChange,
}) => {
  const { user: authUser } = useAuth();
  const currentUser = propCurrentUser || authUser;
  const user = currentUser;

  const project = propProject || (propProjectId ? { id: propProjectId, user_id: propOwnerId } : null);
  const projectId = project?.id || propProjectId;
  const projectOwnerId = project?.user_id || propOwnerId;

  const isProjectOwner = Boolean(
    currentUser?.id && project?.user_id && currentUser.id === project.user_id
  );

  const isSectionActive = Boolean(isOpen && enabled && projectId);

  // Comments state
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // Top-level comment creation state
  const [newCommentText, setNewCommentText] = useState('');
  const [isSubmittingTopLevel, setIsSubmittingTopLevel] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Inline reply state
  const [activeReplyCommentId, setActiveReplyCommentId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [replyError, setReplyError] = useState(null);

  // Pinning state
  const [pinningCommentId, setPinningCommentId] = useState(null);
  const [pinError, setPinError] = useState(null);

  // Deletion modal state
  const [deletingComment, setDeletingComment] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  // Reporting modal state
  const [reportingComment, setReportingComment] = useState(null);

  // Refs for focus management
  const replyInputRef = useRef(null);
  const replyButtonRefs = useRef({});

  // Stable reference to onCountChange callback to avoid refetch loops
  const onCountChangeRef = useRef(onCountChange);
  useEffect(() => {
    onCountChangeRef.current = onCountChange;
  }, [onCountChange]);

  // Load comments with one project-scoped query
  const fetchComments = useCallback(async () => {
    if (!projectId || !isSupabaseConfigured) {
      setComments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setFetchError(null);

    try {
      // Primary project-scoped query joining author profile
      const { data, error } = await supabase
        .from('comments')
        .select('id, project_id, author_id, parent_comment_id, text, is_pinned, created_at, profiles:author_id(id, full_name, department, role, is_verified)')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (error) {
        // Check if error is due to missing foreign key relationship in PostgREST
        if (error.code === 'PGRST200') {
          // Fallback: Query raw comments, then resolve profiles in one query
          const { data: rawComments, error: rawErr } = await supabase
            .from('comments')
            .select('id, project_id, author_id, parent_comment_id, text, is_pinned, created_at')
            .eq('project_id', projectId)
            .order('created_at', { ascending: true });

          if (rawErr) throw rawErr;

          const commentList = rawComments || [];
          const authorIds = [...new Set(commentList.map((c) => c.author_id).filter(Boolean))];

          let profileMap = new Map();
          if (authorIds.length > 0) {
            const { data: profData } = await supabase
              .from('profiles')
              .select('id, full_name, department, role, is_verified')
              .in('id', authorIds);
            if (profData) {
              profileMap = new Map(profData.map((p) => [p.id, p]));
            }
          }

          const enriched = commentList.map((c) => ({
            ...c,
            profiles: profileMap.get(c.author_id) || null,
          }));

          setComments(enriched);
          if (onCountChangeRef.current) onCountChangeRef.current(enriched.length);
          return;
        }

        // Check if unauthenticated error
        if (error.code === '42501' && !user) {
          // Anonymous viewers cannot query comments under RLS
          setComments([]);
          return;
        }

        throw error;
      }

      const list = data || [];
      setComments(list);
      if (onCountChangeRef.current) onCountChangeRef.current(list.length);
    } catch (err) {
      console.warn('Error loading comments:', err);
      setFetchError('Unable to load collegiate discourse. Please retry.');
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [projectId, user]);

  useEffect(() => {
    if (isSectionActive) {
      fetchComments();
    }
  }, [isSectionActive, fetchComments]);

  // Focus the reply input when opened
  useEffect(() => {
    if (activeReplyCommentId && replyInputRef.current) {
      replyInputRef.current.focus();
    }
  }, [activeReplyCommentId]);

  // Group comments in memory
  // Top-level comments have parent_comment_id = null
  const topLevelComments = comments.filter((c) => c.parent_comment_id === null);

  // Group replies by parent_comment_id; strictly never render replies as children of another reply
  const topLevelIds = new Set(topLevelComments.map((c) => c.id));
  const repliesByParent = {};
  for (const c of comments) {
    if (c.parent_comment_id !== null && topLevelIds.has(c.parent_comment_id)) {
      if (!repliesByParent[c.parent_comment_id]) {
        repliesByParent[c.parent_comment_id] = [];
      }
      repliesByParent[c.parent_comment_id].push(c);
    }
  }

  // Sort top-level comments:
  // - Pinned comment at the top
  // - Then newest first
  const pinnedTopLevel = topLevelComments.filter((c) => Boolean(c.is_pinned));
  const unpinnedTopLevel = topLevelComments.filter((c) => !c.is_pinned);
  unpinnedTopLevel.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const sortedTopLevel = [...pinnedTopLevel, ...unpinnedTopLevel];

  // =========================================================================
  // ACTIONS: POST TOP-LEVEL COMMENT
  // =========================================================================
  const handleSubmitTopLevel = async (e) => {
    e.preventDefault();
    if (!user) return;

    const trimmed = newCommentText.trim();
    if (trimmed.length === 0 || trimmed.length > 1000) return;
    if (isSubmittingTopLevel) return;

    setIsSubmittingTopLevel(true);
    setSubmitError(null);

    try {
      const { error } = await supabase
        .from('comments')
        .insert({
          project_id: projectId,
          author_id: user.id,
          parent_comment_id: null,
          is_pinned: false,
          text: trimmed,
        })
        .select('id, project_id, author_id, parent_comment_id, text, is_pinned, created_at, profiles:author_id(id, full_name, department, role, is_verified)')
        .single();

      if (error) throw error;

      setNewCommentText('');
      // Update UI only after confirmed insertion
      await fetchComments();
    } catch (err) {
      console.error('Error posting comment:', err);
      setSubmitError(err.message || 'Unable to post comment. Please retry.');
    } finally {
      setIsSubmittingTopLevel(false);
    }
  };

  // =========================================================================
  // ACTIONS: POST REPLY
  // =========================================================================
  const handleOpenReply = (commentId) => {
    setActiveReplyCommentId(commentId);
    setReplyText('');
    setReplyError(null);
  };

  const handleCancelReply = (commentId) => {
    setActiveReplyCommentId(null);
    setReplyText('');
    setReplyError(null);
    // Return focus to the Reply button
    if (replyButtonRefs.current[commentId]) {
      replyButtonRefs.current[commentId].focus();
    }
  };

  const handleSubmitReply = async (parentCommentId) => {
    if (!user) return;

    const trimmed = replyText.trim();
    if (trimmed.length === 0 || trimmed.length > 1000) return;
    if (isSubmittingReply) return;

    setIsSubmittingReply(true);
    setReplyError(null);

    try {
      const { error } = await supabase
        .from('comments')
        .insert({
          project_id: projectId,
          author_id: user.id,
          parent_comment_id: parentCommentId,
          is_pinned: false,
          text: trimmed,
        });

      if (error) throw error;

      setReplyText('');
      setActiveReplyCommentId(null);

      // Return focus to Reply button
      if (replyButtonRefs.current[parentCommentId]) {
        replyButtonRefs.current[parentCommentId].focus();
      }

      await fetchComments();
    } catch (err) {
      console.error('Error posting reply:', err);
      setReplyError(err.message || 'Unable to post reply. Please retry.');
    } finally {
      setIsSubmittingReply(false);
    }
  };

  // =========================================================================
  // ACTIONS: PIN / UNPIN (OWNER ONLY VIA set_pinned_comment RPC)
  // =========================================================================
  const handleTogglePin = async (comment) => {
    if (!isProjectOwner) return;
    if (comment.parent_comment_id !== null) return; // Replies cannot be pinned

    const targetPinState = !comment.is_pinned;
    setPinningCommentId(comment.id);
    setPinError(null);

    try {
      // Use only the existing set_pinned_comment RPC; never directly update is_pinned
      const { error: rpcErr } = await supabase.rpc('set_pinned_comment', {
        p_comment_id: comment.id,
        p_pin: targetPinState,
      });

      if (rpcErr) throw rpcErr;

      // Re-fetch affected comment and verify resulting is_pinned state
      const { data: verified, error: verifyErr } = await supabase
        .from('comments')
        .select('id, is_pinned')
        .eq('id', comment.id)
        .maybeSingle();

      if (verifyErr || !verified) {
        throw new Error('Pin request executed, but verification read-back failed. Pinning unconfirmed.');
      }

      if (verified.is_pinned !== targetPinState) {
        throw new Error('Database did not apply the pinned state. Pinning unconfirmed.');
      }

      // Verified! Refresh comments
      await fetchComments();
    } catch (err) {
      console.error('Pinning error:', err);
      setPinError(err.message || 'Unable to modify pinned comment.');
    } finally {
      setPinningCommentId(null);
    }
  };

  // =========================================================================
  // ACTIONS: DELETION
  // =========================================================================
  const handleOpenDelete = (comment) => {
    setDeleteError(null);
    setDeletingComment(comment);
  };

  const handleConfirmDelete = async () => {
    if (!deletingComment || !currentUser) return;
    const isAuthor = Boolean(currentUser?.id && deletingComment.author_id && currentUser.id === deletingComment.author_id);
    const isOwner = Boolean(isProjectOwner);
    if (!isAuthor && !isOwner) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      const { error: delErr } = await supabase
        .from('comments')
        .delete()
        .eq('id', deletingComment.id);

      if (delErr) throw delErr;

      // Verify absence via authenticated read-back
      const { data: readBack, error: readBackErr } = await supabase
        .from('comments')
        .select('id')
        .eq('id', deletingComment.id)
        .maybeSingle();

      if (readBackErr) {
        throw new Error(`Deletion verification failed: ${readBackErr.message}. Deletion unconfirmed.`);
      }

      if (readBack !== null) {
        throw new Error('Comment record remains in database. Deletion unconfirmed.');
      }

      // Confirmed deleted!
      setDeletingComment(null);
      await fetchComments();
    } catch (err) {
      console.error('Error deleting comment:', err);
      setDeleteError(err.message || 'Failed to delete comment.');
    } finally {
      setIsDeleting(false);
    }
  };

  // =========================================================================
  // RENDER HELPER: COMMENT ROW
  // =========================================================================
  const renderCommentRow = (comment, isReply = false) => {
    const authorProfile = Array.isArray(comment.profiles)
      ? comment.profiles[0] || {}
      : comment.profiles || {};
    const authorName = (typeof authorProfile.full_name === 'string' && authorProfile.full_name.trim()) || 'Collegiate Scholar';
    const avatarInitial = authorName[0]?.toUpperCase() || 'S';
    const isMentor = authorProfile.role === 'mentor';
    const isVerifiedMentor = Boolean(isMentor && authorProfile.is_verified === true);
    const department = authorProfile.department || '';

    const relativeTime = formatRelativeTime(comment.created_at);

    const isAuthor = Boolean(currentUser?.id && comment.author_id && currentUser.id === comment.author_id);
    const canDelete = Boolean(currentUser?.id && (isAuthor || isProjectOwner));
    const canReport = Boolean(currentUser?.id); // Any comment the viewer can see

    return (
      <div
        key={comment.id}
        id={`comment-${comment.id}`}
        style={{
          display: 'flex',
          gap: '0.75rem',
          padding: isReply ? '0.65rem 0' : '0.85rem 0',
          borderTop: isReply ? '1px dashed var(--border-subtle, #DED4C4)' : '1px solid var(--border-subtle, #DED4C4)',
        }}
      >
        {/* Author Avatar Initial */}
        <div
          style={{
            width: isReply ? '28px' : '34px',
            height: isReply ? '28px' : '34px',
            borderRadius: '50%',
            backgroundColor: isVerifiedMentor ? '#8C6A30' : 'var(--color-dark-surface, #211E1A)',
            color: 'var(--color-warm-ivory, #F5F0E8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-serif)',
            fontSize: isReply ? '0.75rem' : '0.875rem',
            fontWeight: 600,
            flexShrink: 0,
            border: '1px solid var(--border-subtle, #DED4C4)',
          }}
          aria-hidden="true"
        >
          {avatarInitial}
        </div>

        {/* Content & Actions */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Header Metadata */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.4rem',
              marginBottom: '0.3rem',
            }}
          >
            <span
              style={{
                fontSize: '0.85rem',
                fontWeight: 600,
                color: 'var(--color-primary-dark, #171513)',
              }}
            >
              {authorName}
            </span>

            {department && (
              <span
                style={{
                  fontSize: '0.7rem',
                  color: 'var(--text-muted, #847C73)',
                }}
              >
                • {department}
              </span>
            )}

            {isVerifiedMentor && (
              <span
                title="Verified Faculty Mentor"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.2rem',
                  color: '#8C6A30',
                  fontSize: '0.7rem',
                }}
              >
                <ShieldCheck size={12} aria-hidden="true" />
              </span>
            )}

            {/* Relative Timestamp */}
            <span
              style={{
                fontSize: '0.72rem',
                color: 'var(--text-muted, #847C73)',
              }}
            >
              • {relativeTime || 'Just now'}
            </span>

            {/* Pinned Badge (top-level only) */}
            {!isReply && comment.is_pinned && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  backgroundColor: 'var(--color-warm-gold-subtle, #F7F3EA)',
                  border: '1px solid rgba(197, 164, 109, 0.4)',
                  color: '#8C6A30',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  borderRadius: 'var(--radius-sm, 4px)',
                  padding: '0.1rem 0.45rem',
                  marginLeft: '0.25rem',
                }}
                title="Pinned by Project Creator"
              >
                <Pin size={11} aria-hidden="true" />
                <span>Pinned</span>
              </span>
            )}
          </div>

          {/* Plain Text Content (Strictly no HTML or Markdown rendering) */}
          <div
            style={{
              fontSize: '0.885rem',
              lineHeight: 1.55,
              color: 'var(--text-primary, #171513)',
              whiteSpace: 'pre-wrap',
              overflowWrap: 'anywhere',
              wordBreak: 'break-word',
              marginBottom: '0.45rem',
            }}
          >
            {comment.text}
          </div>

          {/* Actions Row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.85rem',
              fontSize: '0.75rem',
              color: 'var(--text-muted, #847C73)',
            }}
          >
            {/* Reply action: Top-level comments only! Never shown on replies */}
            {!isReply && user && (
              <button
                type="button"
                ref={(el) => (replyButtonRefs.current[comment.id] = el)}
                onClick={() =>
                  activeReplyCommentId === comment.id
                    ? handleCancelReply(comment.id)
                    : handleOpenReply(comment.id)
                }
                aria-expanded={activeReplyCommentId === comment.id}
                aria-label={`Reply to ${authorName}'s comment`}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  color: activeReplyCommentId === comment.id ? 'var(--color-terracotta, #B86F52)' : 'var(--text-secondary, #5A534C)',
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  fontSize: '0.75rem',
                  fontFamily: 'inherit',
                }}
              >
                <CornerDownRight size={12} aria-hidden="true" />
                <span>{activeReplyCommentId === comment.id ? 'Cancel Reply' : 'Reply'}</span>
              </button>
            )}

            {/* Pin / Unpin: Project owner only; Top-level comments only! */}
            {!isReply && isProjectOwner && (
              <button
                type="button"
                onClick={() => handleTogglePin(comment)}
                disabled={pinningCommentId === comment.id}
                aria-label={comment.is_pinned ? 'Unpin comment' : 'Pin comment to top'}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  color: comment.is_pinned ? '#8C6A30' : 'var(--text-secondary, #5A534C)',
                  fontWeight: 500,
                  cursor: pinningCommentId === comment.id ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  fontSize: '0.75rem',
                  fontFamily: 'inherit',
                }}
              >
                {pinningCommentId === comment.id ? (
                  <Loader2 size={12} className="spin" aria-hidden="true" />
                ) : (
                  <Pin size={12} aria-hidden="true" />
                )}
                <span>{comment.is_pinned ? 'Unpin' : 'Pin'}</span>
              </button>
            )}

            {/* Delete: Comment author or Project owner */}
            {canDelete && (
              <button
                type="button"
                onClick={() => handleOpenDelete(comment)}
                aria-label={`Delete ${isReply ? 'reply' : 'comment'}`}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  color: '#9E382A',
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  fontSize: '0.75rem',
                  fontFamily: 'inherit',
                }}
              >
                <Trash2 size={12} aria-hidden="true" />
                <span>Delete</span>
              </button>
            )}

            {/* Report: Any authenticated viewer */}
            {canReport && (
              <button
                type="button"
                onClick={() => setReportingComment(comment)}
                aria-label={`Report ${isReply ? 'reply' : 'comment'}`}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  color: 'var(--text-muted, #847C73)',
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  fontSize: '0.75rem',
                  fontFamily: 'inherit',
                  marginLeft: 'auto',
                }}
              >
                <Flag size={11} aria-hidden="true" />
                <span>Report</span>
              </button>
            )}
          </div>

          {/* Inline Reply Form (Rendered only on top-level comments) */}
          {!isReply && activeReplyCommentId === comment.id && (
            <div
              style={{
                marginTop: '0.75rem',
                padding: '0.75rem',
                backgroundColor: 'var(--color-warm-ivory-light, #FAF7F2)',
                borderRadius: 'var(--radius-sm, 4px)',
                border: '1px solid var(--border-subtle, #DED4C4)',
              }}
            >
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSubmitReply(comment.id);
                }}
              >
                <label
                  htmlFor={`reply-input-${comment.id}`}
                  className="form-label"
                  style={{ fontSize: '0.78rem', display: 'block', marginBottom: '0.35rem' }}
                >
                  Reply to {authorName}
                </label>
                <textarea
                  id={`reply-input-${comment.id}`}
                  ref={replyInputRef}
                  rows={2}
                  maxLength={1000}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Contribute scholarly reply (1–1000 characters)..."
                  disabled={isSubmittingReply}
                  className="form-textarea"
                  style={{
                    width: '100%',
                    fontSize: '0.85rem',
                    padding: '0.5rem 0.65rem',
                    minHeight: '60px',
                  }}
                />

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: '0.45rem',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.72rem',
                      color: replyText.trim().length > 1000 ? '#9E382A' : 'var(--text-muted, #847C73)',
                    }}
                  >
                    {replyText.trim().length} / 1000
                  </span>

                  <div style={{ display: 'flex', gap: '0.45rem' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleCancelReply(comment.id)}
                      disabled={isSubmittingReply}
                      style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary btn-sm"
                      disabled={isSubmittingReply || replyText.trim().length === 0 || replyText.trim().length > 1000}
                      style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem' }}
                    >
                      {isSubmittingReply && <Loader2 size={12} className="spin" aria-hidden="true" />}
                      <span>{isSubmittingReply ? 'Sending...' : 'Reply'}</span>
                    </button>
                  </div>
                </div>

                {replyError && (
                  <div className="notice-box error" style={{ marginTop: '0.5rem', marginBottom: 0, padding: '0.45rem 0.65rem', fontSize: '0.75rem' }}>
                    <AlertCircle size={13} aria-hidden="true" />
                    <span>{replyError}</span>
                  </div>
                )}
              </form>
            </div>
          )}

          {/* Render Replies List for this Top-Level Comment (Oldest First) */}
          {!isReply && repliesByParent[comment.id] && repliesByParent[comment.id].length > 0 && (
            <div
              style={{
                marginTop: '0.65rem',
                marginLeft: '0.75rem',
                paddingLeft: '0.75rem',
                borderLeft: '2px solid var(--border-subtle, #DED4C4)',
              }}
            >
              {repliesByParent[comment.id]
                .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                .map((reply) => renderCommentRow(reply, true))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const totalCommentCount = comments.length;

  if (!isSectionActive) {
    return null;
  }

  return (
    <section
      aria-label="Project discourse and comments"
      style={{
        marginTop: '1.25rem',
        paddingTop: '1rem',
        borderTop: '1px solid var(--border-subtle, #DED4C4)',
        width: '100%',
      }}
    >
      {/* Header with Total Count */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <MessageSquare size={16} style={{ color: 'var(--color-terracotta, #B86F52)' }} aria-hidden="true" />
          <h3
            className="font-serif"
            style={{
              fontSize: '1.05rem',
              fontWeight: 600,
              color: 'var(--color-primary-dark, #171513)',
              margin: 0,
            }}
          >
            Discourse ({totalCommentCount})
          </h3>
        </div>
      </div>

      {pinError && (
        <div className="notice-box error" style={{ marginBottom: '1rem' }}>
          <AlertCircle size={15} aria-hidden="true" />
          <span>{pinError}</span>
        </div>
      )}

      {/* New Top-Level Comment Form (Authenticated Only) */}
      {user ? (
        <form onSubmit={handleSubmitTopLevel} style={{ marginBottom: '1.25rem' }}>
          <div style={{ position: 'relative' }}>
            <label
              htmlFor={`new-comment-input-${projectId}`}
              className="form-label"
              style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.35rem' }}
            >
              Add a Comment
            </label>
            <textarea
              id={`new-comment-input-${projectId}`}
              rows={3}
              maxLength={1000}
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              placeholder="Contribute scholarly reflection, critique, or inquiry (1–1000 characters)..."
              disabled={isSubmittingTopLevel}
              className="form-textarea"
              style={{
                width: '100%',
                fontSize: '0.875rem',
                minHeight: '75px',
                padding: '0.65rem 0.85rem',
              }}
            />

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: '0.35rem',
              }}
            >
              <span
                style={{
                  fontSize: '0.72rem',
                  color: newCommentText.trim().length > 1000 ? '#9E382A' : 'var(--text-muted, #847C73)',
                }}
              >
                {newCommentText.trim().length} / 1000
              </span>

              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={isSubmittingTopLevel || newCommentText.trim().length === 0 || newCommentText.trim().length > 1000}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
              >
                {isSubmittingTopLevel ? (
                  <Loader2 size={13} className="spin" aria-hidden="true" />
                ) : (
                  <Send size={13} aria-hidden="true" />
                )}
                <span>{isSubmittingTopLevel ? 'Posting...' : 'Comment'}</span>
              </button>
            </div>
          </div>

          {submitError && (
            <div className="notice-box error" style={{ marginTop: '0.65rem' }}>
              <AlertCircle size={15} aria-hidden="true" />
              <span>{submitError}</span>
            </div>
          )}
        </form>
      ) : (
        /* Anonymous Visitor Notice */
        <div
          style={{
            padding: '0.85rem 1rem',
            backgroundColor: 'var(--color-warm-ivory-light, #FAF7F2)',
            border: '1px solid var(--border-subtle, #DED4C4)',
            borderRadius: 'var(--radius-sm, 4px)',
            marginBottom: '1.25rem',
            fontSize: '0.85rem',
            color: 'var(--text-secondary, #5A534C)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            flexWrap: 'wrap',
          }}
        >
          <span>Sign in to participate in project discourse and post comments.</span>
          <a
            href="/login"
            className="btn btn-secondary btn-sm"
            style={{ padding: '0.3rem 0.65rem', fontSize: '0.78rem' }}
          >
            Sign In
          </a>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            padding: '2rem 1rem',
            color: 'var(--text-muted, #847C73)',
            fontSize: '0.85rem',
          }}
        >
          <Loader2 size={16} className="spin" aria-hidden="true" />
          <span>Retrieving collegiate discourse...</span>
        </div>
      ) : fetchError ? (
        /* Error State with Retry */
        <div className="notice-box error" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={16} aria-hidden="true" />
            <span>{fetchError}</span>
          </div>
          <button
            type="button"
            onClick={fetchComments}
            className="btn btn-secondary btn-sm"
            style={{ padding: '0.2rem 0.55rem', fontSize: '0.75rem' }}
          >
            Retry
          </button>
        </div>
      ) : sortedTopLevel.length === 0 ? (
        /* Empty State */
        <div
          style={{
            padding: '1.5rem 1rem',
            textAlign: 'center',
            backgroundColor: 'var(--color-warm-ivory-light, #FAF7F2)',
            borderRadius: 'var(--radius-sm, 4px)',
            border: '1px dashed var(--border-subtle, #DED4C4)',
            color: 'var(--text-muted, #847C73)',
            fontSize: '0.85rem',
          }}
        >
          No discourse recorded yet. Be the first to inaugurate scholarly reflection on this project.
        </div>
      ) : (
        /* Comments List */
        <div className="comments-stream">
          {sortedTopLevel.map((c) => renderCommentRow(c, false))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteCommentModal
        isOpen={Boolean(deletingComment)}
        comment={deletingComment}
        isTopLevel={Boolean(deletingComment && deletingComment.parent_comment_id === null)}
        onClose={() => {
          if (!isDeleting) setDeletingComment(null);
        }}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
        error={deleteError}
      />

      {/* Report Modal */}
      <ReportCommentModal
        isOpen={Boolean(reportingComment)}
        comment={reportingComment}
        onClose={() => setReportingComment(null)}
      />
    </section>
  );
};

/**
 * Top-level export wrapped in CommentsErrorBoundary to ensure comment failures
 * cannot bubble up or crash the surrounding feed cards or modal.
 */
export const ProjectCommentsSection = (props) => {
  return (
    <CommentsErrorBoundary>
      <ProjectCommentsSectionContent {...props} />
    </CommentsErrorBoundary>
  );
};

export default ProjectCommentsSection;

