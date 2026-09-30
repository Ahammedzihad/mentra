/**
 * Mentra Phase 5 Step 3, Subcategory 1 — Discover Data/Query Layer Verification Suite
 *
 * Verifies:
 * 1. Plain-text search:
 *    - Case-insensitive substring match on people's full_name
 *    - Case-insensitive substring match on project title
 *    - Case-insensitive substring match on individual project tags
 *    - Project description is strictly EXCLUDED from search
 *    - Project creator name is strictly EXCLUDED from project search
 * 2. Tag filter:
 *    - Applies to projects only; matches selected tag case-insensitively
 *    - People collection is unaffected by Tag filter
 * 3. Academic filters (Program, Specialization, Year):
 *    - Applies to people and to the profile of each project's owner
 *    - Program & Specialization validated against academicPrograms.js
 *    - Program selected: only its canonical specializations are allowed
 *    - Program unselected: allows any canonical specialization in the roadmap
 *    - Mismatched or non-canonical values yield 0 matches
 *    - Year matches stored profile value directly
 * 4. Combined search and filters with AND logic
 * 5. Available tag extraction:
 *    - Unique, deduplicated case-insensitively, sorted alphabetically
 *    - Derived strictly from query-returned projects (inaccessible project tags protected)
 * 6. Sorting:
 *    - Newest first (created_at DESC) by default
 *    - Missing or invalid timestamps placed last
 * 7. Mock-boundary fetchDiscoverData:
 *    - Projection safety: verifies email is excluded and bio is omitted
 *    - Verifies Supabase table and order clauses
 *    - Error propagation on database query failure
 */

import {
  fetchDiscoverData,
  filterPeople,
  filterProjects,
  extractAvailableTags,
  sortNewestFirst,
  validateAcademicFilters,
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

// Mock Dataset
const mockProfiles = Object.freeze([
  {
    id: 'user-001',
    full_name: 'Alex Rivera',
    role: 'student',
    is_verified: true,
    program: 'B.Tech',
    specialization: 'Cyber Security',
    year: '3rd Year',
    department: 'B.Tech',
    created_at: '2026-09-01T10:00:00.000Z',
  },
  {
    id: 'user-002',
    full_name: 'Ahammed Zihad',
    role: 'student',
    is_verified: true,
    program: 'BCA',
    specialization: 'Python Full Stack',
    year: '2nd Year',
    department: 'BCA',
    created_at: '2026-09-10T12:00:00.000Z',
  },
  {
    id: 'user-003',
    full_name: 'Dr. Evelyn Reed',
    role: 'mentor',
    is_verified: true,
    program: 'B.Tech',
    specialization: 'AI & Machine Learning',
    year: null,
    department: 'Computer Science and Engineering',
    created_at: '2026-08-15T09:30:00.000Z',
  },
  {
    id: 'user-004',
    full_name: 'Priya Sharma',
    role: 'student',
    is_verified: true,
    program: 'BBA',
    specialization: 'Digital Marketing',
    year: '1st Year',
    department: 'BBA',
    created_at: '2026-09-20T14:15:00.000Z',
  },
  {
    id: 'user-005',
    full_name: 'Maya Lin',
    role: 'student',
    is_verified: true,
    program: 'B.Des',
    specialization: 'Interaction Design (UI/UX systems)',
    year: '4th Year',
    department: 'B.Des',
    created_at: '2026-07-01T08:00:00.000Z',
  },
  {
    id: 'user-006',
    full_name: 'Rohan Gupta',
    role: 'student',
    is_verified: true,
    program: 'BBA',
    specialization: 'Film Making',
    year: '3rd Year',
    department: 'BBA',
    created_at: null, // Test missing timestamp
  },
]);

const mockProjects = Object.freeze([
  {
    id: 'proj-001',
    title: 'Decentralized Consensus Protocol',
    description: 'A study on distributed ledgers utilizing python and rust.',
    tags: ['Blockchain', 'Cyber Security', 'Rust'],
    visibility: 'college',
    created_at: '2026-09-25T11:00:00.000Z',
    user_id: 'user-001',
    profiles: {
      id: 'user-001',
      full_name: 'Alex Rivera',
      role: 'student',
      is_verified: true,
      program: 'B.Tech',
      specialization: 'Cyber Security',
      year: '3rd Year',
      department: 'B.Tech',
    },
  },
  {
    id: 'proj-002',
    title: 'Collegiate Mentorship Portal',
    description: 'Full stack academic networking application built on react.',
    tags: ['Python', 'Web Dev', 'Education'],
    visibility: 'college',
    created_at: '2026-09-28T16:00:00.000Z',
    user_id: 'user-002',
    profiles: {
      id: 'user-002',
      full_name: 'Ahammed Zihad',
      role: 'student',
      is_verified: true,
      program: 'BCA',
      specialization: 'Python Full Stack',
      year: '2nd Year',
      department: 'BCA',
    },
  },
  {
    id: 'proj-003',
    title: 'Neural Vision Classifier',
    description: 'Deep convolutional network for collegiate campus surveillance.',
    tags: ['AI', 'Computer Vision', 'PyTorch'],
    visibility: 'public',
    created_at: '2026-09-15T09:00:00.000Z',
    user_id: 'user-003',
    profiles: {
      id: 'user-003',
      full_name: 'Dr. Evelyn Reed',
      role: 'mentor',
      is_verified: true,
      program: 'B.Tech',
      specialization: 'AI & Machine Learning',
      year: null,
      department: 'Computer Science and Engineering',
    },
  },
  {
    id: 'proj-004',
    title: 'Campus Brand Campaign',
    description: 'Social analytics and digital outreach strategy for freshmen.',
    tags: ['Marketing', 'Analytics', 'Social'],
    visibility: 'college',
    created_at: '2026-09-22T13:00:00.000Z',
    user_id: 'user-004',
    profiles: {
      id: 'user-004',
      full_name: 'Priya Sharma',
      role: 'student',
      is_verified: true,
      program: 'BBA',
      specialization: 'Digital Marketing',
      year: '1st Year',
      department: 'BBA',
    },
  },
  {
    id: 'proj-005',
    title: 'Minimalist Student Workspace Design',
    description: 'Ergonomic interaction systems and UI kits.',
    tags: ['Design', 'UI/UX', 'Figma'],
    visibility: 'college',
    created_at: null, // Test missing timestamp
    user_id: 'user-005',
    profiles: {
      id: 'user-005',
      full_name: 'Maya Lin',
      role: 'student',
      is_verified: true,
      program: 'B.Des',
      specialization: 'Interaction Design (UI/UX systems)',
      year: '4th Year',
      department: 'B.Des',
    },
  },
]);

async function runTests() {
  console.log('======================================================================');
  console.log('  MENTRA PHASE 5 STEP 3, SUBCATEGORY 1 — DISCOVER QUERY SUITE');
  console.log('======================================================================\n');

  // --- 1. SEARCH FUNCTIONALITY ---

  await test('1: Plain-text search matches people full_name case-insensitively', () => {
    const results = filterPeople(mockProfiles, { search: 'alex' });
    runAssertion('Matches Alex Rivera', results.length === 1 && results[0].full_name === 'Alex Rivera');

    const resultsUpper = filterPeople(mockProfiles, { search: 'ZIHAD' });
    runAssertion('Matches Ahammed Zihad with uppercase input', resultsUpper.length === 1 && resultsUpper[0].full_name === 'Ahammed Zihad');

    const resultsSubstring = filterPeople(mockProfiles, { search: 'eve' });
    runAssertion('Matches Dr. Evelyn Reed with substring', resultsSubstring.length === 1 && resultsSubstring[0].full_name === 'Dr. Evelyn Reed');

    const resultsNoMatch = filterPeople(mockProfiles, { search: 'NonExistentScholar' });
    runAssertion('Returns empty array when no full_name matches', resultsNoMatch.length === 0);
  });

  await test('2: Plain-text search matches project title and individual tags case-insensitively', () => {
    // Match by title substring
    const titleResults = filterProjects(mockProjects, { search: 'consensus' });
    runAssertion('Matches Decentralized Consensus Protocol by title', titleResults.length === 1 && titleResults[0].id === 'proj-001');

    // Match by individual tag substring
    const tagResults = filterProjects(mockProjects, { search: 'block' });
    runAssertion('Matches project with Blockchain tag', tagResults.length === 1 && tagResults[0].id === 'proj-001');

    // Match by case-insensitive tag substring ('vision' matches 'Computer Vision')
    const tagResults2 = filterProjects(mockProjects, { search: 'vision' });
    runAssertion('Matches Neural Vision Classifier via tag or title', tagResults2.length === 1 && tagResults2[0].id === 'proj-003');
  });

  await test('3: Search strictly excludes project description and creator name from project matching', () => {
    // Project 001 description has 'python', but its title is 'Decentralized Consensus Protocol' and tags are ['Blockchain', 'Cyber Security', 'Rust']
    const descResults = filterProjects(mockProjects, { search: 'rust' });
    runAssertion('Matches because Rust is in tags', descResults.length === 1);

    // 'ledgers' is in proj-001 description, but NOT in title and NOT in tags
    const descOnlyResults = filterProjects(mockProjects, { search: 'ledgers' });
    runAssertion('Project description is NOT searched', descOnlyResults.length === 0);

    // Creator name 'Alex' is on proj-001, but 'Alex' is NOT in title and NOT in tags
    const creatorResults = filterProjects(mockProjects, { search: 'Alex Rivera' });
    runAssertion('Creator name is NOT matched in project text search', creatorResults.length === 0);
  });

  // --- 2. TAG FILTER FUNCTIONALITY ---

  await test('4: Tag filter matches project tags case-insensitively and does not filter people', () => {
    // Project tag matching
    const projResults = filterProjects(mockProjects, { tag: 'blockchain' });
    runAssertion('Matches project with Blockchain tag', projResults.length === 1 && projResults[0].id === 'proj-001');

    const projResultsUpper = filterProjects(mockProjects, { tag: 'PYTHON' });
    runAssertion('Matches project with Python tag using uppercase filter', projResultsUpper.length === 1 && projResultsUpper[0].id === 'proj-002');

    const noProjResults = filterProjects(mockProjects, { tag: 'Robotics' });
    runAssertion('No projects match nonexistent tag', noProjResults.length === 0);

    // People collection is unaffected by Tag filter
    const peopleResults = filterPeople(mockProfiles, { tag: 'Blockchain' });
    runAssertion('People are not filtered out by Tag filter', peopleResults.length === mockProfiles.length);
  });

  // --- 3. ACADEMIC FILTERS (PROGRAM, SPECIALIZATION, YEAR) ---

  await test('5: Program filter applies to people and project owners', () => {
    const peopleBTech = filterPeople(mockProfiles, { program: 'B.Tech' });
    runAssertion('People with B.Tech returned', peopleBTech.length === 2);
    runAssertion('All returned people have program=B.Tech', peopleBTech.every((p) => p.program === 'B.Tech'));

    const projectsBTech = filterProjects(mockProjects, { program: 'B.Tech' });
    runAssertion('Projects whose owner is B.Tech returned', projectsBTech.length === 2);
    runAssertion('All project owners have program=B.Tech', projectsBTech.every((p) => p.profiles.program === 'B.Tech'));

    const peopleBCA = filterPeople(mockProfiles, { program: 'BCA' });
    runAssertion('People with BCA returned', peopleBCA.length === 1 && peopleBCA[0].full_name === 'Ahammed Zihad');

    const projectsBCA = filterProjects(mockProjects, { program: 'BCA' });
    runAssertion('Projects with BCA owner returned', projectsBCA.length === 1 && projectsBCA[0].id === 'proj-002');
  });

  await test('6: Specialization filter validates against canonical definitions and applies to people & project owners', () => {
    // Valid Program + Specialization pair
    const peopleSec = filterPeople(mockProfiles, { program: 'B.Tech', specialization: 'Cyber Security' });
    runAssertion('Valid pair matches person', peopleSec.length === 1 && peopleSec[0].full_name === 'Alex Rivera');

    const projSec = filterProjects(mockProjects, { program: 'B.Tech', specialization: 'Cyber Security' });
    runAssertion('Valid pair matches project owner', projSec.length === 1 && projSec[0].id === 'proj-001');

    // Mismatched Program + Specialization pair (B.Tech with Digital Marketing, which belongs to BBA)
    const mismatchedPeople = filterPeople(mockProfiles, { program: 'B.Tech', specialization: 'Digital Marketing' });
    runAssertion('Mismatched program/specialization returns 0 people', mismatchedPeople.length === 0);

    const mismatchedProj = filterProjects(mockProjects, { program: 'B.Tech', specialization: 'Digital Marketing' });
    runAssertion('Mismatched program/specialization returns 0 projects', mismatchedProj.length === 0);

    // Specialization when Program is omitted: allows any canonical specialization
    const specOnlyPeople = filterPeople(mockProfiles, { specialization: 'Film Making' });
    runAssertion('Canonical specialization without program matches person', specOnlyPeople.length === 1 && specOnlyPeople[0].full_name === 'Rohan Gupta');

    // Non-canonical specialization returns 0
    const nonCanonicalPeople = filterPeople(mockProfiles, { specialization: 'Theoretical Witchcraft' });
    runAssertion('Non-canonical specialization returns 0 results', nonCanonicalPeople.length === 0);
  });

  await test('7: Year filter matches stored profile value for people and project owners', () => {
    const year3People = filterPeople(mockProfiles, { year: '3rd Year' });
    runAssertion('Matches people in 3rd Year', year3People.length === 2);
    runAssertion('All returned people have year=3rd Year', year3People.every((p) => p.year === '3rd Year'));

    const year3Proj = filterProjects(mockProjects, { year: '3rd Year' });
    runAssertion('Matches projects owned by 3rd Year student', year3Proj.length === 1 && year3Proj[0].id === 'proj-001');

    const year2Proj = filterProjects(mockProjects, { year: '2nd Year' });
    runAssertion('Matches projects owned by 2nd Year student', year2Proj.length === 1 && year2Proj[0].id === 'proj-002');
  });

  // --- 4. COMBINED SEARCH AND FILTERS (AND LOGIC) ---

  await test('8: Combines search and multiple active filters using strict AND logic', () => {
    // People: search 'a' + program 'BCA' + specialization 'Python Full Stack'
    const combinedPeople = filterPeople(mockProfiles, {
      search: 'a',
      program: 'BCA',
      specialization: 'Python Full Stack',
      year: '2nd Year',
    });
    runAssertion('Combined filters narrow down to exact person', combinedPeople.length === 1 && combinedPeople[0].full_name === 'Ahammed Zihad');

    // Projects: search 'portal' + tag 'python' + program 'BCA' + specialization 'Python Full Stack'
    const combinedProj = filterProjects(mockProjects, {
      search: 'portal',
      tag: 'python',
      program: 'BCA',
      specialization: 'Python Full Stack',
    });
    runAssertion('Combined search, tag, and academic filters match exact project', combinedProj.length === 1 && combinedProj[0].id === 'proj-002');

    // Failure of one condition fails the AND combination
    const failedProj = filterProjects(mockProjects, {
      search: 'portal',
      tag: 'Blockchain', // Not a tag on portal
      program: 'BCA',
    });
    runAssertion('Failing one filter condition returns 0 results', failedProj.length === 0);
  });

  // --- 5. AVAILABLE TAG EXTRACTION & PRIVACY ---

  await test('9: extractAvailableTags derives unique sorted tags strictly from accessible projects', () => {
    const tags = extractAvailableTags(mockProjects);
    runAssertion('Tags array is non-empty', tags.length > 0);
    runAssertion('Includes AI', tags.includes('AI'));
    runAssertion('Includes Blockchain', tags.includes('Blockchain'));
    runAssertion('Includes Cyber Security', tags.includes('Cyber Security'));
    runAssertion('Includes Python', tags.includes('Python'));

    // Check alphabetical sorting
    const sorted = [...tags].sort((a, b) => a.localeCompare(b));
    runAssertion('Tags are sorted alphabetically', JSON.stringify(tags) === JSON.stringify(sorted));

    // Deduplication check: if projects have duplicate tags in different casing
    const testDupes = [
      { tags: ['React', 'react', 'REACT'] },
      { tags: ['Node', 'node'] },
    ];
    const dupeResult = extractAvailableTags(testDupes);
    runAssertion('Deduplicates case-insensitively to single tag entries', dupeResult.length === 2);

    // Inaccessible projects tags protection:
    // If a private project with tag 'SecretInternalTag' is filtered out by database RLS,
    // it will not be passed to extractAvailableTags
    runAssertion('Inaccessible project tags are not present when not in input', !tags.includes('SecretInternalTag'));
  });

  // --- 6. DEFAULT NEWEST-FIRST SORTING ---

  await test('10: sortNewestFirst sorts items by created_at descending and places missing timestamps last', () => {
    const sortedPeople = sortNewestFirst(mockProfiles);
    runAssertion('First person has newest timestamp (Sep 20)', sortedPeople[0].full_name === 'Priya Sharma');
    runAssertion('Second person is Ahammed Zihad (Sep 10)', sortedPeople[1].full_name === 'Ahammed Zihad');
    runAssertion('Third person is Alex Rivera (Sep 1)', sortedPeople[2].full_name === 'Alex Rivera');
    runAssertion('Fourth person is Dr. Evelyn Reed (Aug 15)', sortedPeople[3].full_name === 'Dr. Evelyn Reed');
    runAssertion('Fifth person is Maya Lin (Jul 1)', sortedPeople[4].full_name === 'Maya Lin');
    runAssertion('Last person is Rohan Gupta (missing created_at)', sortedPeople[5].full_name === 'Rohan Gupta');

    const sortedProjects = sortNewestFirst(mockProjects);
    runAssertion('First project is newest (Sep 28)', sortedProjects[0].id === 'proj-002');
    runAssertion('Last project has null created_at', sortedProjects[sortedProjects.length - 1].created_at === null);
  });

  // --- 7. MOCKED SUPABASE BOUNDARY & PROJECTION SAFETY ---

  await test('11: fetchDiscoverData queries correct tables with projection security and excluded email/bio', async () => {
    let capturedProjectsQuery = null;
    let capturedProfilesQuery = null;

    const mockSupabase = {
      from: (table) => {
        let selectStr = '';
        let orderField = '';
        let orderAsc = null;

        const queryObj = {
          select: (fields) => {
            selectStr = fields;
            return queryObj;
          },
          order: (field, opts) => {
            orderField = field;
            orderAsc = opts?.ascending;

            if (table === 'projects') {
              capturedProjectsQuery = { table, selectStr, orderField, orderAsc };
              return Promise.resolve({ data: [...mockProjects], error: null });
            }
            if (table === 'profiles') {
              capturedProfilesQuery = { table, selectStr, orderField, orderAsc };
              return Promise.resolve({ data: [...mockProfiles], error: null });
            }
            return Promise.resolve({ data: [], error: null });
          },
        };

        return queryObj;
      },
    };

    const result = await fetchDiscoverData({ search: 'python' }, mockSupabase);

    // 1. Projection safety and exact field verification
    runAssertion('Projects query was dispatched', capturedProjectsQuery !== null);
    runAssertion('Profiles query was dispatched', capturedProfilesQuery !== null);

    const expectedPeopleFields = 'id, full_name, role, program, specialization, year, created_at';
    const expectedJoinedOwnerFields = 'id, full_name, role, program, specialization, year';

    // Verify exact people projection match
    runAssertion(
      'People projection exactly matches expected field list',
      capturedProfilesQuery.selectStr === expectedPeopleFields
    );

    // Verify exact joined project-owner projection match
    const joinedOwnerMatch = capturedProjectsQuery.selectStr.match(/profiles:user_id\(([^)]+)\)/);
    const actualJoinedOwnerFields = joinedOwnerMatch ? joinedOwnerMatch[1] : '';
    runAssertion(
      'Joined project-owner projection exactly matches expected field list',
      actualJoinedOwnerFields === expectedJoinedOwnerFields
    );

    // Verify neither projection includes department, is_verified, email, or bio
    runAssertion('Profiles select strictly EXCLUDES department', !capturedProfilesQuery.selectStr.includes('department'));
    runAssertion('Profiles select strictly EXCLUDES is_verified', !capturedProfilesQuery.selectStr.includes('is_verified'));
    runAssertion('Profiles select strictly EXCLUDES email', !capturedProfilesQuery.selectStr.includes('email'));
    runAssertion('Profiles select strictly EXCLUDES bio', !capturedProfilesQuery.selectStr.includes('bio'));

    runAssertion('Joined project-owner projection strictly EXCLUDES department', !actualJoinedOwnerFields.includes('department'));
    runAssertion('Joined project-owner projection strictly EXCLUDES is_verified', !actualJoinedOwnerFields.includes('is_verified'));
    runAssertion('Joined project-owner projection strictly EXCLUDES email', !actualJoinedOwnerFields.includes('email'));
    runAssertion('Joined project-owner projection strictly EXCLUDES bio', !actualJoinedOwnerFields.includes('bio'));

    runAssertion('Projects select strictly EXCLUDES department', !capturedProjectsQuery.selectStr.includes('department'));
    runAssertion('Projects select strictly EXCLUDES is_verified', !capturedProjectsQuery.selectStr.includes('is_verified'));
    runAssertion('Projects select strictly EXCLUDES email', !capturedProjectsQuery.selectStr.includes('email'));
    runAssertion('Projects select strictly EXCLUDES bio', !capturedProjectsQuery.selectStr.includes('bio'));

    // 2. Order clause verification
    runAssertion('Projects ordered by created_at DESC', capturedProjectsQuery.orderField === 'created_at' && capturedProjectsQuery.orderAsc === false);
    runAssertion('Profiles ordered by created_at DESC', capturedProfilesQuery.orderField === 'created_at' && capturedProfilesQuery.orderAsc === false);

    // 3. Return shape
    runAssertion('Returns people collection', Array.isArray(result.people));
    runAssertion('Returns projects collection', Array.isArray(result.projects));
    runAssertion('Returns availableTags collection', Array.isArray(result.availableTags));

    // Filter results matching 'python'
    runAssertion('Projects matching python returned', result.projects.length === 1 && result.projects[0].id === 'proj-002');
    runAssertion('People matching python returned (Ahammed Zihad)', result.people.length === 0); // Python is specialization, not full_name!
  });

  await test('12: fetchDiscoverData propagates database errors gracefully', async () => {
    const errorSupabase = {
      from: () => ({
        select: () => ({
          order: () => Promise.resolve({ data: null, error: { message: 'Database connection timeout' } }),
        }),
      }),
    };

    let errorThrown = false;
    try {
      await fetchDiscoverData({}, errorSupabase);
    } catch (err) {
      errorThrown = true;
      runAssertion('Throws descriptive error message on query failure', err.message.includes('Database connection timeout'));
    }
    runAssertion('Database error was caught and propagated', errorThrown);
  });

  console.log('\n======================================================================');
  console.log(`  ALL ${passedTests}/${totalTests} TESTS PASSED CLEANLY!`);
  console.log('======================================================================\n');
}

(async () => {
  try {
    await runTests();
  } catch (err) {
    console.error('Discover query suite failed:', err);
    process.exit(1);
  }
})();
