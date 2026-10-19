import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Loader2, AlertCircle } from 'lucide-react';

/**
 * Mentra Phase 7 Step 6: Full-Screen Project Photo Viewer
 *
 * Implements accessible, modal full-screen viewer with:
 * - Selected photo display with object-fit: contain
 * - Previous and Next controls with consistent disabled boundaries
 * - Close control (X button and Escape key)
 * - Position indicator ("X of Y")
 * - Keyboard navigation (Escape, ArrowLeft, ArrowRight)
 * - Accessible names for every control, role="dialog", aria-modal="true"
 * - Focus trap inside dialog and focus restoration to the triggering gallery tile on close
 * - Background scroll lock with cleanup on close/unmount
 * - Backdrop click closes only when clicking the backdrop itself
 * - Loading and image error states per photo
 * - No zoom, download, captions, likes, or comments
 *
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {Array<Object>} props.photos
 * @param {number} [props.initialIndex=0]
 * @param {Function} props.onClose
 * @param {HTMLElement} [props.triggerElement=null]
 */
export const ProjectPhotoViewerModal = ({
  isOpen,
  photos = [],
  initialIndex = 0,
  onClose,
  triggerElement = null,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [imgLoading, setImgLoading] = useState(true);
  const [imgError, setImgError] = useState(false);

  const dialogRef = useRef(null);
  const closeBtnRef = useRef(null);
  const prevBtnRef = useRef(null);
  const nextBtnRef = useRef(null);
  const triggerRef = useRef(triggerElement || null);

  // Sync index when initialIndex changes or modal opens
  useEffect(() => {
    if (isOpen) {
      const safeIndex = Math.min(Math.max(0, initialIndex), Math.max(0, photos.length - 1));
      setCurrentIndex(safeIndex);
      setImgLoading(true);
      setImgError(false);
    }
  }, [isOpen, initialIndex, photos.length]);

  // Reset loading state when navigating to another photo
  useEffect(() => {
    setImgLoading(true);
    setImgError(false);
  }, [currentIndex]);

  // Capture triggering active element on open if not explicitly supplied
  useEffect(() => {
    if (isOpen) {
      if (!triggerRef.current && document.activeElement) {
        triggerRef.current = document.activeElement;
      }
    }
  }, [isOpen]);

  // Move focus into dialog on open, and restore focus on close/unmount
  useEffect(() => {
    if (!isOpen) return;

    // Focus close button initially
    const focusTimeout = setTimeout(() => {
      if (closeBtnRef.current) {
        closeBtnRef.current.focus();
      }
    }, 50);

    return () => {
      clearTimeout(focusTimeout);
      // Restore focus to triggering gallery tile
      if (triggerRef.current && typeof triggerRef.current.focus === 'function') {
        try {
          triggerRef.current.focus();
        } catch {
          // ignore focus failure
        }
      }
    };
  }, [isOpen]);

  // Lock background body scroll while viewer is open
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  // Navigation handlers with disabled bound checks
  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : prev));
  }, []);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < photos.length - 1 ? prev + 1 : prev));
  }, [photos.length]);

  // Keyboard navigation & Focus trap
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        e.stopPropagation();
        if (currentIndex > 0) {
          handlePrev();
        }
        return;
      }

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        e.stopPropagation();
        if (currentIndex < photos.length - 1) {
          handleNext();
        }
        return;
      }

      // Focus trap within modal
      if (e.key === 'Tab') {
        if (!dialogRef.current) return;
        const focusable = Array.from(
          dialogRef.current.querySelectorAll(
            'button:not([disabled]):not([aria-disabled="true"]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          )
        );
        if (focusable.length === 0) return;

        const firstElement = focusable[0];
        const lastElement = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement || !dialogRef.current.contains(document.activeElement)) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement || !dialogRef.current.contains(document.activeElement)) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, currentIndex, photos.length, onClose, handlePrev, handleNext]);

  if (!isOpen || !photos || photos.length === 0) {
    return null;
  }

  const currentPhoto = photos[currentIndex];
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === photos.length - 1;

  // Backdrop click handler: close ONLY if clicking directly on the backdrop container
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Photo viewer: photo ${currentIndex + 1} of ${photos.length}`}
      onClick={handleBackdropClick}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        backgroundColor: 'rgba(15, 13, 11, 0.94)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '1.25rem',
        outline: 'none',
        boxSizing: 'border-box',
      }}
      tabIndex={-1}
    >
      {/* Top Bar: Position Counter & Close button */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0.25rem 0.5rem',
          zIndex: 10,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Position Counter */}
        <div
          aria-live="polite"
          aria-atomic="true"
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '1.05rem',
            color: 'var(--color-warm-ivory, #F5F0E8)',
            letterSpacing: '0.04em',
            fontWeight: 500,
          }}
        >
          {currentIndex + 1} of {photos.length}
        </div>

        {/* Close Button */}
        <button
          ref={closeBtnRef}
          type="button"
          onClick={onClose}
          aria-label="Close photo viewer"
          style={{
            background: 'rgba(245, 240, 232, 0.12)',
            border: '1px solid rgba(245, 240, 232, 0.25)',
            borderRadius: '50%',
            width: '42px',
            height: '42px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-warm-ivory, #F5F0E8)',
            cursor: 'pointer',
            transition: 'var(--transition-smooth, all 0.2s ease)',
            outline: 'none',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(245, 240, 232, 0.22)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(245, 240, 232, 0.12)';
          }}
          onFocus={(e) => {
            e.currentTarget.style.outline = '2px solid var(--color-warm-gold, #C5A46D)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.outline = 'none';
          }}
        >
          <X size={20} aria-hidden="true" />
        </button>
      </div>

      {/* Main Viewing Stage: Previous, Central Image, Next */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
          width: '100%',
          maxWidth: '1200px',
          margin: '0 auto',
          gap: '1rem',
          minHeight: 0,
        }}
        onClick={handleBackdropClick}
      >
        {/* Previous Button */}
        <button
          ref={prevBtnRef}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handlePrev();
          }}
          disabled={isFirst}
          aria-disabled={isFirst}
          aria-label="Previous photo"
          style={{
            background: isFirst ? 'rgba(245, 240, 232, 0.04)' : 'rgba(245, 240, 232, 0.12)',
            border: '1px solid rgba(245, 240, 232, 0.2)',
            borderRadius: '50%',
            width: '46px',
            height: '46px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-warm-ivory, #F5F0E8)',
            cursor: isFirst ? 'not-allowed' : 'pointer',
            opacity: isFirst ? 0.25 : 1,
            transition: 'var(--transition-smooth, all 0.2s ease)',
            zIndex: 10,
            flexShrink: 0,
            outline: 'none',
          }}
          onMouseEnter={(e) => {
            if (!isFirst) e.currentTarget.style.backgroundColor = 'rgba(245, 240, 232, 0.24)';
          }}
          onMouseLeave={(e) => {
            if (!isFirst) e.currentTarget.style.backgroundColor = 'rgba(245, 240, 232, 0.12)';
          }}
          onFocus={(e) => {
            if (!isFirst) e.currentTarget.style.outline = '2px solid var(--color-warm-gold, #C5A46D)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.outline = 'none';
          }}
        >
          <ChevronLeft size={24} aria-hidden="true" />
        </button>

        {/* Central Photo Viewport */}
        <div
          style={{
            flex: 1,
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            minHeight: 0,
          }}
          onClick={handleBackdropClick}
        >
          {/* Loading Indicator */}
          {imgLoading && !imgError && currentPhoto?.signedUrl && (
            <div
              style={{
                position: 'absolute',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.65rem',
                color: 'var(--color-warm-ivory, #F5F0E8)',
              }}
              aria-live="polite"
            >
              <Loader2
                size={34}
                style={{
                  animation: 'spin 0.8s linear infinite',
                  color: 'var(--color-warm-gold, #C5A46D)',
                }}
                aria-hidden="true"
              />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-on-dark-secondary, #C8BFB3)' }}>
                Loading photo...
              </span>
            </div>
          )}

          {/* Photo Display */}
          {currentPhoto?.signedUrl && !imgError ? (
            <img
              key={`viewer-photo-${currentPhoto.id || currentPhoto.path || currentIndex}`}
              src={currentPhoto.signedUrl}
              alt={`Project photograph ${currentIndex + 1} of ${photos.length}`}
              onLoad={() => setImgLoading(false)}
              onError={() => {
                setImgLoading(false);
                setImgError(true);
              }}
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: '100%',
                maxHeight: 'calc(100vh - 160px)',
                objectFit: 'contain',
                borderRadius: 'var(--radius-sm, 4px)',
                boxShadow: '0 12px 40px rgba(0, 0, 0, 0.55)',
                display: imgLoading ? 'none' : 'block',
                transition: 'opacity 0.2s ease',
              }}
            />
          ) : (
            /* Error Fallback Box */
            <div
              role="alert"
              onClick={(e) => e.stopPropagation()}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                padding: '2.5rem 2rem',
                backgroundColor: 'rgba(33, 30, 26, 0.85)',
                border: '1px solid var(--border-on-dark, #37332D)',
                borderRadius: 'var(--radius-md, 6px)',
                color: 'var(--color-warm-ivory, #F5F0E8)',
                maxWidth: '420px',
                textAlign: 'center',
              }}
            >
              <AlertCircle size={36} style={{ color: 'var(--color-terracotta, #B86F52)' }} aria-hidden="true" />
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem', fontWeight: 500 }}>
                Unable to Display Photo
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: '0.825rem',
                  color: 'var(--text-on-dark-secondary, #C8BFB3)',
                  lineHeight: '1.5',
                }}
              >
                The image link could not be loaded or may have expired. You can continue browsing other photos in this project.
              </p>
            </div>
          )}
        </div>

        {/* Next Button */}
        <button
          ref={nextBtnRef}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleNext();
          }}
          disabled={isLast}
          aria-disabled={isLast}
          aria-label="Next photo"
          style={{
            background: isLast ? 'rgba(245, 240, 232, 0.04)' : 'rgba(245, 240, 232, 0.12)',
            border: '1px solid rgba(245, 240, 232, 0.2)',
            borderRadius: '50%',
            width: '46px',
            height: '46px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-warm-ivory, #F5F0E8)',
            cursor: isLast ? 'not-allowed' : 'pointer',
            opacity: isLast ? 0.25 : 1,
            transition: 'var(--transition-smooth, all 0.2s ease)',
            zIndex: 10,
            flexShrink: 0,
            outline: 'none',
          }}
          onMouseEnter={(e) => {
            if (!isLast) e.currentTarget.style.backgroundColor = 'rgba(245, 240, 232, 0.24)';
          }}
          onMouseLeave={(e) => {
            if (!isLast) e.currentTarget.style.backgroundColor = 'rgba(245, 240, 232, 0.12)';
          }}
          onFocus={(e) => {
            if (!isLast) e.currentTarget.style.outline = '2px solid var(--color-warm-gold, #C5A46D)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.outline = 'none';
          }}
        >
          <ChevronRight size={24} aria-hidden="true" />
        </button>
      </div>

      {/* Bottom spacer for aesthetic balance */}
      <div style={{ height: '1.5rem', pointerEvents: 'none' }} />
    </div>
  );
};
