/**
 * Canonical Academic Programs and Specializations
 * Phase 5, Step 1 — Locked Founder-Approved Definitions
 *
 * Total: 4 Programs, 22 Specializations
 */

export const CANONICAL_PROGRAMS = Object.freeze([
  'B.Tech',
  'BCA',
  'BBA',
  'B.Des',
]);

export const PROGRAM_SPECIALIZATIONS = Object.freeze({
  'B.Tech': Object.freeze([
    'AI & Machine Learning',
    'AI & Data Science',
    'Computer Science and Engineering',
    'Cyber Security',
    'Blockchain',
    'Internet of Things (IoT)',
  ]),
  'BCA': Object.freeze([
    'AI & Data Science',
    'AI & Machine Learning',
    'Python Full Stack',
    'MERN Stack',
    'Flutter Development',
    'Cyber Security',
    'Blockchain',
    'UI/UX Designing',
  ]),
  'BBA': Object.freeze([
    'Digital Marketing',
    'Business Analytics',
    'Aviation & Logistics',
    'Hospital Administration',
    'Film Making',
  ]),
  'B.Des': Object.freeze([
    'Interaction Design (UI/UX systems)',
    'Communication Design',
    'Arts & Crafts Design',
  ]),
});

/**
 * Validates if the given program is one of the 4 canonical programs.
 * @param {string} program
 * @returns {boolean}
 */
export function isValidProgram(program) {
  return typeof program === 'string' && CANONICAL_PROGRAMS.includes(program);
}

/**
 * Retrieves the canonical specializations for a given program.
 * @param {string} program
 * @returns {readonly string[]}
 */
export function getSpecializationsForProgram(program) {
  if (!isValidProgram(program)) {
    return [];
  }
  return PROGRAM_SPECIALIZATIONS[program] || [];
}

/**
 * Validates if the given specialization belongs to the specified program.
 * @param {string} program
 * @param {string} specialization
 * @returns {boolean}
 */
export function isValidSpecialization(program, specialization) {
  if (!isValidProgram(program) || typeof specialization !== 'string') {
    return false;
  }
  const specs = PROGRAM_SPECIALIZATIONS[program];
  return Boolean(specs && specs.includes(specialization));
}
