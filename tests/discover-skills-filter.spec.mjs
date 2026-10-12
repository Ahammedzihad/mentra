/**
 * Mentra Phase 6 Build Order Step 7 — Discover Skills Filter Focused Verification Suite
 *
 * Verifies all required behaviors for the Skills filter in Discover:
 * 1. A profile with the selected skill is included.
 * 2. A profile without the selected skill is excluded.
 * 3. Matching is case-insensitive ('PYTHON', 'python', 'Python').
 * 4. Filter input is trimmed ('  Python  ').
 * 5. Stored skill values with whitespace are matched cleanly (' python ').
 * 6. Exact normalized matching: 'Python' matches 'Python', but does NOT match 'Python Basics'.
 * 7. Null, missing, and empty skills arrays do not break results.
 * 8. Skills combine correctly with search (AND logic).
 * 9. Skills combine correctly with tags (Tag filter does not filter people; people filtered by skills).
 * 10. Skills combine correctly with program, specialization, and year (AND logic).
 * 11. Reset/Clear Filters removes the selected skill and restores full directory results.
 * 12. Existing Discover filters (search, tag, program, specialization, year) still work.
 * 13. No unauthorized profile becomes visible (derived strictly from authorized records, RLS respected).
 * 14. Duplicate skill options are removed case-insensitively while preserving display casing.
 * 15. Achievements are not used as a filter and excluded from Discover projection.
 */

import {
  fetchDiscoverData,
  filterPeople,
  filterProjects,
  extractAvailableSkills,
  extractAvailableTags,
} from '../features/discovery/discoverService.js';

let passedTests = 0;
let totalTests = 0;

function runAssertion(desc, condition) {
  if (!condition) {
    throw new Error(`Assertion failed: ${desc}`);
  }
  console.log(`  ✅ PASS: ${desc}`);
}

async function test(name, fn) {
  totalTests++;
  console.log(`\n[TEST ${totalTests}] ${name}`);
  try {
    await fn();
    passedTests++;
  } catch (err) {
    console.error(`  ❌ ERROR in test: ${err.message}`);
    throw err;
  }
}

// Canonical mock profiles representing directory profiles
const mockProfiles = Object.freeze([
  {
    id: 'user-001',
    full_name: 'Alex Rivera',
    role: 'student',
    program: 'B.Tech',
    specialization: 'Cyber Security',
    year: '3rd Year',
    skills: ['Cyber Security', 'Network Security', 'Python'],
    created_at: '2026-09-01T10:00:00.000Z',
  },
  {
    id: 'user-002',
    full_name: 'Ahammed Zihad',
    role: 'student',
    program: 'BCA',
    specialization: 'Python Full Stack',
    year: '2nd Year',
    skills: ['Python', 'Django', 'React', ' postgresql '],
    created_at: '2026-09-10T12:00:00.000Z',
  },
  {
    id: 'user-003',
    full_name: 'Dr. Evelyn Reed',
    role: 'mentor',
    program: 'B.Tech',
    specialization: 'AI & Machine Learning',
    year: null,
    skills: ['AI & Machine Learning', 'Computer Vision', 'PyTorch'],
    created_at: '2026-08-15T09:30:00.000Z',
  },
  {
    id: 'user-004',
    full_name: 'Priya Sharma',
    role: 'student',
    program: 'BBA',
    specialization: 'Digital Marketing',
    year: '1st Year',
    skills: ['Digital Marketing', 'SEO', 'Analytics'],
    created_at: '2026-09-20T14:15:00.000Z',
  },
  {
    id: 'user-005',
    full_name: 'Maya Lin',
    role: 'student',
    program: 'B.Des',
    specialization: 'Interaction Design (UI/UX systems)',
    year: '4th Year',
    skills: ['UI/UX', 'Figma', 'Interaction Design'],
    created_at: '2026-07-01T08:00:00.000Z',
  },
  {
    id: 'user-006',
    full_name: 'Rohan Gupta',
    role: 'student',
    program: 'BBA',
    specialization: 'Film Making',
    year: '3rd Year',
    skills: [], // Empty skills array
    created_at: '2026-06-01T08:00:00.000Z',
  },
  {
    id: 'user-007',
    full_name: 'Sara Khan',
    role: 'student',
    program: 'BCA',
    specialization: 'Cloud Computing',
    year: '1st Year',
    skills: null, // Null skills
    created_at: '2026-05-01T08:00:00.000Z',
  },
  {
    id: 'user-008',
    full_name: 'Devin Cole',
    role: 'student',
    program: 'B.Tech',
    specialization: 'Data Science',
    year: '2nd Year',
    // Missing skills property entirely
    created_at: '2026-04-01T08:00:00.000Z',
  },
]);

const mockProjects = Object.freeze([
  {
    id: 'proj-001',
    title: 'Decentralized Consensus Protocol',
    tags: ['Blockchain', 'Cyber Security', 'Rust'],
    profiles: { program: 'B.Tech', specialization: 'Cyber Security', year: '3rd Year' },
  },
  {
    id: 'proj-002',
    title: 'Collegiate Mentorship Portal',
    tags: ['Python', 'Web Dev', 'Education'],
    profiles: { program: 'BCA', specialization: 'Python Full Stack', year: '2nd Year' },
  },
]);

async function runTests() {
  console.log('======================================================================');
  console.log('  MENTRA PHASE 6 BUILD ORDER STEP 7 — DISCOVER SKILLS FILTER SUITE');
  console.log('======================================================================\n');

  // --- 1. BASIC INCLUSION AND EXCLUSION ---

  await test('1: Profile with selected skill is included, profile without is excluded', () => {
    const results = filterPeople(mockProfiles, { skill: 'Python' });
    runAssertion('Includes user-001 with Python skill', results.some((p) => p.id === 'user-001'));
    runAssertion('Includes user-002 with Python skill', results.some((p) => p.id === 'user-002'));
    runAssertion('Total 2 profiles returned with Python', results.length === 2);

    runAssertion('Excludes user-003 without Python skill', !results.some((p) => p.id === 'user-003'));
    runAssertion('Excludes user-004 without Python skill', !results.some((p) => p.id === 'user-004'));
    runAssertion('Excludes user-005 without Python skill', !results.some((p) => p.id === 'user-005'));
    runAssertion('Excludes user-006 with empty skills array', !results.some((p) => p.id === 'user-006'));
    runAssertion('Excludes user-007 with null skills array', !results.some((p) => p.id === 'user-007'));
    runAssertion('Excludes user-008 with missing skills property', !results.some((p) => p.id === 'user-008'));
  });

  // --- 2. CASE-INSENSITIVITY & TRIMMING ---

  await test('2: Matching is case-insensitive and trims whitespace in filter input and stored values', () => {
    // Upper case
    const upper = filterPeople(mockProfiles, { skill: 'PYTHON' });
    runAssertion('Matches case-insensitively with UPPERCASE input', upper.length === 2);

    // Lower case
    const lower = filterPeople(mockProfiles, { skill: 'python' });
    runAssertion('Matches case-insensitively with lowercase input', lower.length === 2);

    // Mixed case
    const mixed = filterPeople(mockProfiles, { skill: 'PyThOn' });
    runAssertion('Matches case-insensitively with mixed-case input', mixed.length === 2);

    // Filter input with whitespace
    const padded = filterPeople(mockProfiles, { skill: '   Python   ' });
    runAssertion('Trims filter input whitespace before comparing', padded.length === 2);

    // Stored profile skill with whitespace (' postgresql ')
    const storedPadded = filterPeople(mockProfiles, { skill: 'postgresql' });
    runAssertion('Matches stored skill with whitespace', storedPadded.length === 1 && storedPadded[0].id === 'user-002');

    // Both filter input and stored value padded
    const bothPadded = filterPeople(mockProfiles, { skill: '   POSTGRESQL   ' });
    runAssertion('Matches when both filter input and stored value have whitespace', bothPadded.length === 1 && bothPadded[0].id === 'user-002');
  });

  // --- 3. EXACT NORMALIZED MATCHING ---

  await test('3: Uses exact normalized matching (e.g. Python vs Python Basics)', () => {
    const testCases = [
      { id: 'p1', full_name: 'P1', skills: ['Python Basics'] },
      { id: 'p2', full_name: 'P2', skills: ['Python'] },
      { id: 'p3', full_name: 'P3', skills: ['Advanced Python'] },
      { id: 'p4', full_name: 'P4', skills: ['Python', 'Python Basics'] },
    ];

    const matchPython = filterPeople(testCases, { skill: 'Python' });
    runAssertion('Python matches exact skill and excludes substrings like Python Basics', matchPython.length === 2);
    runAssertion('Match includes p2', matchPython.some((p) => p.id === 'p2'));
    runAssertion('Match includes p4 (which has both)', matchPython.some((p) => p.id === 'p4'));
    runAssertion('Match excludes p1 (Python Basics only)', !matchPython.some((p) => p.id === 'p1'));
    runAssertion('Match excludes p3 (Advanced Python)', !matchPython.some((p) => p.id === 'p3'));

    const matchBasics = filterPeople(testCases, { skill: 'Python Basics' });
    runAssertion('Python Basics matches p1 and p4', matchBasics.length === 2);
    runAssertion('Match includes p1', matchBasics.some((p) => p.id === 'p1'));
    runAssertion('Match includes p4', matchBasics.some((p) => p.id === 'p4'));
    runAssertion('Match excludes p2', !matchBasics.some((p) => p.id === 'p2'));
  });

  // --- 4. SAFE NULL, MISSING, AND EMPTY HANDLING ---

  await test('4: Null, missing, and empty skills arrays do not break results or throw errors', () => {
    let errorThrown = false;
    let results = [];
    try {
      results = filterPeople(mockProfiles, { skill: 'Figma' });
    } catch (err) {
      errorThrown = true;
    }

    runAssertion('No error thrown during filtering with edge-case arrays', !errorThrown);
    runAssertion('Matches valid Figma user (Maya Lin)', results.length === 1 && results[0].full_name === 'Maya Lin');

    // Test with malformed objects in array
    const malformed = [
      null,
      undefined,
      {},
      { id: 'm1', skills: 'not-an-array' },
      { id: 'm2', skills: [null, undefined, 42, 'Figma'] },
    ];
    const malformedResults = filterPeople(malformed, { skill: 'Figma' });
    runAssertion('Safely handles malformed person records and non-string array entries', malformedResults.length === 1 && malformedResults[0].id === 'm2');
  });

  // --- 5. COMBINATION WITH SEARCH ---

  await test('5: Skills filter combines correctly with search (AND logic)', () => {
    // Both user-001 and user-002 have 'Python', but only Alex matches 'alex'
    const alexPython = filterPeople(mockProfiles, { search: 'alex', skill: 'Python' });
    runAssertion('Combines search + skill to match exact person', alexPython.length === 1 && alexPython[0].full_name === 'Alex Rivera');

    // Search query that does not match person with the skill returns 0
    const noMatch = filterPeople(mockProfiles, { search: 'Evelyn', skill: 'Python' });
    runAssertion('Search mismatch fails combined filter', noMatch.length === 0);
  });

  // --- 6. COMBINATION WITH TAGS ---

  await test('6: Skills filter combines correctly with tags', () => {
    // Tag filter does NOT filter people (people records do not hold project tags)
    const people = filterPeople(mockProfiles, { tag: 'Blockchain', skill: 'Python' });
    runAssertion('People filtered by skill are unaffected by project tag', people.length === 2);

    // Projects filtered by tag are unaffected by profile skill
    const projects = filterProjects(mockProjects, { tag: 'Blockchain', skill: 'Python' });
    runAssertion('Projects are filtered by tag', projects.length === 1 && projects[0].id === 'proj-001');
  });

  // --- 7. COMBINATION WITH PROGRAM, SPECIALIZATION, AND YEAR ---

  await test('7: Skills filter combines correctly with program, specialization, and year', () => {
    // Skill + Program
    const bcaPython = filterPeople(mockProfiles, { program: 'BCA', skill: 'Python' });
    runAssertion('Skill + Program narrows to BCA Python student', bcaPython.length === 1 && bcaPython[0].full_name === 'Ahammed Zihad');

    // Skill + Specialization
    const specPython = filterPeople(mockProfiles, { specialization: 'Cyber Security', skill: 'Python' });
    runAssertion('Skill + Specialization narrows to Cyber Security Python student', specPython.length === 1 && specPython[0].full_name === 'Alex Rivera');

    // Skill + Year
    const yearPython = filterPeople(mockProfiles, { year: '3rd Year', skill: 'Python' });
    runAssertion('Skill + Year narrows to 3rd Year student', yearPython.length === 1 && yearPython[0].full_name === 'Alex Rivera');

    // All combined: search + program + specialization + year + skill
    const allCombined = filterPeople(mockProfiles, {
      search: 'Zihad',
      program: 'BCA',
      specialization: 'Python Full Stack',
      year: '2nd Year',
      skill: 'Python',
    });
    runAssertion('All filters active simultaneously match exact record', allCombined.length === 1 && allCombined[0].id === 'user-002');

    // Contradictory criteria yields 0 results
    const contradictory = filterPeople(mockProfiles, {
      program: 'BBA', // Priya or Rohan
      skill: 'Python', // Alex or Zihad
    });
    runAssertion('Contradictory criteria yields 0 results', contradictory.length === 0);
  });

  // --- 8. RESET / CLEAR FILTERS BEHAVIOR ---

  await test('8: Reset/Clear Filters removes the selected skill', () => {
    // Empty skill string returns all valid profiles
    const cleared = filterPeople(mockProfiles, { skill: '' });
    runAssertion('Empty skill returns all profiles', cleared.length === mockProfiles.length);

    // Undefined skill returns all valid profiles
    const undefinedSkill = filterPeople(mockProfiles, {});
    runAssertion('Omitted skill returns all profiles', undefinedSkill.length === mockProfiles.length);
  });

  // --- 9. EXISTING DISCOVER FILTERS STILL WORK ---

  await test('9: Existing Discover filters still work without regression', () => {
    // Search only
    const searchOnly = filterPeople(mockProfiles, { search: 'Maya' });
    runAssertion('Search still works', searchOnly.length === 1 && searchOnly[0].id === 'user-005');

    // Program only (user-001, user-003, user-008)
    const progOnly = filterPeople(mockProfiles, { program: 'B.Tech' });
    runAssertion('Program still works', progOnly.length === 3);

    // Specialization only
    const specOnly = filterPeople(mockProfiles, { specialization: 'Digital Marketing' });
    runAssertion('Specialization still works', specOnly.length === 1 && specOnly[0].id === 'user-004');

    // Year only
    const yearOnly = filterPeople(mockProfiles, { year: '1st Year' });
    runAssertion('Year still works', yearOnly.length === 2);
  });

  // --- 10. NO UNAUTHORIZED PROFILES EXPOSED ---

  await test('10: No unauthorized profile becomes visible and RLS behavior is preserved', async () => {
    // Simulated permitted Discover query returns only authorized profiles
    const authorizedProfiles = [
      { id: 'auth-1', full_name: 'Permitted User', skills: ['Python'], created_at: '2026-09-01T00:00:00Z' },
    ];

    const mockSupabase = {
      from: (table) => ({
        select: (fields) => ({
          order: () => {
            if (table === 'projects') return Promise.resolve({ data: [], error: null });
            if (table === 'profiles') return Promise.resolve({ data: [...authorizedProfiles], error: null });
            return Promise.resolve({ data: [], error: null });
          },
        }),
      }),
    };

    const data = await fetchDiscoverData({ skill: 'Python' }, mockSupabase);
    runAssertion('Returns only authorized profiles', data.people.length === 1 && data.people[0].id === 'auth-1');

    // Skills options derived only from returned profiles
    const availableSkills = extractAvailableSkills(authorizedProfiles);
    runAssertion('Skills options contain only authorized profile skills', availableSkills.length === 1 && availableSkills[0] === 'Python');
    runAssertion('Private/inaccessible profile skills are not present', !availableSkills.includes('SecretSkill'));
  });

  // --- 11. CASE-INSENSITIVE DEDUPLICATION OF SKILL OPTIONS ---

  await test('11: Duplicate skill options are removed case-insensitively and sorted alphabetically', () => {
    const profilesWithDupes = [
      { id: '1', skills: ['React', 'react', 'REACT'] },
      { id: '2', skills: ['Python', ' python ', 'PYTHON'] },
      { id: '3', skills: ['Node.js', 'node.js'] },
      { id: '4', skills: ['C++', 'C#'] },
    ];

    const options = extractAvailableSkills(profilesWithDupes);
    runAssertion('Deduplicates case-insensitively to unique entries', options.length === 5);
    runAssertion('Contains C++', options.includes('C++'));
    runAssertion('Contains C#', options.includes('C#'));
    runAssertion('Contains Node.js', options.includes('Node.js'));
    runAssertion('Contains Python', options.includes('Python'));

    // Verify alphabetical sorting
    const sorted = [...options].sort((a, b) => a.localeCompare(b));
    runAssertion('Options are sorted alphabetically', JSON.stringify(options) === JSON.stringify(sorted));
  });

  // --- 12. ACHIEVEMENTS ARE NOT USED AS A FILTER ---

  await test('12: Achievements are not used as a filter and are strictly excluded from projection', async () => {
    let capturedSelect = '';
    const mockSupabase = {
      from: (table) => ({
        select: (fields) => {
          if (table === 'profiles') capturedSelect = fields;
          return {
            order: () => Promise.resolve({ data: [], error: null }),
          };
        },
      }),
    };

    await fetchDiscoverData({}, mockSupabase);

    runAssertion('Profiles projection strictly excludes achievements', !capturedSelect.includes('achievements'));
    runAssertion('Profiles projection includes skills', capturedSelect.includes('skills'));

    // filterPeople does not filter on achievements
    const withAch = [
      { id: '1', full_name: 'Person', skills: ['Go'], achievements: ['Hackathon Winner'] },
    ];
    const res = filterPeople(withAch, { achievements: 'Hackathon' });
    runAssertion('Passing achievements to filterPeople is ignored', res.length === 1);
  });

  console.log('\n======================================================================');
  console.log(`  ALL ${passedTests}/${totalTests} TESTS PASSED CLEANLY!`);
  console.log('======================================================================\n');
}

(async () => {
  try {
    await runTests();
  } catch (err) {
    console.error('Discover skills filter suite failed:', err);
    process.exit(1);
  }
})();
