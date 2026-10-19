import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../../frontend/lib/supabase';
import { fetchProjectGalleryMedia } from './projectMediaService';
import { ProjectPhotoViewerModal } from './ProjectPhotoViewerModal';
import { AlertCircle } from 'lucide-react';

/**
 * Mentra Phase 7 Step 6: Project Photo Gallery
 *
 * Implements exact photo gallery layouts (1 to 5 photos) and coordinates
 * with the full-screen photo viewer modal.
 *
 * Layout Invariants:
 * - 0 photos: Renders null (no gallery element at all, no empty box).
 * - 1 photo: One large image across gallery width (responsive 16:9, max-height 380px).
 * - 2 photos: Two equal images side by side (2-column grid).
 * - 3 photos: One large image on left, two smaller stacked on right.
 * - 4 photos: Two-by-two grid.
 * - 5 photos: Two-by-two visible grid using photos 1-4; "+1" overlay on 4th visible tile.
 *             Clicking that tile opens the viewer at photo 4 while allowing navigation to photo 5.
 * - Every visible tile is clickable and opens the viewer at its own corresponding index.
 * - Stable responsive aspect ratios, object-fit: cover, Mentra design palette.
 * - Single image failure displays a compact error without breaking other photos or card.
 *
 * @param {Object} props
 * @param {string} props.projectId
 */
export const ProjectPhotoGallery = ({ projectId }) => {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failedPhotoIds, setFailedPhotoIds] = useState({});

  // Full-screen Viewer State
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [viewerInitialIndex, setViewerInitialIndex] = useState(0);
  const triggerElementRef = useRef(null);

  // Fetch photos with signed URLs (cached & ordered deterministically)
  useEffect(() => {
    let isMounted = true;

    if (!projectId || !isSupabaseConfigured) {
      setPhotos([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetchProjectGalleryMedia(supabase, projectId)
      .then((data) => {
        if (isMounted) {
          setPhotos(data || []);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.warn(`Error loading gallery for project ${projectId}:`, err);
          setPhotos([]);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [projectId]);

  const handleTileClick = useCallback((index, buttonElement) => {
    triggerElementRef.current = buttonElement;
    setViewerInitialIndex(index);
    setIsViewerOpen(true);
  }, []);

  const handleCloseViewer = useCallback(() => {
    setIsViewerOpen(false);
  }, []);

  // Zero photos: render nothing (no wrapper, no empty box)
  if (!photos || photos.length === 0) {
    return null;
  }

  const count = photos.length;

  /**
   * Helper to render an individual photo tile button
   */
  const renderTile = (photo, index, totalCount, customStyle = {}, hasPlusOverlay = false) => {
    if (!photo) return null;

    const isFailed = !photo.signedUrl || Boolean(failedPhotoIds[photo.id]);
    const ariaLabel = hasPlusOverlay
      ? `View photo ${index + 1} of ${totalCount} and 1 more photo`
      : `View photo ${index + 1} of ${totalCount}`;

    return (
      <button
        key={photo.id || `gallery-tile-${index}`}
        type="button"
        onClick={(e) => handleTileClick(index, e.currentTarget)}
        aria-label={ariaLabel}
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          padding: 0,
          margin: 0,
          border: 'none',
          backgroundColor: 'var(--color-dark-surface, #211E1A)',
          cursor: 'pointer',
          overflow: 'hidden',
          outline: 'none',
          display: 'block',
          ...customStyle,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.filter = 'brightness(0.92)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.filter = 'brightness(1)';
        }}
        onFocus={(e) => {
          e.currentTarget.style.outline = '2px solid var(--color-warm-gold, #C5A46D)';
          e.currentTarget.style.zIndex = '2';
        }}
        onBlur={(e) => {
          e.currentTarget.style.outline = 'none';
          e.currentTarget.style.zIndex = '1';
        }}
      >
        {isFailed ? (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.35rem',
              backgroundColor: 'var(--color-warm-ivory-light, #FAF7F2)',
              color: 'var(--text-muted, #847C73)',
              padding: '0.5rem',
              textAlign: 'center',
            }}
          >
            <AlertCircle size={20} style={{ color: 'var(--color-terracotta, #B86F52)' }} aria-hidden="true" />
            <span style={{ fontSize: '0.72rem', fontWeight: 500 }}>Photo unavailable</span>
          </div>
        ) : (
          <img
            src={photo.signedUrl}
            alt={`Project photograph ${index + 1} of ${totalCount}`}
            loading="lazy"
            onError={() => {
              setFailedPhotoIds((prev) => ({ ...prev, [photo.id]: true }));
            }}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
          />
        )}

        {/* 5-photo "+1" indicator overlay on fourth visible tile */}
        {hasPlusOverlay && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(23, 21, 19, 0.65)',
              backdropFilter: 'blur(2px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-warm-ivory, #F5F0E8)',
              fontFamily: 'var(--font-serif)',
              fontSize: '1.75rem',
              fontWeight: 600,
              letterSpacing: '0.04em',
              pointerEvents: 'none',
            }}
          >
            +1
          </div>
        )}
      </button>
    );
  };

  return (
    <>
      <div
        className="mentra-photo-gallery"
        style={{
          width: '100%',
          marginTop: '0.85rem',
          marginBottom: '1.25rem',
          borderRadius: 'var(--radius-md, 6px)',
          overflow: 'hidden',
          border: '1px solid var(--border-subtle, #DED4C4)',
          backgroundColor: 'var(--color-dark-surface, #211E1A)',
        }}
      >
        {/* Layout 1: 1 Photo across full width */}
        {count === 1 && (
          <div
            style={{
              width: '100%',
              height: 'auto',
              maxHeight: '380px',
              aspectRatio: '16 / 9',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {renderTile(photos[0], 0, 1)}
          </div>
        )}

        {/* Layout 2: 2 Photos side-by-side */}
        {count === 2 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '3px',
              height: 'clamp(200px, 32vw, 250px)',
              width: '100%',
            }}
          >
            {renderTile(photos[0], 0, 2)}
            {renderTile(photos[1], 1, 2)}
          </div>
        )}

        {/* Layout 3: 1 large left, 2 smaller stacked right */}
        {count === 3 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gridTemplateRows: '1fr 1fr',
              gap: '3px',
              height: 'clamp(220px, 36vw, 290px)',
              width: '100%',
            }}
          >
            {renderTile(photos[0], 0, 3, { gridColumn: '1 / 2', gridRow: '1 / span 2' })}
            {renderTile(photos[1], 1, 3, { gridColumn: '2 / 3', gridRow: '1 / 2' })}
            {renderTile(photos[2], 2, 3, { gridColumn: '2 / 3', gridRow: '2 / 3' })}
          </div>
        )}

        {/* Layout 4: 2x2 grid */}
        {count === 4 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gridTemplateRows: '1fr 1fr',
              gap: '3px',
              height: 'clamp(220px, 36vw, 290px)',
              width: '100%',
            }}
          >
            {renderTile(photos[0], 0, 4, { gridColumn: '1 / 2', gridRow: '1 / 2' })}
            {renderTile(photos[1], 1, 4, { gridColumn: '2 / 3', gridRow: '1 / 2' })}
            {renderTile(photos[2], 2, 4, { gridColumn: '1 / 2', gridRow: '2 / 3' })}
            {renderTile(photos[3], 3, 4, { gridColumn: '2 / 3', gridRow: '2 / 3' })}
          </div>
        )}

        {/* Layout 5: 2x2 grid using photos 1-4 with "+1" on 4th visible tile */}
        {count >= 5 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gridTemplateRows: '1fr 1fr',
              gap: '3px',
              height: 'clamp(220px, 36vw, 290px)',
              width: '100%',
            }}
          >
            {renderTile(photos[0], 0, count, { gridColumn: '1 / 2', gridRow: '1 / 2' })}
            {renderTile(photos[1], 1, count, { gridColumn: '2 / 3', gridRow: '1 / 2' })}
            {renderTile(photos[2], 2, count, { gridColumn: '1 / 2', gridRow: '2 / 3' })}
            {renderTile(photos[3], 3, count, { gridColumn: '2 / 3', gridRow: '2 / 3' }, true)}
          </div>
        )}
      </div>

      {/* Full-Screen Viewer Modal */}
      <ProjectPhotoViewerModal
        isOpen={isViewerOpen}
        photos={photos}
        initialIndex={viewerInitialIndex}
        onClose={handleCloseViewer}
        triggerElement={triggerElementRef.current}
      />
    </>
  );
};
