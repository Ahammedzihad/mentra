/**
 * Mentra Phase 7 — Project Media Service
 *
 * Implements client-side photo processing, validation, sequential storage upload,
 * project_media database operations, and storage cleanup.
 *
 * Key Invariants:
 * 1. Storage bucket: 'project-media' (private).
 * 2. Allowed input formats: JPEG (image/jpeg), PNG (image/png), WebP (image/webp).
 * 3. Browser-side conversion: Scales longest side to <= 1600px, converts to WebP.
 * 4. Verification: Confirms browser encoder produced WebP and blob size <= 2MB.
 * 5. Max 5 photos per project with positions in [0..4] (enforced in DB and client).
 * 6. Sequential uploads to `<project_id>/<random-uuid>.webp` without upsert.
 * 7. Rollback: If project_media insert fails, attempts removal of storage object.
 *    If removal also fails, surfaces clear error with exact path.
 * 8. Photo removal: Deletes storage object first; only deletes database row if storage delete succeeds.
 * 9. Project deletion cleanup: Deletes storage objects before deleting the project record.
 */

export const MAX_PROJECT_PHOTOS = 5;
export const MAX_IMAGE_DIMENSION = 1600;
export const MAX_STORAGE_BYTES = 2 * 1024 * 1024; // 2 MB bucket hard limit
export const TARGET_QUALITY = 0.82; // Produces ~200-500 KB WebP output

export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

/**
 * Validates file type and initial size before any processing.
 *
 * @param {File} file
 * @returns {{ valid: boolean, error: string | null }}
 */
export function validateImageFile(file) {
  if (!file) {
    return { valid: false, error: 'No file provided.' };
  }

  // Check MIME type
  const mime = file.type ? file.type.toLowerCase() : '';
  if (!ALLOWED_MIME_TYPES.includes(mime)) {
    return {
      valid: false,
      error: `Unsupported file type "${file.type || 'unknown'}". Only JPEG, PNG, and WebP images are permitted (GIF, PDF, and video are not allowed).`,
    };
  }

  // Check file extension
  const nameParts = file.name ? file.name.split('.') : [];
  const ext = nameParts.length > 1 ? nameParts.pop().toLowerCase() : '';
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: `Unsupported file extension ".${ext}". Only .jpg, .jpeg, .png, and .webp files are permitted.`,
    };
  }

  // Sanity check initial file size (e.g. reject empty files or massive files > 25MB before canvas decode)
  if (file.size <= 0) {
    return { valid: false, error: 'The selected file is empty (0 bytes).' };
  }
  if (file.size > 25 * 1024 * 1024) {
    return { valid: false, error: 'The original file is too large (> 25 MB). Please select a smaller photo.' };
  }

  return { valid: true, error: null };
}

/**
 * Compresses and converts an image to WebP using HTML Canvas.
 * - Scales longest dimension to <= 1600px maintaining aspect ratio.
 * - Encodes as image/webp at TARGET_QUALITY.
 * - Confirms the encoder actually produced WebP.
 * - Rejects if the final compressed blob exceeds the 2 MB limit.
 *
 * @param {File} file
 * @param {number} [maxDimension=1600]
 * @param {number} [quality=0.82]
 * @returns {Promise<Blob>}
 */
export async function compressImageToWebp(
  file,
  maxDimension = MAX_IMAGE_DIMENSION,
  quality = TARGET_QUALITY
) {
  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  return new Promise((resolve, reject) => {
    let objectUrl = null;
    try {
      objectUrl = URL.createObjectURL(file);
    } catch (err) {
      return reject(new Error('Unable to read selected file: ' + err.message));
    }

    const img = new Image();

    img.onload = () => {
      try {
        if (objectUrl) URL.revokeObjectURL(objectUrl);

        let { naturalWidth: width, naturalHeight: height } = img;
        if (!width || !height) {
          width = img.width;
          height = img.height;
        }

        if (width <= 0 || height <= 0) {
          return reject(new Error('Invalid image dimensions (image cannot be decoded).'));
        }

        // Scale down longest side to maxDimension
        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Browser 2D canvas context is not supported.'));
        }

        // Smooth image downscaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Export as WebP
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return reject(new Error('Image compression failed to produce data.'));
            }

            // Confirm encoder actually produced WebP
            if (blob.type !== 'image/webp') {
              return reject(
                new Error(
                  `Browser encoder failed to produce WebP format (received: ${blob.type || 'unknown'}). WebP encoding is strictly required.`
                )
              );
            }

            // Reject if exceeds 2 MB bucket limit
            if (blob.size > MAX_STORAGE_BYTES) {
              const sizeMb = (blob.size / (1024 * 1024)).toFixed(2);
              return reject(
                new Error(
                  `Compressed photo size is ${sizeMb} MB, which exceeds the bucket limit of 2.0 MB. Please choose a smaller image.`
                )
              );
            }

            resolve(blob);
          },
          'image/webp',
          quality
        );
      } catch (err) {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        reject(err);
      }
    };

    img.onerror = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      reject(
        new Error(
          'Failed to decode image. Please ensure the file is a valid, uncorrupted JPEG, PNG, or WebP image.'
        )
      );
    };

    img.src = objectUrl;
  });
}

/**
 * Calculates available positions in [0, 1, 2, 3, 4] given existing media rows.
 *
 * @param {Array<{ position: number }>} existingMediaRows
 * @returns {number[]} Array of available position integers sorted ascending.
 */
export function getAvailablePositions(existingMediaRows = []) {
  const occupied = new Set(
    (existingMediaRows || [])
      .map((item) => Number(item?.position))
      .filter((pos) => !Number.isNaN(pos) && pos >= 0 && pos <= 4)
  );

  const available = [];
  for (let i = 0; i < MAX_PROJECT_PHOTOS; i++) {
    if (!occupied.has(i)) {
      available.push(i);
    }
  }
  return available;
}

/**
 * Lists all storage objects under a project folder with full pagination.
 * Collects all pages before returning to prevent skipping items due to shifting offsets.
 *
 * @param {Object} supabaseClient
 * @param {string} projectId
 * @returns {Promise<Array<Object>>}
 */
export async function listAllProjectStorageObjects(supabaseClient, projectId) {
  if (!supabaseClient || !projectId) return [];

  const allObjects = [];
  const limit = 100;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabaseClient.storage
      .from('project-media')
      .list(projectId, {
        limit,
        offset,
        sortBy: { column: 'name', order: 'asc' },
      });

    if (error) {
      throw new Error(`Failed to list storage objects in folder "${projectId}": ${error.message}`);
    }

    if (!data || data.length === 0) {
      hasMore = false;
    } else {
      allObjects.push(...data);
      if (data.length < limit) {
        hasMore = false;
      } else {
        offset += data.length;
      }
    }
  }

  return allObjects;
}

/**
 * Fetches all project_media rows for a project and generates 1-hour signed URLs.
 * Also performs an owner-authorized storage listing to verify whether each attached file
 * is present in storage.
 *
 * Invariant: If the owner-authorized storage listing confirms the exact path is absent,
 * marks `isStorageMissing: true` so recovery (retrying database row deletion) is preserved
 * across modal closes and page reloads.
 * Does not treat a failed signed-URL request alone as proof that the object is missing.
 *
 * @param {Object} supabaseClient
 * @param {string} projectId
 * @returns {Promise<Array<Object>>}
 */
export async function fetchProjectMediaWithSignedUrls(supabaseClient, projectId) {
  if (!supabaseClient || !projectId) return [];

  const { data: mediaRows, error: fetchErr } = await supabaseClient
    .from('project_media')
    .select('id, project_id, uploader_id, path, position, created_at')
    .eq('project_id', projectId)
    .order('position', { ascending: true });

  if (fetchErr) {
    throw new Error(`Failed to load project photos: ${fetchErr.message}`);
  }

  if (!mediaRows || mediaRows.length === 0) {
    return [];
  }

  // Perform owner-authorized storage listing for this project's folder (all pages)
  let existingStorageFileNames = null;
  try {
    const storageObjects = await listAllProjectStorageObjects(supabaseClient, projectId);
    existingStorageFileNames = new Set(storageObjects.map((item) => item.name));
  } catch (err) {
    console.warn('Storage folder listing failed; proceeding without absent-file confirmation:', err);
  }

  // Enrich each row with status and signed URL
  const enriched = await Promise.all(
    mediaRows.map(async (row) => {
      const fileName = row.path ? row.path.split('/').pop() : '';

      // An object is confirmed absent ONLY if the authorized listing succeeded and the exact filename is absent
      const isConfirmedAbsent =
        existingStorageFileNames !== null && !!fileName && !existingStorageFileNames.has(fileName);

      if (isConfirmedAbsent) {
        return {
          ...row,
          isStorageMissing: true,
          signedUrl: null,
          signedError: 'Storage object is absent from project folder.',
        };
      }

      // Generate 1-hour (3600 seconds) signed URL
      try {
        const { data: signedData, error: signedErr } = await supabaseClient.storage
          .from('project-media')
          .createSignedUrl(row.path, 3600);

        return {
          ...row,
          isStorageMissing: false,
          signedUrl: signedErr ? null : signedData?.signedUrl,
          signedError: signedErr ? signedErr.message : null,
        };
      } catch (err) {
        return {
          ...row,
          isStorageMissing: false,
          signedUrl: null,
          signedError: err.message,
        };
      }
    })
  );

  return enriched;
}

/**
 * Uploads a single compressed photo blob to the private project-media bucket
 * and inserts a project_media database record.
 *
 * Rollback invariant: If storage upload succeeds but project_media insert fails,
 * attempts removal of the newly uploaded storage object. If cleanup also fails,
 * surfaces a clear error containing the exact object path so it can be cleaned up manually.
 *
 * @param {Object} params
 * @param {Object} params.supabaseClient
 * @param {string} params.projectId
 * @param {string} params.uploaderId - Authenticated user's ID
 * @param {Blob|File} params.blobOrFile
 * @param {number} params.position - Slot 0 to 4
 * @returns {Promise<Object>} The inserted project_media record
 */
export async function uploadSingleProjectPhoto({
  supabaseClient,
  projectId,
  uploaderId,
  blobOrFile,
  position,
}) {
  if (!supabaseClient) throw new Error('Supabase client is required.');
  if (!projectId) throw new Error('Project ID is required before uploading photos.');
  if (!uploaderId) throw new Error('Authenticated uploader ID is required.');
  if (position < 0 || position > 4) {
    throw new Error(`Position ${position} is outside allowed range (0 to 4).`);
  }

  // Generate unique random UUID for filename
  const randomUuid =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;

  const storagePath = `${projectId}/${randomUuid}.webp`;

  // 1. Upload to Supabase Storage without upsert (do not overwrite)
  const { error: uploadError } = await supabaseClient.storage
    .from('project-media')
    .upload(storagePath, blobOrFile, {
      contentType: 'image/webp',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Storage upload failed for "${storagePath}": ${uploadError.message}`);
  }

  // 2. Insert row in project_media table
  const { data: mediaRow, error: insertError } = await supabaseClient
    .from('project_media')
    .insert({
      project_id: projectId,
      uploader_id: uploaderId,
      path: storagePath,
      position: position,
    })
    .select('id, project_id, uploader_id, path, position, created_at')
    .single();

  if (insertError) {
    // Attempt rollback: remove the newly uploaded storage object
    let rollbackSuccess = false;
    let rollbackErrorMsg = '';

    try {
      const { error: removeError } = await supabaseClient.storage
        .from('project-media')
        .remove([storagePath]);

      if (removeError) {
        rollbackErrorMsg = removeError.message;
      } else {
        rollbackSuccess = true;
      }
    } catch (cleanupEx) {
      rollbackErrorMsg = cleanupEx.message;
    }

    if (!rollbackSuccess) {
      throw new Error(
        `Failed to record photo in database (${insertError.message}), and storage cleanup of object "${storagePath}" also failed (${rollbackErrorMsg || 'unknown'}). Object path for manual cleanup: ${storagePath}.`
      );
    }

    throw new Error(`Failed to record photo in database: ${insertError.message}`);
  }

  return mediaRow;
}

/**
 * Deletes a single project_media row from the database directly and verifies absence via read-back.
 * Used for retry recovery when the storage object has already been deleted or is confirmed absent.
 *
 * Safeguard: Verifies that the row is actually gone via an authenticated read-back.
 * If read-back fails or returns the row (e.g. RLS silently blocked write), raises an error.
 *
 * @param {Object} params
 * @param {Object} params.supabaseClient
 * @param {string} params.mediaId
 * @returns {Promise<void>}
 */
export async function deleteProjectMediaRowOnly({ supabaseClient, mediaId }) {
  if (!supabaseClient) throw new Error('Supabase client is required.');
  if (!mediaId) throw new Error('Media ID is required for database row removal.');

  // 1. Delete row
  const { error: dbError } = await supabaseClient
    .from('project_media')
    .delete()
    .eq('id', mediaId);

  if (dbError) {
    throw new Error(
      `Failed to remove database record for photo: ${dbError.message}`
    );
  }

  // 2. Confirm the row is absent via read-back using the same authenticated session
  const { data: readBackRow, error: readBackErr } = await supabaseClient
    .from('project_media')
    .select('id')
    .eq('id', mediaId)
    .maybeSingle();

  if (readBackErr) {
    throw new Error(
      `Database row delete requested, but verification read-back failed: ${readBackErr.message}. Row removal unconfirmed.`
    );
  }

  if (readBackRow !== null) {
    throw new Error(
      'Database record was not removed (row remains present in database, possible RLS restriction).'
    );
  }
}

/**
 * Removes one attached photo in Edit Project.
 * Safe order:
 * 1. Request storage deletion.
 * 2. Confirm the exact object is absent using an owner-authorized storage listing.
 *    (A failed listing is inconclusive; stops and keeps database row).
 * 3. Delete project_media row.
 * 4. Confirm the row is absent via read-back with the authenticated session.
 *
 * If storage deletion succeeds and file is confirmed absent, but database row delete or read-back fails,
 * throws an error with `isStorageDeleted: true` so the caller can keep the modal open,
 * mark the row as missing from storage, and allow retrying only the database delete.
 *
 * @param {Object} params
 * @param {Object} params.supabaseClient
 * @param {string} params.projectId
 * @param {string} params.mediaId
 * @param {string} params.path
 * @param {boolean} [params.skipStorageDelete=false]
 * @returns {Promise<void>}
 */
export async function deleteSingleProjectPhoto({
  supabaseClient,
  projectId,
  mediaId,
  path,
  skipStorageDelete = false,
}) {
  if (!supabaseClient) throw new Error('Supabase client is required.');
  if (!mediaId) throw new Error('Media ID is required for photo removal.');
  if (!path && !skipStorageDelete) throw new Error('Storage path is required for photo removal.');

  const folderId = projectId || (path ? path.split('/')[0] : null);
  if (!folderId) throw new Error('Project ID is required for photo removal.');

  const prefix = `${folderId}/`;
  if (path && (!path.startsWith(prefix) || path.length <= prefix.length || path.includes('..'))) {
    throw new Error(`Data integrity error: storage path "${path}" is outside project folder "${prefix}".`);
  }

  const fileName = path ? path.slice(prefix.length) : '';

  // 1. Storage deletion and confirmation (unless already confirmed absent or skipped)
  if (!skipStorageDelete) {
    const { error: storageError } = await supabaseClient.storage
      .from('project-media')
      .remove([path]);

    if (storageError) {
      throw new Error(
        `Failed to remove photo from storage (${storageError.message}). Database record was preserved.`
      );
    }

    // Confirm the exact object is absent using an owner-authorized storage listing
    let storageObjects = [];
    try {
      storageObjects = await listAllProjectStorageObjects(supabaseClient, folderId);
    } catch (listErr) {
      throw new Error(
        `Storage deletion requested, but verifying file absence was inconclusive (${listErr.message}). Database record was preserved.`
      );
    }

    const fileStillPresent = storageObjects.some(
      (item) => item.name === fileName || item.name === path
    );
    if (fileStillPresent) {
      throw new Error(
        `Storage deletion requested, but the file remains present in storage. Database record was preserved.`
      );
    }
  }

  // 2. Delete database row only after storage deletion is confirmed
  const { error: dbError } = await supabaseClient
    .from('project_media')
    .delete()
    .eq('id', mediaId);

  if (dbError) {
    const error = new Error(
      `Photo file was confirmed deleted from storage, but database row removal failed: ${dbError.message}`
    );
    error.isStorageDeleted = true;
    error.mediaId = mediaId;
    throw error;
  }

  // 3. Confirm that row is absent via read-back using the same authenticated session
  const { data: readBackRow, error: readBackErr } = await supabaseClient
    .from('project_media')
    .select('id')
    .eq('id', mediaId)
    .maybeSingle();

  if (readBackErr) {
    const error = new Error(
      `Photo file was confirmed deleted from storage and delete requested, but database verification read-back failed: ${readBackErr.message}. Record removal unconfirmed.`
    );
    error.isStorageDeleted = true;
    error.mediaId = mediaId;
    throw error;
  }

  if (readBackRow !== null) {
    const error = new Error(
      'Photo file was confirmed deleted from storage, but the database record is still present (deletion was silently blocked or not applied).'
    );
    error.isStorageDeleted = true;
    error.mediaId = mediaId;
    throw error;
  }
}

/**
 * Cleans up all storage objects belonging to a project before the project record is deleted.
 *
 * Safeguards:
 * 1. Confirms current authenticated user owns the project (projects.user_id === currentUserId).
 * 2. Scopes all removals strictly to the exact project prefix `<project_id>/`.
 *    Validates every project_media path; halts with integrity error if any path is outside the prefix.
 * 3. Collects all listing pages before deleting (no skipping due to shifted pagination).
 *    Enumerates all objects under `<project_id>/` including untracked files.
 * 4. Removes discovered objects.
 * 5. Re-lists the project folder and confirms 0 remaining objects. If verification fails or files remain, stops.
 *
 * @param {Object} params
 * @param {Object} params.supabaseClient
 * @param {string} params.projectId
 * @param {string} params.currentUserId
 * @returns {Promise<{ deletedFilesCount: number, confirmedEmpty: boolean, hadPhotos: boolean }>}
 */
export async function cleanupProjectMediaBeforeDelete({
  supabaseClient,
  projectId,
  currentUserId,
}) {
  if (!supabaseClient) throw new Error('Supabase client is required.');
  if (!projectId) throw new Error('Project ID is required for cleanup.');
  if (!currentUserId) throw new Error('Authenticated user ID is required for ownership verification.');

  // 1. Confirm current user owns the project
  const { data: projectRow, error: projectFetchErr } = await supabaseClient
    .from('projects')
    .select('id, user_id')
    .eq('id', projectId)
    .single();

  if (projectFetchErr || !projectRow) {
    throw new Error(
      `Unable to verify project ownership: ${projectFetchErr?.message || 'Project not found.'}. Deletion stopped.`
    );
  }

  if (projectRow.user_id !== currentUserId) {
    throw new Error('Unauthorized: You are not the owner of this project. Deletion stopped.');
  }

  const prefix = `${projectId}/`;

  // 2. Query project_media rows
  const { data: mediaRows, error: fetchError } = await supabaseClient
    .from('project_media')
    .select('id, path')
    .eq('project_id', projectId);

  if (fetchError) {
    throw new Error(
      `Failed to query attached photos prior to project deletion: ${fetchError.message}. Deletion stopped.`
    );
  }

  // Validate every project_media path is strictly within `<project_id>/`
  for (const row of mediaRows || []) {
    if (!row.path || typeof row.path !== 'string') {
      throw new Error(`Integrity error: project_media row ${row.id} has invalid path. Deletion stopped.`);
    }
    if (!row.path.startsWith(prefix) || row.path.length <= prefix.length || row.path.includes('..')) {
      throw new Error(
        `Integrity error: project_media path "${row.path}" is outside project prefix "${prefix}". Storage removal stopped.`
      );
    }
  }

  // 3. Enumerate all objects under `<project_id>/` (collecting all pages before deleting)
  const storageObjects = await listAllProjectStorageObjects(supabaseClient, projectId);

  // Validate enumerated storage objects
  const allPathsSet = new Set();
  (mediaRows || []).forEach((r) => allPathsSet.add(r.path));
  for (const item of storageObjects) {
    if (item.name) {
      if (item.name.includes('..') || item.name.startsWith('/')) {
        throw new Error(`Integrity error: storage object "${item.name}" has invalid characters. Deletion stopped.`);
      }
      allPathsSet.add(`${projectId}/${item.name}`);
    }
  }

  const combinedPaths = Array.from(allPathsSet);
  const hadPhotos = combinedPaths.length > 0;

  // 4. Remove discovered storage objects
  if (combinedPaths.length > 0) {
    const { error: storageError } = await supabaseClient.storage
      .from('project-media')
      .remove(combinedPaths);

    if (storageError) {
      throw new Error(
        `Failed to remove ${combinedPaths.length} photo file(s) from storage (${storageError.message}). Project deletion was stopped to avoid leaving orphaned files.`
      );
    }
  }

  // 5. Re-list project folder and confirm it is completely empty
  const remainingObjects = await listAllProjectStorageObjects(supabaseClient, projectId);
  if (remainingObjects.length > 0) {
    throw new Error(
      `Storage folder "${projectId}" still contains ${remainingObjects.length} object(s) after cleanup. Project deletion stopped.`
    );
  }

  return {
    deletedFilesCount: combinedPaths.length,
    confirmedEmpty: true,
    hadPhotos,
  };
}

/**
 * Inspects whether a project's storage folder is confirmed empty and checks project_media row count.
 * Used by DeleteConfirmModal to determine whether storage cleanup already succeeded
 * even across modal closes or page reloads.
 *
 * @param {Object} params
 * @param {Object} params.supabaseClient
 * @param {string} params.projectId
 * @returns {Promise<{ storageConfirmedEmpty: boolean, storageCount: number, mediaCount: number, hadPhotosRemoved: boolean }>}
 */
export async function checkProjectStorageStatus({
  supabaseClient,
  projectId,
}) {
  if (!supabaseClient || !projectId) {
    return { storageConfirmedEmpty: false, storageCount: 0, mediaCount: 0, hadPhotosRemoved: false };
  }

  try {
    const [storageObjects, mediaRes] = await Promise.all([
      listAllProjectStorageObjects(supabaseClient, projectId),
      supabaseClient.from('project_media').select('id', { count: 'exact', head: true }).eq('project_id', projectId),
    ]);

    const storageCount = Array.isArray(storageObjects) ? storageObjects.length : 0;
    const mediaCount = typeof mediaRes.count === 'number' ? mediaRes.count : 0;
    const storageConfirmedEmpty = storageCount === 0;

    // A project only has "photos already removed" if there were media rows recorded
    // in the database but the storage objects have already been cleaned up!
    const hadPhotosRemoved = storageConfirmedEmpty && mediaCount > 0;

    return {
      storageConfirmedEmpty,
      storageCount,
      mediaCount,
      hadPhotosRemoved,
    };
  } catch (err) {
    console.warn('Failed to check project storage status:', err);
    return { storageConfirmedEmpty: false, storageCount: 0, mediaCount: 0, hadPhotosRemoved: false };
  }
}

/**
 * Mentra Phase 7 Step 6: In-memory cache for project gallery media with signed URLs.
 * Maps projectId -> { media: Array, expiresAt: number, fetchedAt: number }
 */
const gallerySignedUrlCache = new Map();

/**
 * Invalidates the gallery signed URL cache for a specific project (or all projects).
 *
 * @param {string} [projectId]
 */
export function invalidateGalleryMediaCache(projectId) {
  if (projectId) {
    gallerySignedUrlCache.delete(projectId);
  } else {
    gallerySignedUrlCache.clear();
  }
}

/**
 * Fetches gallery photos for a project ordered deterministically by position, then created_at.
 * Uses 3600-second private-bucket signed URLs and in-memory caching to avoid repeated fetches.
 *
 * Requirements:
 * - Load project_media records ordered by position, then created_at.
 * - Ignore invalid or duplicate positions safely and never return more than 5 photos.
 * - Use only private-bucket signed-link method with 3600-second expiry.
 * - Cache signed URLs for current view so repeated renders do not re-request.
 * - Handle RLS errors, missing rows, and link failures gracefully.
 *
 * @param {Object} supabaseClient
 * @param {string} projectId
 * @param {Object} [options]
 * @param {boolean} [options.forceRefresh=false]
 * @returns {Promise<Array<Object>>}
 */
export async function fetchProjectGalleryMedia(
  supabaseClient,
  projectId,
  { forceRefresh = false } = {}
) {
  if (!supabaseClient || !projectId) return [];

  // 1. Check in-memory cache unless forceRefresh is requested
  if (!forceRefresh && gallerySignedUrlCache.has(projectId)) {
    const cached = gallerySignedUrlCache.get(projectId);
    // Return cached items if still comfortably within the 3600-second lifetime
    if (Date.now() < cached.expiresAt) {
      return cached.media;
    }
  }

  // 2. Query project_media ordered deterministically by position ASC, then created_at ASC
  let mediaRows = null;
  try {
    const { data, error } = await supabaseClient
      .from('project_media')
      .select('id, project_id, path, position, created_at')
      .eq('project_id', projectId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      console.warn(`Gallery query error for project ${projectId}:`, error.message);
      return [];
    }
    mediaRows = data || [];
  } catch (err) {
    console.warn(`Gallery network or RLS error for project ${projectId}:`, err.message);
    return [];
  }

  if (mediaRows.length === 0) {
    // Cache empty result temporarily (60s) to avoid repeating query on quick re-renders
    gallerySignedUrlCache.set(projectId, {
      media: [],
      expiresAt: Date.now() + 60 * 1000,
      fetchedAt: Date.now(),
    });
    return [];
  }

  // 3. Filter valid positions in [0..4] and ignore duplicate positions safely (max 5 photos)
  const validRows = [];
  const seenPositions = new Set();
  for (const row of mediaRows) {
    const pos = Number(row?.position);
    if (!Number.isNaN(pos) && pos >= 0 && pos < MAX_PROJECT_PHOTOS && !seenPositions.has(pos)) {
      seenPositions.add(pos);
      validRows.push({ ...row, position: pos });
      if (validRows.length >= MAX_PROJECT_PHOTOS) {
        break;
      }
    }
  }

  if (validRows.length === 0) {
    return [];
  }

  // 4. Request signed links with 3600-second expiry from the private bucket
  const enriched = await Promise.all(
    validRows.map(async (row) => {
      try {
        const { data: signedData, error: signedErr } = await supabaseClient.storage
          .from('project-media')
          .createSignedUrl(row.path, 3600);

        return {
          id: row.id,
          projectId: row.project_id,
          path: row.path,
          position: row.position,
          createdAt: row.created_at,
          signedUrl: signedErr ? null : (signedData?.signedUrl || null),
          signedError: signedErr ? signedErr.message : null,
        };
      } catch (err) {
        return {
          id: row.id,
          projectId: row.project_id,
          path: row.path,
          position: row.position,
          createdAt: row.created_at,
          signedUrl: null,
          signedError: err.message,
        };
      }
    })
  );

  // 5. Cache signed URLs (valid for 3500 seconds, before 3600s expiry)
  gallerySignedUrlCache.set(projectId, {
    media: enriched,
    expiresAt: Date.now() + 3500 * 1000,
    fetchedAt: Date.now(),
  });

  return enriched;
}
