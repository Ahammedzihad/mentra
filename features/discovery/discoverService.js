import {
  PROGRAM_SPECIALIZATIONS,
  isValidProgram,
  isValidSpecialization,
} from '../../frontend/lib/academicPrograms.js';

let cachedSupabase = null;

/**
 * Resolves the Supabase client.
 * In production Vite environments, lazily imports frontend/lib/supabase.js.
 * In unit testing, accepts an injected mock client to enable boundary verification.
 *
 * @param {Object} [customClient] - Optional Supabase client instance
 * @returns {Promise<Object>}
 */
async function resolveClient(customClient) {
  if (customClient) {
    return customClient;
  }
  if (cachedSupabase) {
    return cachedSupabase;
  }
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
 * Validates Program and Specialization filter criteria against Mentra's canonical academic definitions.
 *
 * Rules:
 * - When Program is provided: must be in CANONICAL_PROGRAMS ('B.Tech', 'BCA', 'BBA', 'B.Des').
 *   If Specialization is also provided, it must be canonical for that specific program.
 * - When Program is omitted/unselected: Specialization (if provided) may match any canonical specialization
 *   across all programs.
 * - Non-canonical or mismatched combinations return { isValid: false }.
 *
 * @param {string} [program]
 * @param {string} [specialization]
 * @returns {{ isValid: boolean, reason?: string }}
 */
export function validateAcademicFilters(program, specialization) {
  const normProg = typeof program === 'string' ? program.trim() : '';
  const normSpec = typeof specialization === 'string' ? specialization.trim() : '';

  if (normProg) {
    if (!isValidProgram(normProg)) {
      return { isValid: false, reason: `Program '${normProg}' is not a canonical program.` };
    }
    if (normSpec && !isValidSpecialization(normProg, normSpec)) {
      return {
        isValid: false,
        reason: `Specialization '${normSpec}' is not valid for canonical program '${normProg}'.`,
      };
    }
  } else if (normSpec) {
    const allCanonicalSpecs = Object.values(PROGRAM_SPECIALIZATIONS).flat();
    if (!allCanonicalSpecs.includes(normSpec)) {
      return {
        isValid: false,
        reason: `Specialization '${normSpec}' is not in the canonical roadmap.`,
      };
    }
  }

  return { isValid: true };
}

/**
 * Extracts and deduplicates all unique tag values across the provided projects.
 * Used to derive the available Tag filter options strictly from projects returned by
 * the normal RLS-protected query, ensuring inaccessible project tags are never exposed.
 *
 * @param {Array<Object>} [projects=[]]
 * @returns {Array<string>} Unique tags sorted alphabetically
 */
export function extractAvailableTags(projects = []) {
  if (!Array.isArray(projects)) return [];

  const seenMap = new Map();

  for (const proj of projects) {
    if (proj && Array.isArray(proj.tags)) {
      for (const tag of proj.tags) {
        if (typeof tag === 'string') {
          const trimmed = tag.trim();
          if (trimmed) {
            const lower = trimmed.toLowerCase();
            if (!seenMap.has(lower)) {
              seenMap.set(lower, trimmed);
            }
          }
        }
      }
    }
  }

  return Array.from(seenMap.values()).sort((a, b) => a.localeCompare(b));
}

/**
 * Sorts items newest first using each row's `created_at` timestamp.
 * Rows with missing, null, or invalid timestamps are consistently placed at the end.
 *
 * @param {Array<Object>} [items=[]]
 * @returns {Array<Object>}
 */
export function sortNewestFirst(items = []) {
  if (!Array.isArray(items)) return [];

  return [...items].sort((a, b) => {
    const timeA = a && a.created_at ? new Date(a.created_at).getTime() : NaN;
    const timeB = b && b.created_at ? new Date(b.created_at).getTime() : NaN;

    const validA = !Number.isNaN(timeA);
    const validB = !Number.isNaN(timeB);

    if (validA && validB) {
      return timeB - timeA; // Descending (newest first)
    }
    if (validA && !validB) {
      return -1; // Valid timestamp placed before missing/invalid
    }
    if (!validA && validB) {
      return 1; // Missing/invalid timestamp placed last
    }
    return 0;
  });
}

/**
 * Filters the people collection using the explicit Phase 5 Step 3 filter-scope rules:
 * - Free-text search: Case-insensitive substring match against `full_name`.
 * - Program: Matches stored profile value (`program`).
 * - Specialization: Matches stored profile value (`specialization`).
 * - Year: Matches stored profile value (`year`).
 * - Tag filter: Not applied to people (people records do not hold project tags).
 * - All active filters combine with AND logic.
 *
 * @param {Array<Object>} [people=[]]
 * @param {Object} [filters={}]
 * @returns {Array<Object>}
 */
export function filterPeople(people = [], filters = {}) {
  if (!Array.isArray(people)) return [];

  const searchQuery = typeof filters.search === 'string' ? filters.search.trim().toLowerCase() : '';
  const programFilter = typeof filters.program === 'string' ? filters.program.trim() : '';
  const specFilter = typeof filters.specialization === 'string' ? filters.specialization.trim() : '';
  const yearFilter = typeof filters.year === 'string' ? filters.year.trim() : '';

  const academicValidation = validateAcademicFilters(programFilter, specFilter);
  if (!academicValidation.isValid) {
    return [];
  }

  return people.filter((person) => {
    if (!person || typeof person !== 'object') return false;

    // 1. Free-text search on full_name
    if (searchQuery) {
      const name = typeof person.full_name === 'string' ? person.full_name.toLowerCase() : '';
      if (!name.includes(searchQuery)) {
        return false;
      }
    }

    // 2. Program filter
    if (programFilter) {
      if (person.program !== programFilter) {
        return false;
      }
    }

    // 3. Specialization filter
    if (specFilter) {
      if (person.specialization !== specFilter) {
        return false;
      }
    }

    // 4. Year filter
    if (yearFilter) {
      if (person.year !== yearFilter) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Filters the projects collection using the explicit Phase 5 Step 3 filter-scope rules:
 * - Free-text search: Case-insensitive substring match against project `title` OR any individual tag in `tags`.
 *   (Strictly excludes project description and creator name).
 * - Tag filter: Case-insensitive exact match against any individual tag in `tags`.
 * - Program filter: Matches the project owner's profile `program`.
 * - Specialization filter: Matches the project owner's profile `specialization`.
 * - Year filter: Matches the project owner's profile `year`.
 * - All active filters combine with AND logic.
 *
 * @param {Array<Object>} [projects=[]]
 * @param {Object} [filters={}]
 * @returns {Array<Object>}
 */
export function filterProjects(projects = [], filters = {}) {
  if (!Array.isArray(projects)) return [];

  const searchQuery = typeof filters.search === 'string' ? filters.search.trim().toLowerCase() : '';
  const tagFilter = typeof filters.tag === 'string' ? filters.tag.trim().toLowerCase() : '';
  const programFilter = typeof filters.program === 'string' ? filters.program.trim() : '';
  const specFilter = typeof filters.specialization === 'string' ? filters.specialization.trim() : '';
  const yearFilter = typeof filters.year === 'string' ? filters.year.trim() : '';

  const academicValidation = validateAcademicFilters(programFilter, specFilter);
  if (!academicValidation.isValid) {
    return [];
  }

  return projects.filter((project) => {
    if (!project || typeof project !== 'object') return false;

    // 1. Free-text search: project title OR individual tag in tags array
    if (searchQuery) {
      const title = typeof project.title === 'string' ? project.title.toLowerCase() : '';
      const matchesTitle = title.includes(searchQuery);

      const matchesTag =
        Array.isArray(project.tags) &&
        project.tags.some((tag) => typeof tag === 'string' && tag.toLowerCase().includes(searchQuery));

      if (!matchesTitle && !matchesTag) {
        return false;
      }
    }

    // 2. Tag filter (applies to projects only; matches an individual tag case-insensitively)
    if (tagFilter) {
      const hasMatchingTag =
        Array.isArray(project.tags) &&
        project.tags.some((tag) => typeof tag === 'string' && tag.toLowerCase() === tagFilter);

      if (!hasMatchingTag) {
        return false;
      }
    }

    // Normalize owner profile from joined relation (profiles:user_id)
    const owner = Array.isArray(project.profiles)
      ? project.profiles[0]
      : (project.profiles || project.profile || {});

    // 3. Program filter applies to project owner's profile
    if (programFilter) {
      if (owner.program !== programFilter) {
        return false;
      }
    }

    // 4. Specialization filter applies to project owner's profile
    if (specFilter) {
      if (owner.specialization !== specFilter) {
        return false;
      }
    }

    // 5. Year filter applies to project owner's profile
    if (yearFilter) {
      if (owner.year !== yearFilter) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Main Discover query execution service for Phase 5 Step 3.
 *
 * Retrieves visible projects and directory profiles using Supabase, respecting database RLS
 * policies for project visibility, and applies client-side search, multi-criteria filtering,
 * and newest-first sorting.
 *
 * Projection security:
 * - Projects: id, title, description, tags, visibility, created_at, user_id, profiles:user_id(...)
 * - Profiles: id, full_name, role, program, specialization, year, created_at
 * - Strictly excludes profile email (PII protection) and omits bio.
 *
 * @param {Object} [filters={}] - Filter criteria (search, tag, program, specialization, year, client)
 * @param {Object} [clientOverride=null] - Optional Supabase client injection for testing
 * @returns {Promise<{ people: Array<Object>, projects: Array<Object>, availableTags: Array<string> }>}
 */
export async function fetchDiscoverData(filters = {}, clientOverride = null) {
  const client = await resolveClient(clientOverride || filters.client);

  if (!client || typeof client.from !== 'function') {
    throw new Error('A valid Supabase client instance with .from() is required.');
  }

  // 1. Query projects (RLS projects_select_policy restricts visibility to owner, shared, or college/public)
  const projectsPromise = client
    .from('projects')
    .select(
      'id, title, description, tags, visibility, created_at, user_id, profiles:user_id(id, full_name, role, program, specialization, year)'
    )
    .order('created_at', { ascending: false });

  // 2. Query directory profiles (safe collegiate columns only; email and bio omitted)
  const peoplePromise = client
    .from('profiles')
    .select('id, full_name, role, program, specialization, year, created_at')
    .order('created_at', { ascending: false });

  const [projectsResult, peopleResult] = await Promise.all([projectsPromise, peoplePromise]);

  if (projectsResult.error) {
    console.error('Error fetching projects for Discover:', projectsResult.error);
    throw new Error(projectsResult.error.message || 'Failed to retrieve projects.');
  }

  if (peopleResult.error) {
    console.error('Error fetching people for Discover:', peopleResult.error);
    throw new Error(peopleResult.error.message || 'Failed to retrieve directory profiles.');
  }

  const rawProjects = projectsResult.data || [];
  const rawPeople = peopleResult.data || [];

  // Extract available tags only from projects returned by the RLS-protected query
  const availableTags = extractAvailableTags(rawProjects);

  // Apply search and active filters with AND logic
  const filteredProjects = filterProjects(rawProjects, filters);
  const filteredPeople = filterPeople(rawPeople, filters);

  return {
    people: sortNewestFirst(filteredPeople),
    projects: sortNewestFirst(filteredProjects),
    availableTags,
  };
}
