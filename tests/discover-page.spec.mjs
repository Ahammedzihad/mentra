/**
 * Mentra Phase 5 Step 3, Subcategory 3 — Discover Page Results, Controls & Robustness Suite
 *
 * Tests:
 * 1. Authenticated route protection (/discover redirects when unauthenticated, opens cleanly when authenticated)
 * 2. Page shell and accessible loading state
 * 3. Error handling & retry (error alert banner with working retry button)
 * 4. Control population (Programs from canonical list, Specializations, Tags, collegiate progression Years)
 * 5. Program & Specialization dependency and smart reset
 * 6. Live in-memory filtering and matching counts summary
 * 7. Clear Filters control
 * 8. People result cards rendering (role, program, specialization, year; excludes bio/email)
 * 9. Project result cards rendering (title, description, tags, and owner context)
 * 10. Per-section accessible empty states (distinguishes no matches from no directory records)
 * 11. Empty states hidden during loading and error states
 * 12. Navigation boundary check (confirms /discover is not exposed on navbar in this subcategory)
 * 13. Safe owner normalization: projects with empty array profiles (`profiles: []`) render without crashing and omit owner section
 * 14. Missing owner normalization: projects with absent or null owner relations render without crashing and omit owner section
 * 15. Whitespace-only optional values omission for People cards, Project descriptions/tags, and owner details
 * 16. Empty source collections: shows "no records available" empty states separately for People and Projects
 */

import { chromium } from 'playwright';
import { createServer } from 'vite';
import {
  CANONICAL_PROGRAMS,
  PROGRAM_SPECIALIZATIONS,
} from '../frontend/lib/academicPrograms.js';

let viteServer;
let browser;
let baseUrl;

function runAssertion(desc, condition) {
  if (!condition) {
    throw new Error(`Assertion failed: ${desc}`);
  }
  console.log(`  ✅ PASS: ${desc}`);
}

function makeMockSession(uid, email = `${uid}@mentra.edu`, meta = {}) {
  const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const payload = b64({
    sub: uid,
    exp: Math.floor(Date.now() / 1000) + 3600,
    email,
    user_metadata: meta,
  });
  const mockJwt = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${payload}.mock_sig`;

  return {
    access_token: mockJwt,
    refresh_token: 'mock-refresh-token',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'bearer',
    user: {
      id: uid,
      aud: 'authenticated',
      role: 'authenticated',
      email,
      user_metadata: meta,
      app_metadata: {
        provider: 'email',
        providers: ['email'],
      },
      created_at: '2026-09-01T00:00:00Z',
      updated_at: '2026-09-01T00:00:00Z',
    },
  };
}

// Canonical mock profiles matching Phase 5 Step 3 data specifications
const mockProfiles = [
  {
    id: 'user-001',
    full_name: 'Alex Rivera',
    role: 'student',
    program: 'B.Tech',
    specialization: 'Cyber Security',
    year: '3rd Year',
    created_at: '2026-09-01T10:00:00.000Z',
  },
  {
    id: 'user-002',
    full_name: 'Ahammed Zihad',
    role: 'student',
    program: 'BCA',
    specialization: 'Python Full Stack',
    year: '2nd Year',
    created_at: '2026-09-10T12:00:00.000Z',
  },
  {
    id: 'user-003',
    full_name: 'Dr. Evelyn Reed',
    role: 'mentor',
    program: 'B.Tech',
    specialization: 'AI & Machine Learning',
    year: null,
    created_at: '2026-08-15T09:30:00.000Z',
  },
  {
    id: 'user-004',
    full_name: 'Priya Sharma',
    role: 'student',
    program: 'BBA',
    specialization: 'Digital Marketing',
    year: '1st Year',
    created_at: '2026-09-20T14:15:00.000Z',
  },
  {
    id: 'user-005',
    full_name: 'Maya Lin',
    role: 'student',
    program: 'B.Des',
    specialization: 'Interaction Design (UI/UX systems)',
    year: '4th Year',
    created_at: '2026-07-01T08:00:00.000Z',
  },
  {
    id: 'user-006',
    full_name: 'Rohan Gupta',
    role: 'student',
    program: 'BBA',
    specialization: 'Film Making',
    year: 'Graduate',
    created_at: '2026-06-15T08:00:00.000Z',
  },
];

// Canonical mock projects
const mockProjects = [
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
      program: 'B.Tech',
      specialization: 'Cyber Security',
      year: '3rd Year',
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
      program: 'BCA',
      specialization: 'Python Full Stack',
      year: '2nd Year',
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
      program: 'B.Tech',
      specialization: 'AI & Machine Learning',
      year: null,
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
      program: 'BBA',
      specialization: 'Digital Marketing',
      year: '1st Year',
    },
  },
  {
    id: 'proj-005',
    title: 'Minimalist Student Workspace Design',
    description: 'Ergonomic interaction systems and UI kits.',
    tags: ['Design', 'UI/UX', 'Figma'],
    visibility: 'college',
    created_at: '2026-07-10T10:00:00.000Z',
    user_id: 'user-005',
    profiles: {
      id: 'user-005',
      full_name: 'Maya Lin',
      role: 'student',
      program: 'B.Des',
      specialization: 'Interaction Design (UI/UX systems)',
      year: '4th Year',
    },
  },
];

async function setup() {
  viteServer = await createServer({
    server: { port: 5215 },
  });
  await viteServer.listen();
  const address = viteServer.httpServer.address();
  baseUrl = `http://localhost:${address.port}`;
  browser = await chromium.launch({ headless: true });
}

async function teardown() {
  if (browser) await browser.close();
  if (viteServer) await viteServer.close();
}

async function runTests() {
  console.log('======================================================================');
  console.log('  MENTRA PHASE 5 STEP 3, SUBCATEGORY 2 — DISCOVER PAGE SUITE');
  console.log('======================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

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

  const storageKey = 'sb-jqiqbiqybqnpmibceath-auth-token';
  const testStudentId = '00000000-0000-0000-0000-000000000001';
  const defaultSession = makeMockSession(testStudentId, 'alex@mentra.edu', {
    full_name: 'Alex Rivera',
    role: 'student',
  });

  const studentProfile = {
    id: testStudentId,
    full_name: 'Alex Rivera',
    program: 'B.Tech',
    specialization: 'Cyber Security',
    year: '3rd Year',
    role: 'student',
    is_verified: true,
    created_at: '2026-09-01T00:00:00.000Z',
  };

  let simulateNetworkError = false;
  let customProjectsResponse = null;
  let customProfilesResponse = null;

  const context = await browser.newContext();
  const page = await context.newPage();

  // Route interception for Supabase Auth & REST boundary
  await page.route('**/auth/v1/user*', async (route) => {
    await route.fulfill({
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(defaultSession.user),
    });
  });

  await page.route('**/auth/v1/session*', async (route) => {
    await route.fulfill({
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(defaultSession),
    });
  });

  await page.route('**/rest/v1/projects*', async (route) => {
    if (simulateNetworkError) {
      await route.fulfill({
        status: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Simulated collegiate network failure for projects' }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customProjectsResponse !== null ? customProjectsResponse : mockProjects),
    });
  });

  await page.route('**/rest/v1/profiles*', async (route) => {
    const url = route.request().url();
    // Profile fetch for current user session in AuthContext
    if (url.includes(`id=eq.${testStudentId}`)) {
      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Content-Range': '0-0/1' },
        body: JSON.stringify([studentProfile]),
      });
      return;
    }

    if (simulateNetworkError) {
      await route.fulfill({
        status: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Simulated collegiate network failure for profiles' }),
      });
      return;
    }

    // Directory fetch for discover
    await route.fulfill({
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customProfilesResponse !== null ? customProfilesResponse : mockProfiles),
    });
  });

  // --- 1. AUTHENTICATED ROUTE PROTECTION ---

  await test('1: Unauthenticated access to /discover redirects to /login', async () => {
    const unauthedContext = await browser.newContext();
    const unauthedPage = await unauthedContext.newPage();

    await unauthedPage.goto(`${baseUrl}/discover`, { waitUntil: 'networkidle' });
    const currentUrl = unauthedPage.url();

    runAssertion('Redirects to /login when unauthenticated', currentUrl.includes('/login'));
    await unauthedContext.close();
  });

  await test('2: Authenticated user accesses /discover cleanly', async () => {
    await page.addInitScript(({ key, session }) => {
      localStorage.setItem(key, JSON.stringify(session));
    }, { key: storageKey, session: defaultSession });

    await page.goto(`${baseUrl}/discover`, { waitUntil: 'networkidle' });
    await page.waitForSelector('h1:has-text("Discover")', { timeout: 5000 });

    const currentUrl = page.url();
    runAssertion('Maintains /discover URL for authenticated user', currentUrl.endsWith('/discover'));
    runAssertion('Renders Discover heading', (await page.locator('h1:has-text("Discover")').count()) === 1);
  });

  // --- 2. LOADING STATE & RETRY HANDLING ---

  await test('3: Network error displays accessible error banner with working Retry', async () => {
    simulateNetworkError = true;

    // Reload page with simulated failure
    await page.reload({ waitUntil: 'networkidle' });
    const errorBanner = page.locator('#discover-error-message');
    await errorBanner.waitFor({ state: 'visible', timeout: 5000 });

    runAssertion('Error alert banner is visible', await errorBanner.isVisible());
    runAssertion('Retry button is present', (await page.locator('#discover-retry-btn').count()) === 1);

    // Disable network failure and click retry
    simulateNetworkError = false;
    await page.click('#discover-retry-btn');

    // Counts summary should become visible
    await page.locator('#discover-results-summary').waitFor({ state: 'visible', timeout: 5000 });
    runAssertion('Error banner detached after successful retry', (await errorBanner.count()) === 0);
    runAssertion('Results summary rendered after retry', (await page.locator('#discover-results-summary').count()) === 1);
  });

  // --- 3. OPTIONS POPULATION ---

  await test('4: Program options match CANONICAL_PROGRAMS exactly', async () => {
    const programSelect = page.locator('#discover-program-select');
    const options = await programSelect.locator('option').allInnerTexts();

    runAssertion('Includes All Programs placeholder', options[0] === 'All Programs');
    const actualPrograms = options.slice(1);
    runAssertion('Program count matches 4 canonical programs', actualPrograms.length === CANONICAL_PROGRAMS.length);
    for (const prog of CANONICAL_PROGRAMS) {
      runAssertion(`Contains canonical program ${prog}`, actualPrograms.includes(prog));
    }
  });

  await test('5: Specialization options without program show all canonical specializations', async () => {
    const specSelect = page.locator('#discover-specialization-select');
    const options = await specSelect.locator('option').allInnerTexts();

    runAssertion('Includes All Specializations placeholder', options[0] === 'All Specializations');
    const actualSpecs = options.slice(1);
    const allCanonical = Array.from(new Set(Object.values(PROGRAM_SPECIALIZATIONS).flat()));

    runAssertion('Total unselected specializations count matches roadmap', actualSpecs.length === allCanonical.length);
    runAssertion('Contains Cyber Security', actualSpecs.includes('Cyber Security'));
    runAssertion('Contains Python Full Stack', actualSpecs.includes('Python Full Stack'));
    runAssertion('Contains Digital Marketing', actualSpecs.includes('Digital Marketing'));
    runAssertion('Contains Interaction Design (UI/UX systems)', actualSpecs.includes('Interaction Design (UI/UX systems)'));
  });

  await test('6: Selecting a Program scopes Specialization dropdown to canonical options for that program', async () => {
    const programSelect = page.locator('#discover-program-select');
    const specSelect = page.locator('#discover-specialization-select');

    // Select B.Tech
    await programSelect.selectOption('B.Tech');
    const btechOptions = (await specSelect.locator('option').allInnerTexts()).slice(1);

    runAssertion('B.Tech specializations count is 6', btechOptions.length === 6);
    runAssertion('B.Tech includes Cyber Security', btechOptions.includes('Cyber Security'));
    runAssertion('B.Tech includes Blockchain', btechOptions.includes('Blockchain'));
    runAssertion('B.Tech strictly excludes Digital Marketing (BBA)', !btechOptions.includes('Digital Marketing'));
    runAssertion('B.Tech strictly excludes Film Making (BBA)', !btechOptions.includes('Film Making'));

    // Select BBA
    await programSelect.selectOption('BBA');
    const bbaOptions = (await specSelect.locator('option').allInnerTexts()).slice(1);

    runAssertion('BBA specializations count is 5', bbaOptions.length === 5);
    runAssertion('BBA includes Digital Marketing', bbaOptions.includes('Digital Marketing'));
    runAssertion('BBA strictly excludes Cyber Security', !bbaOptions.includes('Cyber Security'));

    // Reset program to all
    await programSelect.selectOption('');
  });

  await test('7: Tag options are populated from availableTags of loaded projects', async () => {
    const tagSelect = page.locator('#discover-tag-select');
    const options = await tagSelect.locator('option').allInnerTexts();

    runAssertion('Includes All Tags placeholder', options[0] === 'All Tags');
    const actualTags = options.slice(1);
    runAssertion('Tags list is populated', actualTags.length > 0);
    runAssertion('Contains Blockchain tag', actualTags.includes('Blockchain'));
    runAssertion('Contains Python tag', actualTags.includes('Python'));
    runAssertion('Contains Rust tag', actualTags.includes('Rust'));
    runAssertion('Contains UI/UX tag', actualTags.includes('UI/UX'));
  });

  await test('8: Year options are populated from loaded People and project-owner data, including Graduate', async () => {
    const yearSelect = page.locator('#discover-year-select');
    const options = await yearSelect.locator('option').allInnerTexts();

    runAssertion('Includes All Years placeholder', options[0] === 'All Years');
    const actualYears = options.slice(1);
    runAssertion('Contains 1st Year', actualYears.includes('1st Year'));
    runAssertion('Contains 2nd Year', actualYears.includes('2nd Year'));
    runAssertion('Contains 3rd Year', actualYears.includes('3rd Year'));
    runAssertion('Contains 4th Year', actualYears.includes('4th Year'));
    runAssertion('Contains Graduate without inventing or discarding values', actualYears.includes('Graduate'));
  });

  // --- 4. PROGRAM & SPECIALIZATION DEPENDENT RESET ---

  await test('9: Switching Program preserves Specialization if valid, clears it if invalid', async () => {
    const programSelect = page.locator('#discover-program-select');
    const specSelect = page.locator('#discover-specialization-select');

    // 1. Select B.Tech, then select Cyber Security (valid for both B.Tech and BCA)
    await programSelect.selectOption('B.Tech');
    await specSelect.selectOption('Cyber Security');
    runAssertion('Specialization selected as Cyber Security', (await specSelect.inputValue()) === 'Cyber Security');

    // 2. Switch to BCA: Cyber Security is valid for BCA, so it must be PRESERVED
    await programSelect.selectOption('BCA');
    runAssertion('Specialization preserved as Cyber Security when switching to BCA', (await specSelect.inputValue()) === 'Cyber Security');

    // 3. Under BCA, switch specialization to Python Full Stack (valid in BCA, invalid in B.Tech)
    await specSelect.selectOption('Python Full Stack');
    runAssertion('Specialization selected as Python Full Stack', (await specSelect.inputValue()) === 'Python Full Stack');

    // 4. Switch program back to B.Tech: Python Full Stack is INVALID for B.Tech, so it must be CLEARED
    await programSelect.selectOption('B.Tech');
    runAssertion('Specialization cleared when switching to program where it is invalid', (await specSelect.inputValue()) === '');

    // Reset back to empty
    await programSelect.selectOption('');
  });

  // --- 5. MATCHING COUNTS & IN-MEMORY FILTERING ---

  await test('10: Initial matching counts show full dataset totals', async () => {
    const peopleCount = await page.locator('#discover-people-count').innerText();
    const projCount = await page.locator('#discover-projects-count').innerText();

    runAssertion('Initial matching people count is 6', peopleCount === '6');
    runAssertion('Initial matching projects count is 5', projCount === '5');
  });

  await test('11: Plain-text search updates people and project counts (project creator name excluded)', async () => {
    const searchInput = page.locator('#discover-search-input');

    // Search by name 'Alex' -> matches 1 person ('Alex Rivera'), 0 projects (creator name Alex not in project title/tags)
    await searchInput.fill('Alex');
    runAssertion('People count matches Alex Rivera', (await page.locator('#discover-people-count').innerText()) === '1');
    runAssertion('Project count is 0 because creator name is not searched in projects', (await page.locator('#discover-projects-count').innerText()) === '0');

    // Search by tag 'Rust' -> matches 0 people, 1 project ('Decentralized Consensus Protocol')
    await searchInput.fill('Rust');
    runAssertion('People count is 0 for Rust', (await page.locator('#discover-people-count').innerText()) === '0');
    runAssertion('Project count is 1 for Rust tag', (await page.locator('#discover-projects-count').innerText()) === '1');

    // Clear search
    await searchInput.fill('');
    runAssertion('People count restored to 6', (await page.locator('#discover-people-count').innerText()) === '6');
    runAssertion('Project count restored to 5', (await page.locator('#discover-projects-count').innerText()) === '5');
  });

  await test('12: Tag filter updates project count only and preserves people count', async () => {
    const tagSelect = page.locator('#discover-tag-select');

    await tagSelect.selectOption('Python');
    runAssertion('Project count matches Collegiate Mentorship Portal (has Python tag)', (await page.locator('#discover-projects-count').innerText()) === '1');
    runAssertion('People count is unaffected by Tag filter (stays 6)', (await page.locator('#discover-people-count').innerText()) === '6');

    await tagSelect.selectOption('');
  });

  await test('13: Academic filters (Program, Specialization, Year) update matching counts for people and project owners', async () => {
    const programSelect = page.locator('#discover-program-select');
    const specSelect = page.locator('#discover-specialization-select');
    const yearSelect = page.locator('#discover-year-select');

    // Filter by Program B.Tech (2 people: Alex Rivera, Dr. Evelyn Reed; 2 projects: proj-001, proj-003)
    await programSelect.selectOption('B.Tech');
    runAssertion('B.Tech people count is 2', (await page.locator('#discover-people-count').innerText()) === '2');
    runAssertion('B.Tech projects count is 2', (await page.locator('#discover-projects-count').innerText()) === '2');

    // Filter by Specialization 'Cyber Security' under B.Tech (1 person: Alex Rivera; 1 project: proj-001)
    await specSelect.selectOption('Cyber Security');
    runAssertion('Cyber Security people count is 1', (await page.locator('#discover-people-count').innerText()) === '1');
    runAssertion('Cyber Security projects count is 1', (await page.locator('#discover-projects-count').innerText()) === '1');

    // Filter by Year '3rd Year'
    await yearSelect.selectOption('3rd Year');
    runAssertion('3rd Year Cyber Security B.Tech people count is 1', (await page.locator('#discover-people-count').innerText()) === '1');
    runAssertion('3rd Year Cyber Security B.Tech projects count is 1', (await page.locator('#discover-projects-count').innerText()) === '1');

    // Filter by Year '4th Year' (should produce 0 matches with B.Tech Cyber Security)
    await yearSelect.selectOption('4th Year');
    runAssertion('Non-matching year produces 0 people', (await page.locator('#discover-people-count').innerText()) === '0');
    runAssertion('Non-matching year produces 0 projects', (await page.locator('#discover-projects-count').innerText()) === '0');

    // Clear filters via button
    await page.click('#discover-clear-filters-btn');
  });

  // --- 6. CLEAR FILTERS CONTROL ---

  await test('14: Clear Filters button resets all 5 controls and restores counts', async () => {
    const searchInput = page.locator('#discover-search-input');
    const tagSelect = page.locator('#discover-tag-select');
    const programSelect = page.locator('#discover-program-select');
    const specSelect = page.locator('#discover-specialization-select');
    const yearSelect = page.locator('#discover-year-select');
    const clearBtn = page.locator('#discover-clear-filters-btn');

    // Set all controls to active values
    await searchInput.fill('Protocol');
    await tagSelect.selectOption('Blockchain');
    await programSelect.selectOption('B.Tech');
    await specSelect.selectOption('Blockchain');
    await yearSelect.selectOption('3rd Year');

    runAssertion('Clear Filters button is enabled when filters are active', await clearBtn.isEnabled());

    // Click Clear Filters
    await clearBtn.click();

    runAssertion('Search input reset to empty', (await searchInput.inputValue()) === '');
    runAssertion('Tag select reset to empty', (await tagSelect.inputValue()) === '');
    runAssertion('Program select reset to empty', (await programSelect.inputValue()) === '');
    runAssertion('Specialization select reset to empty', (await specSelect.inputValue()) === '');
    runAssertion('Year select reset to empty', (await yearSelect.inputValue()) === '');

    runAssertion('People count restored to 6', (await page.locator('#discover-people-count').innerText()) === '6');
    runAssertion('Projects count restored to 5', (await page.locator('#discover-projects-count').innerText()) === '5');
  });

  // --- 7. PEOPLE & PROJECT RESULT CARDS & EMPTY STATES ---

  await test('15: People cards render correct content and gracefully omit missing optional values', async () => {
    const peopleCards = page.locator('[data-testid="discover-person-card"]');
    runAssertion('Renders 6 People cards initially', (await peopleCards.count()) === 6);

    // Verify Alex Rivera (complete student profile)
    const alexCard = peopleCards.filter({ hasText: 'Alex Rivera' });
    runAssertion('Alex Rivera card exists', (await alexCard.count()) === 1);
    runAssertion('Alex card shows role student', (await alexCard.locator('.discover-person-role').innerText()).toLowerCase().includes('student'));
    runAssertion('Alex card shows program B.Tech', (await alexCard.locator('.discover-person-program').textContent()).includes('B.Tech'));
    runAssertion('Alex card shows specialization Cyber Security', (await alexCard.locator('.discover-person-specialization').textContent()).includes('Cyber Security'));
    runAssertion('Alex card shows year 3rd Year', (await alexCard.locator('.discover-person-year').textContent()).includes('3rd Year'));

    // Verify Dr. Evelyn Reed (mentor with year: null)
    const evelynCard = peopleCards.filter({ hasText: 'Dr. Evelyn Reed' });
    runAssertion('Dr. Evelyn Reed card exists', (await evelynCard.count()) === 1);
    runAssertion('Evelyn card shows role mentor', (await evelynCard.locator('.discover-person-role').innerText()).toLowerCase().includes('mentor'));
    runAssertion('Evelyn card shows program B.Tech', (await evelynCard.locator('.discover-person-program').textContent()).includes('B.Tech'));
    runAssertion('Evelyn card shows specialization AI & Machine Learning', (await evelynCard.locator('.discover-person-specialization').textContent()).includes('AI & Machine Learning'));
    runAssertion('Evelyn card omits year badge gracefully when null', (await evelynCard.locator('.discover-person-year').count()) === 0);

    // Verify no email or bio rendered on any people card
    const cardTexts = await peopleCards.allInnerTexts();
    for (const text of cardTexts) {
      runAssertion('Card does not display email address', !text.includes('@mentra.edu'));
      runAssertion('Card does not display bio', !text.includes('Faculty mentor in machine intelligence'));
    }
  });

  await test('16: Project cards render title, description, tags, and owner details gracefully', async () => {
    const projectCards = page.locator('[data-testid="discover-project-card"]');
    runAssertion('Renders 5 Project cards initially', (await projectCards.count()) === 5);

    // Verify Decentralized Consensus Protocol
    const consensusCard = projectCards.filter({ hasText: 'Decentralized Consensus Protocol' });
    runAssertion('Consensus Protocol card exists', (await consensusCard.count()) === 1);
    runAssertion('Shows project description', (await consensusCard.locator('.discover-project-description').innerText()).includes('study on distributed ledgers'));

    // Tags
    const tags = await consensusCard.locator('.discover-tag-chip').allInnerTexts();
    runAssertion('Shows Blockchain tag', tags.includes('Blockchain'));
    runAssertion('Shows Cyber Security tag', tags.includes('Cyber Security'));
    runAssertion('Shows Rust tag', tags.includes('Rust'));

    // Owner details
    runAssertion('Shows owner name Alex Rivera', (await consensusCard.locator('.discover-owner-name').innerText()).includes('Alex Rivera'));
    runAssertion('Shows owner role', (await consensusCard.locator('.discover-owner-role').innerText()).toLowerCase().includes('student'));
    runAssertion('Shows owner program B.Tech', (await consensusCard.locator('.discover-owner-program').textContent()).includes('B.Tech'));
    runAssertion('Shows owner specialization', (await consensusCard.locator('.discover-owner-specialization').textContent()).includes('Cyber Security'));
    runAssertion('Shows owner year', (await consensusCard.locator('.discover-owner-year').textContent()).includes('3rd Year'));

    // Verify project with mentor owner having year: null (Neural Vision Classifier)
    const neuralCard = projectCards.filter({ hasText: 'Neural Vision Classifier' });
    runAssertion('Neural Vision Classifier card exists', (await neuralCard.count()) === 1);
    runAssertion('Shows owner Dr. Evelyn Reed', (await neuralCard.locator('.discover-owner-name').innerText()).includes('Dr. Evelyn Reed'));
    runAssertion('Neural card omits owner year badge gracefully when null', (await neuralCard.locator('.discover-owner-year').count()) === 0);
  });

  await test('17: Per-section empty states distinguish no search matches and render independently', async () => {
    const searchInput = page.locator('#discover-search-input');

    // 1. Search 'Rust' matches 1 project (via tag) and 0 people
    await searchInput.fill('Rust');
    const peopleEmpty = page.locator('#discover-people-empty-state');
    const projEmpty = page.locator('#discover-projects-empty-state');

    runAssertion('People empty state is displayed when 0 people match', await peopleEmpty.isVisible());
    runAssertion('People empty state heading indicates no matching people', (await peopleEmpty.innerText()).includes('No Matching People Found'));
    runAssertion('Projects empty state is NOT displayed because 1 project matched', (await projEmpty.count()) === 0);
    runAssertion('Projects grid displays 1 matching project', (await page.locator('[data-testid="discover-project-card"]').count()) === 1);

    // 2. Search 'Alex' matches 1 person and 0 projects
    await searchInput.fill('Alex');
    runAssertion('Projects empty state is displayed when 0 projects match', await projEmpty.isVisible());
    runAssertion('Projects empty state heading indicates no matching projects', (await projEmpty.innerText()).includes('No Matching Projects Found'));
    runAssertion('People empty state is NOT displayed because 1 person matched', (await peopleEmpty.count()) === 0);
    runAssertion('People grid displays 1 matching person', (await page.locator('[data-testid="discover-person-card"]').count()) === 1);

    // 3. Search 'NonExistentZebra' matches 0 people and 0 projects
    await searchInput.fill('NonExistentZebra');
    runAssertion('Both People and Projects empty states are displayed', (await peopleEmpty.isVisible()) && (await projEmpty.isVisible()));

    // Clear search
    await page.click('#discover-clear-filters-btn');
    runAssertion('Empty states removed when filters cleared', (await peopleEmpty.count()) === 0 && (await projEmpty.count()) === 0);
  });

  await test('18: Empty states are never shown while loading or when an error is displayed', async () => {
    // Verify during error state
    simulateNetworkError = true;
    await page.reload({ waitUntil: 'networkidle' });
    await page.locator('#discover-error-message').waitFor({ state: 'visible', timeout: 5000 });

    runAssertion('People empty state not shown on error', (await page.locator('#discover-people-empty-state').count()) === 0);
    runAssertion('Projects empty state not shown on error', (await page.locator('#discover-projects-empty-state').count()) === 0);
    runAssertion('No cards shown on error', (await page.locator('[data-testid="discover-person-card"]').count()) === 0);

    // Recover
    simulateNetworkError = false;
    await page.click('#discover-retry-btn');
    await page.locator('#discover-results-summary').waitFor({ state: 'visible', timeout: 5000 });
  });

  await test('19: Navbar does not expose links to /discover in this subcategory', async () => {
    const navLinks = page.locator('nav a[href="/discover"], .navbar a[href="/discover"]');
    runAssertion('Navbar does not contain link to /discover', (await navLinks.count()) === 0);
  });

  await test('20: Project with profiles: [] renders without crashing, remains in results, and has no owner section', async () => {
    const emptyArrayOwnerProject = {
      id: 'proj-empty-array-owner',
      title: 'Autonomous Drone Navigation',
      description: 'Pathfinding algorithms for aerial robotics.',
      tags: ['Robotics', 'Python'],
      visibility: 'college',
      created_at: '2026-09-29T10:00:00.000Z',
      user_id: 'user-099',
      profiles: [],
    };

    customProjectsResponse = [emptyArrayOwnerProject];
    await page.reload({ waitUntil: 'networkidle' });
    await page.locator('#discover-results-summary').waitFor({ state: 'visible', timeout: 5000 });

    const projectCards = page.locator('[data-testid="discover-project-card"]');
    runAssertion('Project with empty array profiles remains in Project results', (await projectCards.count()) === 1);

    const card = projectCards.first();
    runAssertion('Card renders project title', (await card.locator('.discover-project-title').innerText()).includes('Autonomous Drone Navigation'));
    runAssertion('Card renders project description', (await card.locator('.discover-project-description').innerText()).includes('Pathfinding algorithms'));
    runAssertion('Card renders project tags', (await card.locator('.discover-tag-chip').count()) === 2);
    runAssertion('Card completely omits owner section when profiles is empty array', (await card.locator('.discover-project-owner').count()) === 0);
    runAssertion('Card omits owner name element', (await card.locator('.discover-owner-name').count()) === 0);

    // Reset
    customProjectsResponse = null;
    await page.reload({ waitUntil: 'networkidle' });
    await page.locator('#discover-results-summary').waitFor({ state: 'visible', timeout: 5000 });
  });

  await test('21: Project with no owner relation (null or absent) renders without crashing and omits owner details', async () => {
    const noOwnerProjects = [
      {
        id: 'proj-null-owner',
        title: 'Quantum Key Distribution',
        description: 'Cryptographic simulation in Julia.',
        tags: ['Quantum', 'Security'],
        visibility: 'college',
        created_at: '2026-09-29T11:00:00.000Z',
        user_id: 'user-100',
        profiles: null,
      },
      {
        id: 'proj-absent-owner',
        title: 'Microgrid Energy Storage',
        description: 'Renewable power load balancing system.',
        tags: ['Energy', 'IoT'],
        visibility: 'college',
        created_at: '2026-09-29T12:00:00.000Z',
        user_id: 'user-101',
        // profiles property completely absent
      },
    ];

    customProjectsResponse = noOwnerProjects;
    await page.reload({ waitUntil: 'networkidle' });
    await page.locator('#discover-results-summary').waitFor({ state: 'visible', timeout: 5000 });

    const projectCards = page.locator('[data-testid="discover-project-card"]');
    runAssertion('Both projects without owner relation render in Project results', (await projectCards.count()) === 2);

    for (let i = 0; i < 2; i++) {
      const card = projectCards.nth(i);
      runAssertion(`Card ${i + 1} has no owner section`, (await card.locator('.discover-project-owner').count()) === 0);
      runAssertion(`Card ${i + 1} has no owner name`, (await card.locator('.discover-owner-name').count()) === 0);
    }

    // Reset
    customProjectsResponse = null;
    await page.reload({ waitUntil: 'networkidle' });
    await page.locator('#discover-results-summary').waitFor({ state: 'visible', timeout: 5000 });
  });

  await test('22: Whitespace-only optional values are omitted for People cards, Project descriptions/tags, and owner details while nonblank values render', async () => {
    const whitespacePeople = [
      {
        id: 'user-ws-1',
        full_name: 'Jordan Lee',
        role: '   ',
        program: ' \t ',
        specialization: '   ',
        year: '   ',
        created_at: '2026-09-29T08:00:00.000Z',
      },
      {
        id: 'user-ws-2',
        full_name: 'Samira Khan',
        role: 'student',
        program: '   ',
        specialization: 'Cyber Security',
        year: '   ',
        created_at: '2026-09-29T09:00:00.000Z',
      },
    ];

    const whitespaceProject = [
      {
        id: 'proj-ws-1',
        title: 'Algorithmic Fairness Testing',
        description: '   \n  \t ',
        tags: ['Cyber Security', '   ', '', 'Rust', '   \t  '],
        visibility: 'college',
        created_at: '2026-09-29T10:00:00.000Z',
        user_id: 'user-ws-3',
        profiles: {
          id: 'user-ws-3',
          full_name: 'Taylor Swift',
          role: '   ',
          program: 'B.Tech',
          specialization: '   ',
          year: '2nd Year',
        },
      },
    ];

    customProfilesResponse = whitespacePeople;
    customProjectsResponse = whitespaceProject;
    await page.reload({ waitUntil: 'networkidle' });
    await page.locator('#discover-results-summary').waitFor({ state: 'visible', timeout: 5000 });

    // 1. People card assertions
    const peopleCards = page.locator('[data-testid="discover-person-card"]');
    runAssertion('Renders 2 People cards with whitespace attributes', (await peopleCards.count()) === 2);

    const jordanCard = peopleCards.filter({ hasText: 'Jordan Lee' });
    runAssertion('Jordan Lee card renders name', (await jordanCard.count()) === 1);
    runAssertion('Jordan card omits whitespace role', (await jordanCard.locator('.discover-person-role').count()) === 0);
    runAssertion('Jordan card omits whitespace program', (await jordanCard.locator('.discover-person-program').count()) === 0);
    runAssertion('Jordan card omits whitespace specialization', (await jordanCard.locator('.discover-person-specialization').count()) === 0);
    runAssertion('Jordan card omits whitespace year', (await jordanCard.locator('.discover-person-year').count()) === 0);

    const samiraCard = peopleCards.filter({ hasText: 'Samira Khan' });
    runAssertion('Samira Khan card renders name', (await samiraCard.count()) === 1);
    runAssertion('Samira card renders nonblank role student', (await samiraCard.locator('.discover-person-role').innerText()).toLowerCase().includes('student'));
    runAssertion('Samira card omits whitespace program', (await samiraCard.locator('.discover-person-program').count()) === 0);
    runAssertion('Samira card renders nonblank specialization', (await samiraCard.locator('.discover-person-specialization').textContent()).includes('Cyber Security'));
    runAssertion('Samira card omits whitespace year', (await samiraCard.locator('.discover-person-year').count()) === 0);

    // 2. Project card description and tags assertions
    const projCard = page.locator('[data-testid="discover-project-card"]').first();
    runAssertion('Project renders nonblank title', (await projCard.locator('.discover-project-title').innerText()).includes('Algorithmic Fairness Testing'));
    runAssertion('Project card omits whitespace-only description', (await projCard.locator('.discover-project-description').count()) === 0);

    const displayedTags = await projCard.locator('.discover-tag-chip').allInnerTexts();
    runAssertion('Omits blank tags individually and preserves nonblank tags', displayedTags.length === 2 && displayedTags.includes('Cyber Security') && displayedTags.includes('Rust'));

    // 3. Project owner detail assertions
    runAssertion('Project renders owner section for nonblank owner', (await projCard.locator('.discover-project-owner').count()) === 1);
    runAssertion('Renders nonblank owner name Taylor Swift', (await projCard.locator('.discover-owner-name').innerText()).includes('Taylor Swift'));
    runAssertion('Omits whitespace-only owner role', (await projCard.locator('.discover-owner-role').count()) === 0);
    runAssertion('Renders nonblank owner program B.Tech', (await projCard.locator('.discover-owner-program').textContent()).includes('B.Tech'));
    runAssertion('Omits whitespace-only owner specialization', (await projCard.locator('.discover-owner-specialization').count()) === 0);
    runAssertion('Renders nonblank owner year 2nd Year', (await projCard.locator('.discover-owner-year').textContent()).includes('2nd Year'));

    // Reset
    customProfilesResponse = null;
    customProjectsResponse = null;
    await page.reload({ waitUntil: 'networkidle' });
    await page.locator('#discover-results-summary').waitFor({ state: 'visible', timeout: 5000 });
  });

  await test('23: Empty source collections show "no records available" state separately for People and Projects', async () => {
    // 1. Empty People source collection: rawPeople = [], rawProjects = [mockProjects[0]]
    customProfilesResponse = [];
    customProjectsResponse = [mockProjects[0]];
    await page.reload({ waitUntil: 'networkidle' });
    await page.locator('#discover-results-summary').waitFor({ state: 'visible', timeout: 5000 });

    const peopleEmpty = page.locator('#discover-people-empty-state');
    const projEmpty = page.locator('#discover-projects-empty-state');

    runAssertion('People empty state is shown when source collection is empty', await peopleEmpty.isVisible());
    runAssertion('People empty state heading says "No People Records Available"', (await peopleEmpty.locator('h3').innerText()).includes('No People Records Available'));
    runAssertion('People empty state text explains directory currently has no records', (await peopleEmpty.locator('p').innerText()).includes('directory currently has no profile records available'));
    runAssertion('Projects empty state is NOT shown because projects exist in source collection', (await projEmpty.count()) === 0);
    runAssertion('Project card renders when projects exist', (await page.locator('[data-testid="discover-project-card"]').count()) === 1);

    // 2. Empty Projects source collection: rawPeople = [mockProfiles[0]], rawProjects = []
    customProfilesResponse = [mockProfiles[0]];
    customProjectsResponse = [];
    await page.reload({ waitUntil: 'networkidle' });
    await page.locator('#discover-results-summary').waitFor({ state: 'visible', timeout: 5000 });

    runAssertion('Projects empty state is shown when source collection is empty', await projEmpty.isVisible());
    runAssertion('Projects empty state heading says "No Projects Available"', (await projEmpty.locator('h3').innerText()).includes('No Projects Available'));
    runAssertion('Projects empty state text explains currently no collegiate projects registered', (await projEmpty.locator('p').innerText()).includes('currently no collegiate projects registered'));
    runAssertion('People empty state is NOT shown because people exist in source collection', (await peopleEmpty.count()) === 0);
    runAssertion('Person card renders when people exist', (await page.locator('[data-testid="discover-person-card"]').count()) === 1);

    // 3. Both source collections empty: rawPeople = [], rawProjects = []
    customProfilesResponse = [];
    customProjectsResponse = [];
    await page.reload({ waitUntil: 'networkidle' });
    await page.locator('#discover-results-summary').waitFor({ state: 'visible', timeout: 5000 });

    runAssertion('Both empty states are displayed when both source collections are empty', (await peopleEmpty.isVisible()) && (await projEmpty.isVisible()));
    runAssertion('People heading says No People Records Available', (await peopleEmpty.locator('h3').innerText()).includes('No People Records Available'));
    runAssertion('Projects heading says No Projects Available', (await projEmpty.locator('h3').innerText()).includes('No Projects Available'));

    // Reset to canonical mocks
    customProfilesResponse = null;
    customProjectsResponse = null;
    await page.reload({ waitUntil: 'networkidle' });
    await page.locator('#discover-results-summary').waitFor({ state: 'visible', timeout: 5000 });
  });

  console.log('\n======================================================================');
  console.log(`  ALL ${passedTests}/${totalTests} TESTS PASSED CLEANLY!`);
  console.log('======================================================================\n');
}

(async () => {
  try {
    await setup();
    await runTests();
  } catch (err) {
    console.error('Discover page verification failed:', err);
    process.exitCode = 1;
  } finally {
    await teardown();
  }
})();
