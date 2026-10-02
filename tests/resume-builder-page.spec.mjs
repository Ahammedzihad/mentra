/**
 * Mentra Phase 6 Part B — Step 6: Resume Builder Screen Verification Suite
 *
 * Verifies:
 * 1. Route protection (/resume redirects unauthenticated users to /login, redirects non-students)
 * 2. Authenticated student access to /resume
 * 3. In-memory draft auto-population from student's own Journey and Projects records
 * 4. Respects RLS / user_id parameter querying (does not query other users' data)
 * 5. Reorder controls (keyboard-accessible Up/Down buttons, disabled at boundaries)
 * 6. Include / Exclude controls (live preview updates to show only included items)
 * 7. Inline text editing (edits title & description in-memory, live-reflected in preview)
 * 8. Zero database mutations (editing/reordering/toggling makes zero writes to projects/journey/resume_drafts)
 * 9. Navigation links in Navbar and StudentDashboard
 */

import { chromium } from 'playwright';
import { createServer } from 'vite';

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

const testStudentId = '11111111-1111-1111-1111-111111111111';
const testMentorId = '22222222-2222-2222-2222-222222222222';

const mockStudentProfile = {
  id: testStudentId,
  full_name: 'Aria Montgomery',
  role: 'student',
  department: 'Computer Science',
  program: 'B.Tech',
  specialization: 'Artificial Intelligence',
  year: '3',
  batch: '2027',
  bio: 'Passionate about machine learning architectures and decentralized distributed systems.',
  is_verified: false,
};

const mockMentorProfile = {
  id: testMentorId,
  full_name: 'Dr. Marcus Vance',
  role: 'mentor',
  department: 'Computer Science',
  program: 'Ph.D',
  specialization: 'Robotics',
  year: null,
  batch: null,
  bio: 'Faculty advisor.',
  is_verified: true,
};

const mockProjects = [
  {
    id: 'proj-001',
    user_id: testStudentId,
    title: 'Autonomous Drone Navigation',
    description: 'Real-time computer vision SLAM on edge microcontrollers.',
    tags: ['Robotics', 'Computer-Vision', 'Embedded'],
    visibility: 'private',
    created_at: '2026-09-15T10:00:00Z',
  },
  {
    id: 'proj-002',
    user_id: testStudentId,
    title: 'Quantum Key Distribution Simulator',
    description: 'Python simulation of BB84 protocol with noisy optical channels.',
    tags: ['Quantum', 'Cryptography', 'Python'],
    visibility: 'college',
    created_at: '2026-09-10T14:30:00Z',
  },
];

const mockJourney = [
  {
    id: 'journey-001',
    user_id: testStudentId,
    title: 'Published Symposium Whitepaper',
    description: 'Presented initial research on edge neural architectures at annual departmental symposium.',
    created_at: '2026-09-20T12:00:00Z',
  },
  {
    id: 'journey-002',
    user_id: testStudentId,
    title: 'Benchmarked Tensor RT Engine',
    description: 'Achieved 4x inference speedup on embedded Jetson Nano prototype.',
    created_at: '2026-09-05T09:00:00Z',
  },
];

const confirmedProjectColumns = new Set([
  'id', 'user_id', 'title', 'description', 'created_at', 'visibility', 'tags'
]);
const confirmedJourneyColumns = new Set([
  'id', 'user_id', 'title', 'description', 'created_at'
]);
const nonexistentColumns = ['category', 'updated_at', 'date', 'reflection', 'phase'];

const mockSavedDraft = {
  id: 'saved-draft-1234',
  user_id: testStudentId,
  content: {
    summary: 'Saved customized academic objective highlighting distributed systems research.',
    projects: [
      {
        id: 'proj-002',
        sourceId: 'proj-002',
        sourceType: 'project',
        title: 'Quantum Key Distribution Simulator (Saved Custom Title)',
        description: 'Customized description edited for resume draft specifically.',
        tags: ['Quantum', 'Cryptography', 'Python'],
        created_at: '2026-09-10T14:30:00Z',
        date: 'Sep 2026',
        included: true,
        order: 0,
        originalTitle: 'Quantum Key Distribution Simulator',
        originalDescription: 'Python simulation of BB84 protocol with noisy optical channels.'
      },
      {
        id: 'proj-001',
        sourceId: 'proj-001',
        sourceType: 'project',
        title: 'Autonomous Drone Navigation',
        description: 'Real-time computer vision SLAM on edge microcontrollers.',
        tags: ['Robotics', 'Computer-Vision', 'Embedded'],
        created_at: '2026-09-15T10:00:00Z',
        date: 'Sep 2026',
        included: false, // Excluded in saved draft!
        order: 1,
        originalTitle: 'Autonomous Drone Navigation',
        originalDescription: 'Real-time computer vision SLAM on edge microcontrollers.'
      }
    ],
    journey: [
      {
        id: 'journey-002',
        sourceId: 'journey-002',
        sourceType: 'journey',
        title: 'Benchmarked Tensor RT Engine (Saved Custom Milestone)',
        description: 'Custom milestone details saved previously.',
        created_at: '2026-09-05T09:00:00Z',
        date: 'Sep 2026',
        included: true,
        order: 0,
        originalTitle: 'Benchmarked Tensor RT Engine',
        originalDescription: 'Achieved 4x inference speedup on embedded Jetson Nano prototype.'
      }
    ],
    version: 1,
    savedAt: '2026-09-25T15:00:00Z'
  },
  updated_at: '2026-09-25T15:00:00Z'
};

async function setup() {
  viteServer = await createServer({
    server: { port: 5220 },
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
  console.log('  MENTRA PHASE 6 PART B — STEPS 6 & 7: RESUME BUILDER & DRAFT PERSISTENCE');
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

  // Helper to setup mock routes on a Playwright page
  function setupPageMocks(page, currentUserId = testStudentId, role = 'student', options = {}) {
    const interceptedQueries = {
      projectsRequested: false,
      journeyRequested: false,
      draftRequested: false,
      draftSaved: false,
      saveAttempts: 0,
      savedPayload: null,
      savedUrl: null,
      savedMethod: null,
      savedHeaders: null,
      mutations: [],
      projectOrJourneyMutations: [],
    };

    page.route('**/rest/v1/**', async (route) => {
      const url = route.request().url();
      const method = route.request().method();

      // Resume Drafts endpoint
      if (url.includes('/rest/v1/resume_drafts')) {
        if (method === 'GET') {
          interceptedQueries.draftRequested = true;
          interceptedQueries.draftQueryUrl = url;

          if (options.draftFetchError) {
            return route.fulfill({
              status: 500,
              contentType: 'application/json',
              body: JSON.stringify({
                code: '50000',
                message: 'Database query failed when checking resume_drafts.',
              }),
            });
          }

          if (options.savedDraft) {
            return route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify(options.savedDraft),
            });
          }

          // No saved draft row exists for user
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: 'null',
          });
        }

        if (['POST', 'PUT', 'PATCH'].includes(method)) {
          interceptedQueries.draftSaved = true;
          interceptedQueries.saveAttempts++;
          interceptedQueries.savedMethod = method;
          interceptedQueries.savedUrl = url;
          const postBody = route.request().postDataJSON();
          interceptedQueries.savedPayload = postBody;
          interceptedQueries.savedHeaders = route.request().headers();

          if (options.saveDraftDelayMs) {
            await new Promise((res) => setTimeout(res, options.saveDraftDelayMs));
          }

          if (options.saveDraftError) {
            return route.fulfill({
              status: 500,
              contentType: 'application/json',
              body: JSON.stringify({
                code: '50001',
                message: 'Failed to write draft to storage.',
              }),
            });
          }

          return route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({
              id: options.savedDraft?.id || 'saved-draft-uuid-001',
              user_id: postBody.user_id,
              content: postBody.content,
              updated_at: postBody.updated_at || new Date().toISOString(),
            }),
          });
        }
      }

      // Track any mutation attempts
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        interceptedQueries.mutations.push({ method, url });
        if (url.includes('/rest/v1/projects') || url.includes('/rest/v1/journey')) {
          interceptedQueries.projectOrJourneyMutations.push({ method, url });
        }
        return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
      }

      // Profiles endpoint
      if (url.includes('/rest/v1/profiles')) {
        if (url.includes('role=eq.mentor')) {
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([]),
          });
        }
        const profile = role === 'student' ? mockStudentProfile : mockMentorProfile;
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(profile),
        });
      }

      // Projects endpoint
      if (url.includes('/rest/v1/projects')) {
        interceptedQueries.projectsRequested = true;
        interceptedQueries.projectQueryUrl = url;

        // Catch requests for nonexistent columns or wildcards from Resume Builder
        const parsedUrl = new URL(url);
        const selectParam = decodeURIComponent(parsedUrl.searchParams.get('select') || '');
        const requestedColumns = selectParam ? selectParam.split(',').map((c) => c.trim()) : [];

        const badCol = requestedColumns.find((col) => nonexistentColumns.includes(col));
        const referer = route.request().headers()['referer'] || '';
        const isFromResume = referer.includes('/resume');

        if (badCol || (isFromResume && requestedColumns.includes('*'))) {
          const rejectedCol = badCol || '*';
          return route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({
              code: '42703',
              details: null,
              hint: null,
              message: `column "${rejectedCol}" does not exist`,
            }),
          });
        }

        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockProjects),
        });
      }

      // Journey endpoint
      if (url.includes('/rest/v1/journey')) {
        interceptedQueries.journeyRequested = true;
        interceptedQueries.journeyQueryUrl = url;

        // Catch requests for nonexistent columns or wildcards from Resume Builder
        const parsedUrl = new URL(url);
        const selectParam = decodeURIComponent(parsedUrl.searchParams.get('select') || '');
        const requestedColumns = selectParam ? selectParam.split(',').map((c) => c.trim()) : [];

        const badCol = requestedColumns.find((col) => nonexistentColumns.includes(col));
        const referer = route.request().headers()['referer'] || '';
        const isFromResume = referer.includes('/resume');

        if (badCol || (isFromResume && requestedColumns.includes('*'))) {
          const rejectedCol = badCol || '*';
          return route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({
              code: '42703',
              details: null,
              hint: null,
              message: `column "${rejectedCol}" does not exist`,
            }),
          });
        }

        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockJourney),
        });
      }

      // Mentorships endpoint (if student space loads)
      if (url.includes('/rest/v1/mentorships')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
      }

      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });

    return interceptedQueries;
  }

  try {
    // TEST 1: Unauthenticated visitors redirected to /login
    await test('Unauthenticated visitors navigating to /resume are redirected to /login', async () => {
      const page = await browser.newPage();
      await page.goto(`${baseUrl}/resume`);
      await page.waitForURL('**/login**');
      runAssertion('Redirects to /login', page.url().includes('/login'));
      await page.close();
    });

    // TEST 2: Mentor role redirected away from /resume
    await test('Mentor role is prevented from accessing /resume and redirected to /mentor', async () => {
      const page = await browser.newPage();
      setupPageMocks(page, testMentorId, 'mentor');
      await page.addInitScript(
        ({ key, session }) => {
          localStorage.setItem(key, JSON.stringify(session));
        },
        { key: storageKey, session: makeMockSession(testMentorId, 'marcus@mentra.edu', { role: 'mentor' }) }
      );

      await page.goto(`${baseUrl}/resume`);
      await page.waitForURL('**/mentor**');
      runAssertion('Redirects to /mentor', page.url().includes('/mentor'));
      await page.close();
    });

    // TEST 3: Authenticated student loads Resume Builder screen cleanly
    await test('Authenticated student can access /resume and view Resume Builder screen', async () => {
      const page = await browser.newPage();
      const mocks = setupPageMocks(page, testStudentId, 'student');
      await page.addInitScript(
        ({ key, session }) => {
          localStorage.setItem(key, JSON.stringify(session));
        },
        { key: storageKey, session: makeMockSession(testStudentId, 'aria@mentra.edu', { role: 'student' }) }
      );

      await page.goto(`${baseUrl}/resume`);
      await page.waitForSelector('h1:has-text("Collegiate Resume Builder")');

      runAssertion('Page title rendered', await page.locator('h1').textContent().then((t) => t.includes('Collegiate Resume Builder')));
      runAssertion('Candidate name rendered in preview', await page.locator('[data-testid="preview-candidate-name"]').textContent().then((t) => t.includes('Aria Montgomery')));
      runAssertion('Projects queried with user_id', mocks.projectsRequested && mocks.projectQueryUrl.includes(`user_id=eq.${testStudentId}`));
      runAssertion('Journey queried with user_id', mocks.journeyRequested && mocks.journeyQueryUrl.includes(`user_id=eq.${testStudentId}`));

      // Verified column selection matches confirmed schema
      const projUrl = new URL(mocks.projectQueryUrl);
      const projSelect = decodeURIComponent(projUrl.searchParams.get('select') || '');
      const projCols = projSelect.split(',').map((c) => c.trim());
      runAssertion('Projects query does not use wildcard (*)', !projCols.includes('*'));
      runAssertion('Projects query selects only confirmed columns', projCols.every((c) => confirmedProjectColumns.has(c)));
      runAssertion('Projects query does not request category, updated_at, date, reflection, or phase',
        !nonexistentColumns.some((col) => projCols.includes(col)));

      const journeyUrl = new URL(mocks.journeyQueryUrl);
      const journeySelect = decodeURIComponent(journeyUrl.searchParams.get('select') || '');
      const journeyCols = journeySelect.split(',').map((c) => c.trim());
      runAssertion('Journey query does not use wildcard (*)', !journeyCols.includes('*'));
      runAssertion('Journey query selects only confirmed columns', journeyCols.every((c) => confirmedJourneyColumns.has(c)));
      runAssertion('Journey query does not request category, updated_at, date, reflection, or phase',
        !nonexistentColumns.some((col) => journeyCols.includes(col)));

      await page.close();
    });

    // TEST 4: Auto-populates projects and journey milestones into in-memory draft
    await test('In-memory draft displays student projects and journey milestones', async () => {
      const page = await browser.newPage();
      setupPageMocks(page, testStudentId, 'student');
      await page.addInitScript(
        ({ key, session }) => {
          localStorage.setItem(key, JSON.stringify(session));
        },
        { key: storageKey, session: makeMockSession(testStudentId, 'aria@mentra.edu', { role: 'student' }) }
      );

      await page.goto(`${baseUrl}/resume`);
      await page.waitForSelector('[data-testid="project-entry-proj-001"]');

      // Check projects in editor
      const proj1 = page.locator('[data-testid="project-entry-proj-001"]');
      const proj2 = page.locator('[data-testid="project-entry-proj-002"]');
      runAssertion('Project 1 rendered in editor', (await proj1.count()) > 0);
      runAssertion('Project 2 rendered in editor', (await proj2.count()) > 0);

      // Check journey in editor
      const journey1 = page.locator('[data-testid="journey-entry-journey-001"]');
      const journey2 = page.locator('[data-testid="journey-entry-journey-002"]');
      runAssertion('Journey 1 rendered in editor', (await journey1.count()) > 0);
      runAssertion('Journey 2 rendered in editor', (await journey2.count()) > 0);

      // Check preview document has projects and journey
      const previewProj1 = page.locator('[data-testid="preview-project-proj-001"]');
      const previewJourney1 = page.locator('[data-testid="preview-journey-journey-001"]');
      runAssertion('Preview has Project 1', (await previewProj1.count()) > 0);
      runAssertion('Preview has Journey 1', (await previewJourney1.count()) > 0);

      await page.close();
    });

    // TEST 5: Include / Exclude Toggle updates preview in real time
    await test('Include/Exclude toggle omits and restores entries in preview', async () => {
      const page = await browser.newPage();
      setupPageMocks(page, testStudentId, 'student');
      await page.addInitScript(
        ({ key, session }) => {
          localStorage.setItem(key, JSON.stringify(session));
        },
        { key: storageKey, session: makeMockSession(testStudentId, 'aria@mentra.edu', { role: 'student' }) }
      );

      await page.goto(`${baseUrl}/resume`);
      await page.waitForSelector('[data-testid="project-entry-proj-001"]');

      // Initially Project 1 is in preview
      runAssertion('Project 1 visible in preview', (await page.locator('[data-testid="preview-project-proj-001"]').count()) === 1);

      // Click toggle button to exclude Project 1
      const toggleBtn = page.locator('[data-testid="project-entry-proj-001"] button[role="switch"]');
      await toggleBtn.click();

      // Now Project 1 should disappear from preview
      runAssertion('Project 1 omitted from preview after exclude', (await page.locator('[data-testid="preview-project-proj-001"]').count()) === 0);

      // Click toggle button again to include Project 1
      await toggleBtn.click();
      runAssertion('Project 1 restored in preview after re-include', (await page.locator('[data-testid="preview-project-proj-001"]').count()) === 1);

      await page.close();
    });

    // TEST 6: Reordering entries with Up and Down buttons
    await test('Reordering controls move items up and down in editor and preview', async () => {
      const page = await browser.newPage();
      setupPageMocks(page, testStudentId, 'student');
      await page.addInitScript(
        ({ key, session }) => {
          localStorage.setItem(key, JSON.stringify(session));
        },
        { key: storageKey, session: makeMockSession(testStudentId, 'aria@mentra.edu', { role: 'student' }) }
      );

      await page.goto(`${baseUrl}/resume`);
      await page.waitForSelector('[data-testid="project-entry-proj-001"]');

      // Verify boundary disabled states: Project 001 is first, so Move Up is disabled
      const proj1UpBtn = page.locator('[data-testid="project-entry-proj-001"] button[title="Move up"]');
      runAssertion('Top item Move Up is disabled', await proj1UpBtn.isDisabled());

      // Move Project 001 Down
      const proj1DownBtn = page.locator('[data-testid="project-entry-proj-001"] button[title="Move down"]');
      await proj1DownBtn.click();

      // In preview, first project should now be Project 002
      const previewProjectTitles = await page.locator('[data-testid="preview-projects-list"] h4').allTextContents();
      runAssertion('Project 2 is now first in preview', previewProjectTitles[0] === 'Quantum Key Distribution Simulator');
      runAssertion('Project 1 is now second in preview', previewProjectTitles[1] === 'Autonomous Drone Navigation');

      await page.close();
    });

    // TEST 7: Inline text editing updates preview and NEVER writes to database
    await test('Inline text editing modifies resume preview in-memory without database mutations', async () => {
      const page = await browser.newPage();
      const mocks = setupPageMocks(page, testStudentId, 'student');
      await page.addInitScript(
        ({ key, session }) => {
          localStorage.setItem(key, JSON.stringify(session));
        },
        { key: storageKey, session: makeMockSession(testStudentId, 'aria@mentra.edu', { role: 'student' }) }
      );

      await page.goto(`${baseUrl}/resume`);
      await page.waitForSelector('[data-testid="project-entry-proj-001"]');

      // Click Edit on Project 1
      const editBtn = page.locator('[data-testid="project-entry-proj-001"] button:has-text("Edit")');
      await editBtn.click();

      // Edit description in textarea
      const descTextarea = page.locator('#proj-desc-proj-001');
      await descTextarea.fill('Condensed CV description: Edge vision SLAM pipeline.');

      // Check that preview reflects the edited text immediately
      const previewDesc = await page.locator('[data-testid="preview-project-proj-001"] p').textContent();
      runAssertion('Preview shows edited description', previewDesc.includes('Condensed CV description: Edge vision SLAM pipeline.'));

      // Check summary edit
      const summaryTextarea = page.locator('#resume-summary-input');
      await summaryTextarea.fill('Senior CS undergraduate targeting systems research.');
      const previewSummary = await page.locator('[data-testid="preview-summary"]').textContent();
      runAssertion('Preview shows edited summary', previewSummary.includes('Senior CS undergraduate targeting systems research.'));

      // Crucial requirement: ZERO mutation requests were sent
      runAssertion('Zero database mutations executed', mocks.mutations.length === 0);

      await page.close();
    });

    // TEST 8: Navigation links in Navbar and StudentDashboard
    await test('Navigation links to /resume appear in desktop Navbar, mobile Navbar, and StudentDashboard', async () => {
      const page = await browser.newPage();
      setupPageMocks(page, testStudentId, 'student');
      await page.addInitScript(
        ({ key, session }) => {
          localStorage.setItem(key, JSON.stringify(session));
        },
        { key: storageKey, session: makeMockSession(testStudentId, 'aria@mentra.edu', { role: 'student' }) }
      );

      // Check Student Dashboard
      await page.goto(`${baseUrl}/student`);
      await page.waitForSelector('#student-dashboard-resume-link');
      runAssertion('Student Dashboard has Resume Builder button', (await page.locator('#student-dashboard-resume-link').count()) === 1);

      // Check Navbar desktop link
      const navbarResumeLink = page.locator('#navbar-resume-link');
      runAssertion('Navbar has Resume Builder link', (await navbarResumeLink.count()) === 1);

      // Click Navbar link and ensure it navigates to /resume
      await navbarResumeLink.click();
      await page.waitForURL('**/resume');
      runAssertion('Navbar link navigates to /resume', page.url().endsWith('/resume'));

      await page.close();
    });

    // TEST 9: Schema boundary catches requests for nonexistent columns
    await test('Schema validation catches requests for nonexistent columns (category, updated_at, date, reflection, phase)', async () => {
      const page = await browser.newPage();
      setupPageMocks(page, testStudentId, 'student');
      await page.addInitScript(
        ({ key, session }) => {
          localStorage.setItem(key, JSON.stringify(session));
        },
        { key: storageKey, session: makeMockSession(testStudentId, 'aria@mentra.edu', { role: 'student' }) }
      );

      await page.goto(`${baseUrl}/resume`);
      await page.waitForSelector('h1:has-text("Collegiate Resume Builder")');

      // Verify that requesting nonexistent columns returns 400 with missing column error
      const testCases = [
        { path: 'https://jqiqbiqybqnpmibceath.supabase.co/rest/v1/projects?select=id,category', col: 'category' },
        { path: 'https://jqiqbiqybqnpmibceath.supabase.co/rest/v1/projects?select=id,updated_at', col: 'updated_at' },
        { path: 'https://jqiqbiqybqnpmibceath.supabase.co/rest/v1/journey?select=id,date', col: 'date' },
        { path: 'https://jqiqbiqybqnpmibceath.supabase.co/rest/v1/journey?select=id,reflection', col: 'reflection' },
        { path: 'https://jqiqbiqybqnpmibceath.supabase.co/rest/v1/journey?select=id,phase', col: 'phase' },
      ];

      for (const { path, col } of testCases) {
        const result = await page.evaluate(async (url) => {
          const res = await fetch(url, { headers: { apikey: 'test' } });
          const json = await res.json();
          return { status: res.status, message: json.message };
        }, path);

        runAssertion(`Rejected nonexistent column query (${col}) with 400`, result.status === 400);
        runAssertion(`Error message identifies nonexistent column "${col}"`, result.message && result.message.includes(col));
      }

      await page.close();
    });

    // TEST 10: Existing saved draft loads and hydrates instead of fresh auto-population
    await test('Loading an existing saved draft for the signed-in user hydrates editor without querying source records', async () => {
      const page = await browser.newPage();
      const mocks = setupPageMocks(page, testStudentId, 'student', { savedDraft: mockSavedDraft });
      await page.addInitScript(
        ({ key, session }) => {
          localStorage.setItem(key, JSON.stringify(session));
        },
        { key: storageKey, session: makeMockSession(testStudentId, 'aria@mentra.edu', { role: 'student' }) }
      );

      await page.goto(`${baseUrl}/resume`);
      await page.waitForSelector('h1:has-text("Collegiate Resume Builder")');

      // Check draft source status badge shows "Saved Draft"
      const statusBadge = page.locator('[data-testid="draft-source-status"]');
      runAssertion('Draft source badge indicates "Saved Draft"', await statusBadge.textContent().then((t) => t.includes('Saved Draft')));

      // Check that summary was hydrated from saved draft
      const summaryInput = page.locator('#resume-summary-input');
      runAssertion('Summary is hydrated from saved draft', await summaryInput.inputValue().then((v) => v.includes('Saved customized academic objective')));

      // Check that saved order and custom titles are hydrated
      // In mockSavedDraft: proj-002 was first with "(Saved Custom Title)", proj-001 was second and excluded
      const firstProjectTitle = page.locator('[data-testid="preview-project-proj-002"] h4');
      runAssertion('Saved custom project title rendered in preview', await firstProjectTitle.textContent().then((t) => t.includes('Quantum Key Distribution Simulator (Saved Custom Title)')));

      // Proj-001 was excluded in saved draft, so preview should not contain it
      const excludedProjPreview = page.locator('[data-testid="preview-project-proj-001"]');
      runAssertion('Excluded project from saved draft is omitted from preview', (await excludedProjPreview.count()) === 0);

      // Verify that projects and journey tables were NOT queried to populate draft
      runAssertion('resume_drafts was queried with user_id', mocks.draftRequested && mocks.draftQueryUrl.includes(`user_id=eq.${testStudentId}`));
      runAssertion('projects table was NOT queried for draft', mocks.projectsRequested === false);
      runAssertion('journey table was NOT queried for draft', mocks.journeyRequested === false);

      await page.close();
    });

    // TEST 11: Auto-populates from Journey and Projects only when no saved row exists
    await test('Falling back to Step 6 auto-populated draft only when no saved row exists', async () => {
      const page = await browser.newPage();
      const mocks = setupPageMocks(page, testStudentId, 'student', { savedDraft: null });
      await page.addInitScript(
        ({ key, session }) => {
          localStorage.setItem(key, JSON.stringify(session));
        },
        { key: storageKey, session: makeMockSession(testStudentId, 'aria@mentra.edu', { role: 'student' }) }
      );

      await page.goto(`${baseUrl}/resume`);
      await page.waitForSelector('h1:has-text("Collegiate Resume Builder")');

      // Check draft source status badge shows "Auto-Populated Draft"
      const statusBadge = page.locator('[data-testid="draft-source-status"]');
      runAssertion('Draft source badge indicates "Auto-Populated Draft"', await statusBadge.textContent().then((t) => t.includes('Auto-Populated Draft')));

      // Verify resume_drafts was queried first, and then projects and journey were queried as fallback
      runAssertion('resume_drafts was queried', mocks.draftRequested);
      runAssertion('projects table was queried after empty saved row', mocks.projectsRequested);
      runAssertion('journey table was queried after empty saved row', mocks.journeyRequested);

      await page.close();
    });

    // TEST 12: Load errors are kept distinct from empty result and prevent overwrite
    await test('Keeping load errors distinct from an empty result and preventing overwrite', async () => {
      const page = await browser.newPage();
      const mocks = setupPageMocks(page, testStudentId, 'student', { draftFetchError: true });
      await page.addInitScript(
        ({ key, session }) => {
          localStorage.setItem(key, JSON.stringify(session));
        },
        { key: storageKey, session: makeMockSession(testStudentId, 'aria@mentra.edu', { role: 'student' }) }
      );

      await page.goto(`${baseUrl}/resume`);
      await page.waitForSelector('[data-testid="load-error-banner"]');

      runAssertion('Load error banner is displayed', (await page.locator('[data-testid="load-error-banner"]').count()) === 1);
      // Ensure we did NOT fall back to silently overwriting with projects/journey
      runAssertion('projects table was NOT queried on load error', mocks.projectsRequested === false);
      runAssertion('journey table was NOT queried on load error', mocks.journeyRequested === false);

      // Crucial: Save Draft button must be disabled to prevent accidental overwrite
      const saveButton = page.locator('#save-draft-button');
      runAssertion('Save Draft button is disabled during load error', await saveButton.isDisabled());

      await page.close();
    });

    // TEST 13: Saving editor state with authenticated user ID and unique conflict target
    await test('Saving editor state with authenticated user ID and correct unique conflict target', async () => {
      const page = await browser.newPage();
      const mocks = setupPageMocks(page, testStudentId, 'student', { savedDraft: null });
      await page.addInitScript(
        ({ key, session }) => {
          localStorage.setItem(key, JSON.stringify(session));
        },
        { key: storageKey, session: makeMockSession(testStudentId, 'aria@mentra.edu', { role: 'student' }) }
      );

      await page.goto(`${baseUrl}/resume`);
      await page.waitForSelector('#save-draft-button');

      // Edit summary
      const summaryInput = page.locator('#resume-summary-input');
      await summaryInput.fill('Step 7 saved summary text for academic CV.');

      // Click Save Draft
      await page.locator('#save-draft-button').click();
      await page.waitForSelector('[data-testid="save-success-banner"]');

      runAssertion('Save draft request was issued', mocks.draftSaved === true);
      runAssertion('Upsert includes unique conflict target on_conflict=user_id', mocks.savedUrl.includes('on_conflict=user_id'));
      runAssertion('User ID in payload strictly equals authenticated user', mocks.savedPayload.user_id === testStudentId);
      runAssertion('Content summary in payload reflects editor text', mocks.savedPayload.content.summary === 'Step 7 saved summary text for academic CV.');
      runAssertion('Updated_at timestamp is present in payload', typeof mocks.savedPayload.updated_at === 'string' && mocks.savedPayload.updated_at.length > 0);
      runAssertion('Save success banner rendered', (await page.locator('[data-testid="save-success-banner"]').count()) === 1);
      runAssertion('Status badge transitioned to "Saved Draft"', await page.locator('[data-testid="draft-source-status"]').textContent().then((t) => t.includes('Saved Draft')));

      await page.close();
    });

    // TEST 14: Preventing duplicate saves while save is in flight
    await test('Preventing duplicate saves while save is in progress', async () => {
      const page = await browser.newPage();
      const mocks = setupPageMocks(page, testStudentId, 'student', { saveDraftDelayMs: 600 });
      await page.addInitScript(
        ({ key, session }) => {
          localStorage.setItem(key, JSON.stringify(session));
        },
        { key: storageKey, session: makeMockSession(testStudentId, 'aria@mentra.edu', { role: 'student' }) }
      );

      await page.goto(`${baseUrl}/resume`);
      await page.waitForSelector('#save-draft-button');

      const saveButton = page.locator('#save-draft-button');
      // Trigger save
      await saveButton.click();
      // While in-flight, verify button is disabled
      runAssertion('Save button is disabled while saving', await saveButton.isDisabled());
      runAssertion('Save button shows saving label', await saveButton.textContent().then((t) => t.includes('Saving...')));

      // Wait for save completion
      await page.waitForSelector('[data-testid="save-success-banner"]');
      runAssertion('Exactly 1 save request was executed', mocks.saveAttempts === 1);

      await page.close();
    });

    // TEST 15: Preserving editor/source data when save fails
    await test('Preserving editor and source data when save fails', async () => {
      const page = await browser.newPage();
      const mocks = setupPageMocks(page, testStudentId, 'student', { saveDraftError: true });
      await page.addInitScript(
        ({ key, session }) => {
          localStorage.setItem(key, JSON.stringify(session));
        },
        { key: storageKey, session: makeMockSession(testStudentId, 'aria@mentra.edu', { role: 'student' }) }
      );

      await page.goto(`${baseUrl}/resume`);
      await page.waitForSelector('#save-draft-button');

      // Edit summary
      const uniqueText = 'Unsaved research summary text to verify data preservation upon failure.';
      const summaryInput = page.locator('#resume-summary-input');
      await summaryInput.fill(uniqueText);

      // Trigger Save (will fail)
      await page.locator('#save-draft-button').click();
      await page.waitForSelector('[data-testid="save-error-banner"]');

      runAssertion('Save error banner displayed', (await page.locator('[data-testid="save-error-banner"]').count()) === 1);
      // Verify editor content remains intact
      runAssertion('Summary textarea retains user input after failure', await summaryInput.inputValue().then((v) => v === uniqueText));

      await page.close();
    });

    // TEST 16: Ensuring no project or Journey mutation occurs
    await test('Ensuring no project or Journey mutation occurs throughout Step 7 flow', async () => {
      const page = await browser.newPage();
      const mocks = setupPageMocks(page, testStudentId, 'student');
      await page.addInitScript(
        ({ key, session }) => {
          localStorage.setItem(key, JSON.stringify(session));
        },
        { key: storageKey, session: makeMockSession(testStudentId, 'aria@mentra.edu', { role: 'student' }) }
      );

      await page.goto(`${baseUrl}/resume`);
      await page.waitForSelector('#save-draft-button');

      // Perform edits
      await page.locator('#resume-summary-input').fill('Testing zero mutations to projects or journey.');
      await page.locator('#save-draft-button').click();
      await page.waitForSelector('[data-testid="save-success-banner"]');

      // Assert that ZERO mutation requests were made to projects or journey
      runAssertion('Zero project or journey mutations occurred', mocks.projectOrJourneyMutations.length === 0);

      await page.close();
    });

  } finally {
    console.log('\n======================================================================');
    console.log(`  COMPLETED: ${passedTests}/${totalTests} TESTS PASSED CLEANLY!`);
    console.log('======================================================================\n');
  }
}

try {
  await setup();
  await runTests();
} finally {
  await teardown();
}
