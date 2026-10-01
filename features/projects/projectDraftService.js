/**
 * Mentra Phase 6 Part A, Step 2 — Project Draft Service
 *
 * Connects the Step 1 Personal AI project draft contract to the project creation flow.
 *
 * Core Security & Invariant Guarantees:
 * 1. AI Contract: Invokes personal-ai Edge Function with { mode: 'project_draft', prompt }.
 * 2. Form Population: Consumes structured draft ({ title, description, tags }) to pre-fill the project form.
 * 3. Tag Handling: Sanitizes tags adhering to Mentra Phase 4 requirements (max 6, lowercase, <=24 chars).
 * 4. Private Default Boundary: Every AI-assisted project is unconditionally assigned `visibility: 'private'`
 *    at the insert boundary by trusted application code. Any model- or draft-supplied visibility is ignored.
 * 5. Authenticated Owner Boundary: Project user_id is derived strictly from the active authenticated session.
 *    Any model- or draft-supplied user identity is ignored.
 * 6. Single INSERT Path: Reuses the application's normal authenticated project INSERT path.
 * 7. Manual Preservation: Manual project creation behavior, validation, and visibility choices remain unchanged.
 * 8. Error Handling: Rejects malformed, incomplete, or failed AI outputs without creating database records.
 */

let cachedSupabase = null;

async function resolveClient(customClient) {
  if (customClient) return customClient;
  if (cachedSupabase) return cachedSupabase;
  try {
    const mod = await import('../../frontend/lib/supabase.js');
    cachedSupabase = mod.supabase;
    return cachedSupabase;
  } catch (err) {
    throw new Error(
      `Supabase client resolution failed: ${err.message}. An explicit client must be provided in non-Vite environments.`
    );
  }
}

/**
 * Normalizes tags according to Phase 4 rules:
 * - lowercase, trimmed
 * - <= 24 characters
 * - letters, numbers, spaces, hyphens (/^[a-z0-9 -]+$/)
 * - deduplicated
 * - max 6 tags
 */
export function normalizeDraftTags(rawTags) {
  if (!Array.isArray(rawTags)) return [];
  const normalized = [];
  for (const item of rawTags) {
    if (typeof item !== 'string') continue;
    const trimmed = item.trim().toLowerCase();
    if (!trimmed) continue;
    if (trimmed.length > 24) continue;
    if (!/^[a-z0-9 -]+$/.test(trimmed)) continue;
    if (normalized.includes(trimmed)) continue;
    normalized.push(trimmed);
    if (normalized.length >= 6) break;
  }
  return normalized;
}

/**
 * Requests a structured project draft from the Personal AI Edge Function.
 *
 * @param {Object} params
 * @param {string} params.prompt - Plain language project description
 * @param {Object} [params.clientOverride] - Optional injected client for testing
 * @returns {Promise<{ title: string, description: string, tags: string[] }>}
 */
export async function requestProjectDraft({ prompt, clientOverride = null }) {
  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    throw new Error('Please enter a project prompt to generate an AI draft.');
  }

  const trimmedPrompt = prompt.trim();
  if (trimmedPrompt.length > 2000) {
    throw new Error('Project prompt cannot exceed 2,000 characters.');
  }

  const client = await resolveClient(clientOverride);

  const { data, error } = await client.functions.invoke('personal-ai', {
    body: {
      mode: 'project_draft',
      prompt: trimmedPrompt,
    },
  });

  if (error) {
    let errorMsg = error.message || 'Personal AI service error';
    if (error.context) {
      try {
        const bodyJson = await error.context.json();
        if (bodyJson?.message) errorMsg = bodyJson.message;
      } catch {}
    }
    throw new Error(errorMsg);
  }

  if (data?.error) {
    throw new Error(data.message || data.error);
  }

  if (!data?.draft || typeof data.draft !== 'object') {
    throw new Error('The AI model returned an incomplete response without a project draft.');
  }

  const { title, description, tags } = data.draft;

  if (typeof title !== 'string' || !title.trim()) {
    throw new Error('The AI draft is missing a valid project title.');
  }

  if (typeof description !== 'string' || !description.trim()) {
    throw new Error('The AI draft is missing a valid project description.');
  }

  if (!Array.isArray(tags)) {
    throw new Error('The AI draft returned invalid tags format.');
  }

  // Trusted boundary: return ONLY structured content fields.
  // Explicitly ignore any model- or draft-supplied visibility, owner, or status properties.
  return {
    title: title.trim(),
    description: description.trim(),
    tags: normalizeDraftTags(tags),
  };
}

/**
 * Prepares and validates a project payload for database insertion.
 * Enforces authenticated owner identity and assigns `visibility: 'private'` for AI-assisted projects.
 *
 * @param {Object} params
 * @param {string} params.title
 * @param {string} params.description
 * @param {string[]} [params.tags]
 * @param {string} [params.visibility]
 * @param {boolean} [params.isAiAssisted]
 * @param {Object} params.user - Authenticated user object
 * @param {Array} [params.stagedUsers] - Scholars for 'selected' visibility
 * @returns {{ projectPayload: Object, shareRows: Array }}
 */
export function prepareProjectInsert({
  title,
  description,
  tags = [],
  visibility = 'college',
  isAiAssisted = false,
  user,
  stagedUsers = [],
}) {
  if (!user || !user.id) {
    throw new Error('You must be authenticated to create a project.');
  }

  if (!title || typeof title !== 'string' || !title.trim()) {
    throw new Error('Please provide a project title.');
  }

  if (!description || typeof description !== 'string' || !description.trim()) {
    throw new Error('Please provide a project description or abstract.');
  }

  if (Array.isArray(tags) && tags.length > 6) {
    throw new Error('Too many tags — please use 6 or fewer.');
  }

  // Security Invariant 1:
  // For AI-assisted projects, visibility MUST be strictly 'private' at the insert boundary.
  // For manual projects, preserve user-selected visibility.
  const effectiveVisibility = isAiAssisted ? 'private' : (visibility || 'college');

  // Security Invariant 2:
  // Owner is derived strictly from the authenticated session (user.id).
  const effectiveUserId = user.id;

  const projectPayload = {
    user_id: effectiveUserId,
    title: title.trim(),
    description: description.trim(),
    visibility: effectiveVisibility,
    tags: normalizeDraftTags(tags),
  };

  const shareRows =
    effectiveVisibility === 'selected' && Array.isArray(stagedUsers)
      ? stagedUsers
          .filter((u) => u && u.id && u.id !== effectiveUserId)
          .map((u) => ({ shared_with: u.id }))
      : [];

  return { projectPayload, shareRows };
}

/**
 * Executes project insertion through the application's normal authenticated project INSERT path.
 *
 * @param {Object} params
 * @param {Object} params.projectPayload
 * @param {Array} [params.shareRows]
 * @param {Object} [params.clientOverride]
 * @returns {Promise<Object>} Created project row
 */
export async function insertProjectRecord({
  projectPayload,
  shareRows = [],
  clientOverride = null,
}) {
  const client = await resolveClient(clientOverride);

  const { data: projectData, error: insertError } = await client
    .from('projects')
    .insert([projectPayload])
    .select('*, profiles:user_id(full_name, department, role, is_verified)')
    .single();

  if (insertError) throw insertError;

  if (projectPayload.visibility === 'selected' && shareRows.length > 0) {
    const shareInsertRows = shareRows.map((s) => ({
      project_id: projectData.id,
      shared_with: s.shared_with,
    }));

    const { error: shareInsertError } = await client
      .from('project_shares')
      .insert(shareInsertRows);

    if (shareInsertError) {
      console.error('Error creating project shares:', shareInsertError);
    }
  }

  return projectData;
}

/**
 * Complete AI-assisted project creation workflow:
 * requests draft, populates fields, validates & forces visibility='private', and inserts into database.
 */
export async function executeAiProjectDraftFlow({
  prompt,
  user,
  clientOverride = null,
  overrideFields = {},
}) {
  const draft = await requestProjectDraft({ prompt, clientOverride });

  const finalTitle = overrideFields.title !== undefined ? overrideFields.title : draft.title;
  const finalDesc = overrideFields.description !== undefined ? overrideFields.description : draft.description;
  const finalTags = overrideFields.tags !== undefined ? overrideFields.tags : draft.tags;

  const { projectPayload, shareRows } = prepareProjectInsert({
    title: finalTitle,
    description: finalDesc,
    tags: finalTags,
    visibility: overrideFields.visibility,
    isAiAssisted: true,
    user,
    stagedUsers: [],
  });

  return await insertProjectRecord({ projectPayload, shareRows, clientOverride });
}
