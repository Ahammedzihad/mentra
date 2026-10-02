/**
 * Self-Reported Skills and Achievements Validation & Normalization
 * Mentra Phase 5 Update
 *
 * Rules:
 * - Skills: up to 15 entries, each up to 50 characters.
 * - Achievements: up to 10 entries, each up to 200 characters.
 * - Trim and collapse whitespace while preserving display capitalization and punctuation (e.g. C++, C#, Node.js).
 * - Remove case-insensitive duplicates.
 * - Clear error feedback without erasing previously saved values.
 * - Clearly documented as self-reported / unverified.
 */

export const MAX_SKILLS_COUNT = 15;
export const MAX_SKILL_LENGTH = 50;

export const MAX_ACHIEVEMENTS_COUNT = 10;
export const MAX_ACHIEVEMENT_LENGTH = 200;

/**
 * Trims leading/trailing whitespace and collapses consecutive internal whitespace
 * into a single space. Preserves display capitalization and punctuation.
 *
 * @param {unknown} raw
 * @returns {string}
 */
export function cleanSelfReportedEntry(raw) {
  if (typeof raw !== 'string') return '';
  return raw.trim().replace(/\s+/g, ' ');
}

/**
 * Validates a candidate skill entry against the current skills array.
 *
 * @param {unknown} candidate
 * @param {string[]} [currentSkills=[]]
 * @returns {{ valid: boolean, cleaned?: string, error?: string, ignored?: boolean }}
 */
export function validateSkillEntry(candidate, currentSkills = []) {
  if (candidate === undefined || candidate === null) {
    return { valid: false, ignored: true };
  }
  const cleaned = cleanSelfReportedEntry(candidate);
  if (!cleaned) {
    return { valid: false, ignored: true, error: 'Please enter a skill.' };
  }
  if (cleaned.length > MAX_SKILL_LENGTH) {
    return {
      valid: false,
      cleaned,
      error: `Skill entry cannot exceed ${MAX_SKILL_LENGTH} characters (currently ${cleaned.length}).`,
    };
  }
  const lower = cleaned.toLowerCase();
  const exists = currentSkills.some((s) => cleanSelfReportedEntry(s).toLowerCase() === lower);
  if (exists) {
    return {
      valid: false,
      cleaned,
      error: `"${cleaned}" has already been added to your skills.`,
    };
  }
  if (currentSkills.length >= MAX_SKILLS_COUNT) {
    return {
      valid: false,
      cleaned,
      error: `Maximum ${MAX_SKILLS_COUNT} skills allowed.`,
    };
  }
  return { valid: true, cleaned };
}

/**
 * Validates a candidate achievement entry against the current achievements array.
 *
 * @param {unknown} candidate
 * @param {string[]} [currentAchievements=[]]
 * @returns {{ valid: boolean, cleaned?: string, error?: string, ignored?: boolean }}
 */
export function validateAchievementEntry(candidate, currentAchievements = []) {
  if (candidate === undefined || candidate === null) {
    return { valid: false, ignored: true };
  }
  const cleaned = cleanSelfReportedEntry(candidate);
  if (!cleaned) {
    return { valid: false, ignored: true, error: 'Please enter an achievement.' };
  }
  if (cleaned.length > MAX_ACHIEVEMENT_LENGTH) {
    return {
      valid: false,
      cleaned,
      error: `Achievement entry cannot exceed ${MAX_ACHIEVEMENT_LENGTH} characters (currently ${cleaned.length}).`,
    };
  }
  const lower = cleaned.toLowerCase();
  const exists = currentAchievements.some((a) => cleanSelfReportedEntry(a).toLowerCase() === lower);
  if (exists) {
    return {
      valid: false,
      cleaned,
      error: `"${cleaned}" has already been added to your achievements.`,
    };
  }
  if (currentAchievements.length >= MAX_ACHIEVEMENTS_COUNT) {
    return {
      valid: false,
      cleaned,
      error: `Maximum ${MAX_ACHIEVEMENTS_COUNT} achievements allowed.`,
    };
  }
  return { valid: true, cleaned };
}

/**
 * Normalizes an array of skills, validating limits and removing case-insensitive
 * duplicates while preserving display casing and punctuation.
 *
 * @param {unknown} rawList
 * @returns {string[]}
 */
export function normalizeSkillsList(rawList) {
  if (!Array.isArray(rawList)) return [];
  const seen = new Set();
  const result = [];
  for (const item of rawList) {
    if (typeof item !== 'string') continue;
    const cleaned = cleanSelfReportedEntry(item);
    if (!cleaned) continue;
    if (cleaned.length > MAX_SKILL_LENGTH) {
      throw new Error(`Skill entry cannot exceed ${MAX_SKILL_LENGTH} characters: "${cleaned.slice(0, 20)}..."`);
    }
    const lower = cleaned.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      result.push(cleaned);
    }
  }
  if (result.length > MAX_SKILLS_COUNT) {
    throw new Error(`Maximum ${MAX_SKILLS_COUNT} skills allowed.`);
  }
  return result;
}

/**
 * Normalizes an array of achievements, validating limits and removing case-insensitive
 * duplicates while preserving display casing and punctuation.
 *
 * @param {unknown} rawList
 * @returns {string[]}
 */
export function normalizeAchievementsList(rawList) {
  if (!Array.isArray(rawList)) return [];
  const seen = new Set();
  const result = [];
  for (const item of rawList) {
    if (typeof item !== 'string') continue;
    const cleaned = cleanSelfReportedEntry(item);
    if (!cleaned) continue;
    if (cleaned.length > MAX_ACHIEVEMENT_LENGTH) {
      throw new Error(`Achievement entry cannot exceed ${MAX_ACHIEVEMENT_LENGTH} characters: "${cleaned.slice(0, 20)}..."`);
    }
    const lower = cleaned.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      result.push(cleaned);
    }
  }
  if (result.length > MAX_ACHIEVEMENTS_COUNT) {
    throw new Error(`Maximum ${MAX_ACHIEVEMENTS_COUNT} achievements allowed.`);
  }
  return result;
}
