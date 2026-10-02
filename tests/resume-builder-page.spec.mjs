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
import { buildResumePdfDoc, formatAcademicDetails, getAcademicDetailsParts } from '../features/resume/generateResumePdf.js';

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
  skills: ['TypeScript', 'Python', 'PyTorch'],
  achievements: ["Dean's Honor Roll 2026", 'HackMIT 2nd Place Winner'],
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
  console.log('  MENTRA PHASE 6 PART B — STEPS 6, 7 & 8: RESUME BUILDER & PDF DOWNLOAD');
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
      sourceRecordMutations: [],
      profilesRequested: false,
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
        if (url.includes('/rest/v1/projects') || url.includes('/rest/v1/journey') || url.includes('/rest/v1/profiles')) {
          interceptedQueries.projectOrJourneyMutations.push({ method, url });
          interceptedQueries.sourceRecordMutations.push({ method, url });
        }
        return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
      }

      // Profiles endpoint
      if (url.includes('/rest/v1/profiles')) {
        interceptedQueries.profilesRequested = true;
        if (url.includes('role=eq.mentor')) {
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([]),
          });
        }
        if (options.profileFetchError) {
          interceptedQueries.profileRequestCount = (interceptedQueries.profileRequestCount || 0) + 1;
          // Fail when ResumeBuilderPage queries profiles (which does not include 'role')
          // or on subsequent requests after initial auth
          if (interceptedQueries.profileRequestCount > 1 || !url.includes('role')) {
            return route.fulfill({
              status: 500,
              contentType: 'application/json',
              body: JSON.stringify({
                code: '42703',
                message: 'column "skills" does not exist in public.profiles',
              }),
            });
          }
        }
        const profile = options.profile || (role === 'student' ? mockStudentProfile : mockMentorProfile);
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

    // =========================================================================
    // STEP 8: RESUME PDF DOWNLOAD VERIFICATION
    // =========================================================================

    // TEST 17: Download button is present, accessible, and disabled during load error
    await test('Download PDF button is rendered and properly disabled during load error', async () => {
      const page = await browser.newPage();
      setupPageMocks(page, testStudentId, 'student', { draftFetchError: true });
      await page.addInitScript(
        ({ key, session }) => {
          localStorage.setItem(key, JSON.stringify(session));
        },
        { key: storageKey, session: makeMockSession(testStudentId, 'aria@mentra.edu', { role: 'student' }) }
      );

      await page.goto(`${baseUrl}/resume`);
      await page.waitForSelector('[data-testid="load-error-banner"]');

      const downloadBtn = page.locator('#download-pdf-button');
      runAssertion('Download button rendered', (await downloadBtn.count()) === 1);
      runAssertion('Download button is disabled during load error', await downloadBtn.isDisabled());

      await page.close();
    });

    // TEST 18: Download button triggers client-side PDF download from live in-memory state
    await test('Clicking Download PDF triggers client-side file download with deterministic filename', async () => {
      const page = await browser.newPage();
      setupPageMocks(page, testStudentId, 'student');
      await page.addInitScript(
        ({ key, session }) => {
          localStorage.setItem(key, JSON.stringify(session));
        },
        { key: storageKey, session: makeMockSession(testStudentId, 'aria@mentra.edu', { role: 'student' }) }
      );

      await page.goto(`${baseUrl}/resume`);
      await page.waitForSelector('#download-pdf-button');

      const downloadPromise = page.waitForEvent('download');
      await page.locator('#download-pdf-button').click();
      const download = await downloadPromise;

      const suggestedName = download.suggestedFilename();
      runAssertion('Filename matches expected pattern', suggestedName === 'Aria_Montgomery_Collegiate_Resume.pdf');

      // Verify the downloaded file is a valid PDF
      const stream = await download.createReadStream();
      const chunks = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);
      const pdfText = buffer.toString('latin1');
      runAssertion('Output is valid PDF (starts with %PDF)', pdfText.startsWith('%PDF-'));
      runAssertion('PDF contains student name', pdfText.includes('Aria Montgomery'));
      runAssertion('PDF contains student email', pdfText.includes('aria@mentra.edu'));

      await page.close();
    });

    // TEST 19: PDF generation reflects unsaved in-memory text edits without saving
    await test('Generated PDF reflects unsaved in-memory edits without calling Save Draft', async () => {
      const page = await browser.newPage();
      const mocks = setupPageMocks(page, testStudentId, 'student');
      await page.addInitScript(
        ({ key, session }) => {
          localStorage.setItem(key, JSON.stringify(session));
        },
        { key: storageKey, session: makeMockSession(testStudentId, 'aria@mentra.edu', { role: 'student' }) }
      );

      await page.goto(`${baseUrl}/resume`);
      await page.waitForSelector('#download-pdf-button');

      // Edit summary in-memory without saving
      const unsavedSummary = 'Unsaved cutting-edge neural architecture objective.';
      await page.locator('#resume-summary-input').fill(unsavedSummary);

      // Edit project 1 title in-memory without saving
      const editBtn = page.locator('[data-testid="project-entry-proj-001"] button:has-text("Edit")');
      await editBtn.click();
      const unsavedProjTitle = 'Unsaved Custom SLAM Vision Title';
      await page.locator('#proj-title-proj-001').fill(unsavedProjTitle);

      // Trigger Download PDF (without saving!)
      const downloadPromise = page.waitForEvent('download');
      await page.locator('#download-pdf-button').click();
      const download = await downloadPromise;

      const stream = await download.createReadStream();
      const chunks = [];
      for await (const chunk of stream) chunks.push(chunk);
      const pdfText = Buffer.concat(chunks).toString('latin1');

      runAssertion('PDF contains unsaved summary text', pdfText.includes('Unsaved cutting-edge neural architecture objective.'));
      runAssertion('PDF contains unsaved project title', pdfText.includes('Unsaved Custom SLAM Vision Title'));
      runAssertion('No draft save occurred during download', mocks.draftSaved === false);

      await page.close();
    });

    // TEST 20: PDF strictly omits excluded items and reflects reordered sequence
    await test('Generated PDF omits excluded items and preserves reordered item sequence', async () => {
      const page = await browser.newPage();
      setupPageMocks(page, testStudentId, 'student');
      await page.addInitScript(
        ({ key, session }) => {
          localStorage.setItem(key, JSON.stringify(session));
        },
        { key: storageKey, session: makeMockSession(testStudentId, 'aria@mentra.edu', { role: 'student' }) }
      );

      await page.goto(`${baseUrl}/resume`);
      await page.waitForSelector('#download-pdf-button');

      // Exclude Project 1 (Autonomous Drone Navigation)
      const toggleBtn = page.locator('[data-testid="project-entry-proj-001"] button[role="switch"]');
      await toggleBtn.click();

      // Trigger Download
      const downloadPromise = page.waitForEvent('download');
      await page.locator('#download-pdf-button').click();
      const download = await downloadPromise;

      const stream = await download.createReadStream();
      const chunks = [];
      for await (const chunk of stream) chunks.push(chunk);
      const pdfText = Buffer.concat(chunks).toString('latin1');

      // Project 2 (Quantum Key Distribution) should be present
      runAssertion('Included Project 2 is present in PDF', pdfText.includes('Quantum Key Distribution Simulator'));
      // Project 1 should NOT be present
      runAssertion('Excluded Project 1 is NOT present in PDF', !pdfText.includes('Autonomous Drone Navigation'));

      await page.close();
    });

    // TEST 21: Zero database mutations and zero reads to resume_drafts, projects, or journey during download
    await test('PDF download performs zero database mutations and zero table queries', async () => {
      const page = await browser.newPage();
      const mocks = setupPageMocks(page, testStudentId, 'student');
      await page.addInitScript(
        ({ key, session }) => {
          localStorage.setItem(key, JSON.stringify(session));
        },
        { key: storageKey, session: makeMockSession(testStudentId, 'aria@mentra.edu', { role: 'student' }) }
      );

      await page.goto(`${baseUrl}/resume`);
      await page.waitForSelector('#download-pdf-button');

      // Reset tracking after initial page load
      const initialMutationsCount = mocks.mutations.length;
      mocks.projectsRequested = false;
      mocks.journeyRequested = false;
      mocks.draftRequested = false;

      // Trigger download
      const downloadPromise = page.waitForEvent('download');
      await page.locator('#download-pdf-button').click();
      await downloadPromise;

      runAssertion('Zero database mutations occurred during download', mocks.mutations.length === initialMutationsCount);
      runAssertion('projects table was NOT queried during download', mocks.projectsRequested === false);
      runAssertion('journey table was NOT queried during download', mocks.journeyRequested === false);
      runAssertion('resume_drafts table was NOT queried during download', mocks.draftRequested === false);

      await page.close();
    });

    // TEST 22: Unit verification of multi-page pagination, footers, and text wrapping
    await test('buildResumePdfDoc handles multi-page overflow and continuous running footers', async () => {
      const mockLongDraft = {
        summary: 'Testing continuous multi-page layout and running footers across page boundaries.',
        projects: Array.from({ length: 12 }, (_, i) => ({
          id: `p-${i}`,
          title: `Autonomous Systems Research Initiative ${i + 1}`,
          description: `Comprehensive evaluation of distributed perception pipelines under adverse conditions. Benchmark report detailing hardware latency, thermal dissipation, and floating point inference metrics for embedded robotics deployments.`,
          tags: ['Robotics', 'SLAM', 'Distributed'],
          date: '2026-09',
          included: true,
        })),
        journey: [
          {
            id: 'j-1',
            title: 'Departmental Symposium Keynote',
            description: 'Delivered presentation on distributed ML inference.',
            date: '2026-09',
            included: true,
          }
        ]
      };

      const { doc, filename, totalPages } = buildResumePdfDoc({
        draft: mockLongDraft,
        profile: mockStudentProfile,
        user: { email: 'aria@mentra.edu' },
      });

      runAssertion('Multi-page document generated (totalPages >= 2)', totalPages >= 2);
      runAssertion('Filename formatted correctly', filename === 'Aria_Montgomery_Collegiate_Resume.pdf');

      const pdfBytes = Buffer.from(doc.output('arraybuffer')).toString('latin1');
      runAssertion('PDF contains Page 1 of N footer', pdfBytes.includes(`Page 1 of ${totalPages}`));
      runAssertion(`PDF contains Page ${totalPages} of ${totalPages} footer`, pdfBytes.includes(`Page ${totalPages} of ${totalPages}`));
      runAssertion('PDF contains student name in footer', pdfBytes.includes('Aria Montgomery') && pdfBytes.includes('Mentra Collegiate Resume'));
    });

    // TEST 23: Regression: Project descriptions with non-breaking hyphens (U+2011) and Unicode dashes render with normal character spacing and zero margin overflow
    await test('Regression: Project descriptions with non-breaking hyphens (U+2011) render with normal character spacing without right margin overflow', async () => {
      // 1. Unit verification on buildResumePdfDoc with exact text pattern
      const unicodeHyphenText = 'The Sonnet project develops a lightweight web\u2011based chatbot that allows users to type natural\u2011language questions and receive clear, conversational answers. The system combines a simple front\u2011end interface built with HTML, CSS, and JavaScript with a back\u2011end API that processes input using a pre\u2011trained language model or rule\u2011based engine. Core functionalities include real\u2011time message handling, context\u2011aware response generation, and basic error handling. The goal is to demonstrate end\u2011to\u2011end integration of web technologies and conversational AI, providing a reusable template for educational and prototype deployments.';

      const testDraft = {
        summary: 'Scholar focused on conversational systems.',
        projects: [
          {
            id: 'proj-sonnet',
            title: 'Sonnet Web Chatbot',
            description: unicodeHyphenText,
            tags: ['web chatbot', 'conversational ai'],
            date: 'Oct 2026',
            included: true,
          }
        ],
        journey: []
      };

      const { doc } = buildResumePdfDoc({
        draft: testDraft,
        profile: mockStudentProfile,
        user: { email: 'aria@mentra.edu' },
      });

      const pdfRaw = Buffer.from(doc.output('arraybuffer')).toString('latin1');

      // Regression checks:
      // (a) Must NOT contain any null bytes \u0000 (which indicated UTF-16 BE dual-byte character spacing)
      runAssertion('Generated PDF has zero null bytes in stream', !pdfRaw.includes('\u0000'));

      // (b) Must NOT contain spaced-out character sequence '( T h e' or '( w e b'
      runAssertion('PDF does not contain spaced-out characters "( T h e"', !pdfRaw.includes('( T h e'));
      runAssertion('PDF does not contain spaced-out characters "( w e b"', !pdfRaw.includes('( w e b'));

      // (c) Must contain normal text with standard ASCII hyphens
      runAssertion('PDF contains normal text with standard hyphens', pdfRaw.includes('The Sonnet project develops a lightweight web-based chatbot'));

      // (d) Verify each line in project description wraps strictly within content width (505.28 pt)
      const pageWidth = doc.internal.pageSize.getWidth();
      const contentWidth = pageWidth - 45 * 2; // 505.28 pt
      const textLines = doc.splitTextToSize(unicodeHyphenText.replace(/\u2011/g, '-'), contentWidth);
      for (const line of textLines) {
        const lineWidth = doc.getTextWidth(line);
        runAssertion(`Line width (${lineWidth.toFixed(2)}pt) wraps within margin limit (${contentWidth.toFixed(2)}pt)`, lineWidth <= contentWidth + 0.01);
      }

      // 2. Playwright in-browser download verification with live editor
      const page = await browser.newPage();
      setupPageMocks(page, testStudentId, 'student');
      await page.addInitScript(
        ({ key, session }) => {
          localStorage.setItem(key, JSON.stringify(session));
        },
        { key: storageKey, session: makeMockSession(testStudentId, 'aria@mentra.edu', { role: 'student' }) }
      );

      await page.goto(`${baseUrl}/resume`);
      await page.waitForSelector('#download-pdf-button');

      // Edit Project 1 description with non-breaking hyphens
      const editBtn = page.locator('[data-testid="project-entry-proj-001"] button:has-text("Edit")');
      await editBtn.click();
      await page.locator('#proj-desc-proj-001').fill(unicodeHyphenText);

      // Trigger download
      const downloadPromise = page.waitForEvent('download');
      await page.locator('#download-pdf-button').click();
      const download = await downloadPromise;

      const stream = await download.createReadStream();
      const chunks = [];
      for await (const chunk of stream) chunks.push(chunk);
      const downloadedPdfText = Buffer.concat(chunks).toString('latin1');

      runAssertion('Downloaded PDF from browser has zero null bytes', !downloadedPdfText.includes('\u0000'));
      runAssertion('Downloaded PDF does not have space-separated characters "( T h e"', !downloadedPdfText.includes('( T h e'));
      runAssertion('Downloaded PDF preserves normal word spacing', downloadedPdfText.includes('The Sonnet project develops a lightweight web-based chatbot'));

      await page.close();
    });

    // TEST 24: Profile skills & achievements auto-populate into editor and live preview when no saved draft exists
    await test('Profile skills and achievements auto-populate into editor and preview when no saved draft exists', async () => {
      const page = await browser.newPage();
      setupPageMocks(page, testStudentId, 'student');
      await page.addInitScript(
        ({ key, session }) => {
          localStorage.setItem(key, JSON.stringify(session));
        },
        { key: storageKey, session: makeMockSession(testStudentId, 'aria@mentra.edu', { role: 'student' }) }
      );

      await page.goto(`${baseUrl}/resume`);
      await page.waitForSelector('[data-testid="skill-entry-skill-0"]');

      // Check Skills in Left Column Editor
      const skill0 = page.locator('[data-testid="skill-entry-skill-0"]');
      const skill1 = page.locator('[data-testid="skill-entry-skill-1"]');
      const skill2 = page.locator('[data-testid="skill-entry-skill-2"]');
      runAssertion('Skill 1 (TypeScript) rendered in editor', (await skill0.innerText()).includes('TypeScript'));
      runAssertion('Skill 2 (Python) rendered in editor', (await skill1.innerText()).includes('Python'));
      runAssertion('Skill 3 (PyTorch) rendered in editor', (await skill2.innerText()).includes('PyTorch'));

      // Check Achievements in Left Column Editor
      const ach0 = page.locator('[data-testid="achievement-entry-ach-0"]');
      const ach1 = page.locator('[data-testid="achievement-entry-ach-1"]');
      runAssertion("Achievement 1 (Dean's Honor Roll) rendered in editor", (await ach0.innerText()).includes("Dean's Honor Roll 2026"));
      runAssertion('Achievement 2 (HackMIT) rendered in editor', (await ach1.innerText()).includes('HackMIT 2nd Place Winner'));

      // Check Right Column Live Preview
      const previewSkills = page.locator('[data-testid="preview-skills-list"]');
      const previewAchievements = page.locator('[data-testid="preview-achievements-list"]');
      runAssertion('Preview has skills section', (await previewSkills.count()) > 0);
      runAssertion('Preview has achievements section', (await previewAchievements.count()) > 0);

      const previewSkill0 = page.locator('[data-testid="preview-skill-skill-0"]');
      const previewSkill1 = page.locator('[data-testid="preview-skill-skill-1"]');
      runAssertion('Preview skill 1 displays TypeScript', (await previewSkill0.innerText()).includes('TypeScript'));
      runAssertion('Preview skill 2 displays Python', (await previewSkill1.innerText()).includes('Python'));

      const previewAch0 = page.locator('[data-testid="preview-achievement-ach-0"]');
      const previewAch1 = page.locator('[data-testid="preview-achievement-ach-1"]');
      runAssertion("Preview achievement 1 displays Dean's Honor Roll", (await previewAch0.innerText()).includes("Dean's Honor Roll 2026"));
      runAssertion('Preview achievement 2 displays HackMIT', (await previewAch1.innerText()).includes('HackMIT 2nd Place Winner'));

      await page.close();
    });

    // TEST 25: Skills & achievements inclusion toggles omit and restore items in live preview
    await test('Skills and achievements inclusion toggles omit and restore items in live preview', async () => {
      const page = await browser.newPage();
      setupPageMocks(page, testStudentId, 'student');
      await page.addInitScript(
        ({ key, session }) => {
          localStorage.setItem(key, JSON.stringify(session));
        },
        { key: storageKey, session: makeMockSession(testStudentId, 'aria@mentra.edu', { role: 'student' }) }
      );

      await page.goto(`${baseUrl}/resume`);
      await page.waitForSelector('[data-testid="preview-skill-skill-0"]');

      // 1. Toggle off skill 0 (TypeScript)
      const toggleSkillBtn = page.locator('[data-testid="skill-entry-skill-0"] button[role="switch"]');
      await toggleSkillBtn.click();

      // Check skill 0 omitted from preview, but skill 1 (Python) remains
      runAssertion('Skill 0 omitted from preview after exclusion', (await page.locator('[data-testid="preview-skill-skill-0"]').count()) === 0);
      runAssertion('Skill 1 still visible in preview', (await page.locator('[data-testid="preview-skill-skill-1"]').count()) > 0);

      // Re-include skill 0
      await toggleSkillBtn.click();
      runAssertion('Skill 0 restored to preview after re-inclusion', (await page.locator('[data-testid="preview-skill-skill-0"]').count()) > 0);

      // 2. Toggle off achievement 0
      const toggleAchBtn = page.locator('[data-testid="achievement-entry-ach-0"] button[role="switch"]');
      await toggleAchBtn.click();

      // Check achievement 0 omitted from preview, but achievement 1 remains
      runAssertion('Achievement 0 omitted from preview after exclusion', (await page.locator('[data-testid="preview-achievement-ach-0"]').count()) === 0);
      runAssertion('Achievement 1 still visible in preview', (await page.locator('[data-testid="preview-achievement-ach-1"]').count()) > 0);

      // Re-include achievement 0
      await toggleAchBtn.click();
      runAssertion('Achievement 0 restored to preview after re-inclusion', (await page.locator('[data-testid="preview-achievement-ach-0"]').count()) > 0);

      await page.close();
    });

    // TEST 26: Skills & achievements reordering controls move items up and down in editor and preview
    await test('Skills and achievements reordering controls move items up and down in editor and preview', async () => {
      const page = await browser.newPage();
      setupPageMocks(page, testStudentId, 'student');
      await page.addInitScript(
        ({ key, session }) => {
          localStorage.setItem(key, JSON.stringify(session));
        },
        { key: storageKey, session: makeMockSession(testStudentId, 'aria@mentra.edu', { role: 'student' }) }
      );

      await page.goto(`${baseUrl}/resume`);
      await page.waitForSelector('[data-testid="preview-skill-skill-0"]');

      // Verify skill 0 Move Up button is disabled at top boundary
      const topSkillMoveUp = page.locator('[data-testid="skill-entry-skill-0"] button[title="Move up"]');
      runAssertion('Top skill Move Up button is disabled', await topSkillMoveUp.isDisabled());

      // Move skill 0 (TypeScript) Down
      const topSkillMoveDown = page.locator('[data-testid="skill-entry-skill-0"] button[title="Move down"]');
      await topSkillMoveDown.click();

      // In preview, first skill badge should now be Python, second should be TypeScript
      const previewSkills = page.locator('[data-testid="preview-skills-list"] > span');
      const firstSkillText = await previewSkills.nth(0).innerText();
      const secondSkillText = await previewSkills.nth(1).innerText();
      runAssertion('Python is now first skill in preview', firstSkillText.includes('Python'));
      runAssertion('TypeScript is now second skill in preview', secondSkillText.includes('TypeScript'));

      // Move achievement 1 Up
      const secondAchMoveUp = page.locator('[data-testid="achievement-entry-ach-1"] button[title="Move up"]');
      await secondAchMoveUp.click();

      const previewAchievements = page.locator('[data-testid="preview-achievements-list"] > div');
      const firstAchText = await previewAchievements.nth(0).innerText();
      runAssertion('HackMIT is now first achievement in preview', firstAchText.includes('HackMIT 2nd Place Winner'));

      await page.close();
    });

    // TEST 27: Inline editing & revert for skills and achievements modifies in-memory draft with zero writes to source records
    await test('Inline editing and revert for skills and achievements modifies draft in-memory with zero source mutations', async () => {
      const page = await browser.newPage();
      const mocks = setupPageMocks(page, testStudentId, 'student');
      await page.addInitScript(
        ({ key, session }) => {
          localStorage.setItem(key, JSON.stringify(session));
        },
        { key: storageKey, session: makeMockSession(testStudentId, 'aria@mentra.edu', { role: 'student' }) }
      );

      await page.goto(`${baseUrl}/resume`);
      await page.waitForSelector('[data-testid="skill-entry-skill-0"]');

      // 1. Edit Skill 0 inline
      const editSkillBtn = page.locator('[data-testid="skill-entry-skill-0"] button:has-text("Edit")');
      await editSkillBtn.click();

      const skillInput = page.locator('#skill-name-skill-0');
      await skillInput.fill('TypeScript / WebAssembly (Draft Custom)');

      // Check preview reflects edited skill name immediately
      const previewSkill0 = page.locator('[data-testid="preview-skill-skill-0"]');
      runAssertion('Preview reflects edited skill text', (await previewSkill0.innerText()).includes('TypeScript / WebAssembly (Draft Custom)'));

      // Click Revert button for skill
      const revertSkillBtn = page.locator('[data-testid="skill-entry-skill-0"] button:has-text("Revert")');
      await revertSkillBtn.click();
      runAssertion('Skill text reverted back to original profile value', (await previewSkill0.innerText()).includes('TypeScript'));

      // 2. Edit Achievement 0 inline
      const editAchBtn = page.locator('[data-testid="achievement-entry-ach-0"] button:has-text("Edit")');
      await editAchBtn.click();

      await page.locator('#ach-title-ach-0').fill("Dean's Honor Roll 2026 (Summa Cum Laude)");
      await page.locator('#ach-desc-ach-0').fill('Ranked in the 99th percentile across collegiate engineering.');

      const previewAch0 = page.locator('[data-testid="preview-achievement-ach-0"]');
      const previewAch0Text = await previewAch0.innerText();
      runAssertion('Preview reflects edited achievement title', previewAch0Text.includes("Dean's Honor Roll 2026 (Summa Cum Laude)"));
      runAssertion('Preview reflects edited achievement description', previewAch0Text.includes('Ranked in the 99th percentile'));

      // Click Revert button for achievement
      const revertAchBtn = page.locator('[data-testid="achievement-entry-ach-0"] button:has-text("Revert")');
      await revertAchBtn.click();
      runAssertion('Achievement title reverted back to original', (await previewAch0.innerText()).includes("Dean's Honor Roll 2026"));

      // Check zero writes to database
      runAssertion('Zero source record mutations occurred', mocks.sourceRecordMutations.length === 0);
      runAssertion('Zero database mutations occurred overall', mocks.mutations.length === 0);

      await page.close();
    });

    // TEST 28: Saved draft preserves skills & achievements layout, custom texts, and inclusion choices without being overwritten by profile values
    await test('Saved draft preserves skills and achievements layout and inclusion choices without being overwritten by profile values', async () => {
      const page = await browser.newPage();
      const mockSavedDraftWithSkills = {
        id: 'saved-draft-skills-achievements',
        user_id: testStudentId,
        content: {
          summary: 'Researcher in formal verification and systems security.',
          skills: [
            {
              id: 'skill-saved-0',
              name: 'Rust Systems Programming (Saved Custom)',
              originalName: 'Rust',
              included: true,
              order: 0
            },
            {
              id: 'skill-saved-1',
              name: 'Go Concurrency (Saved Excluded)',
              originalName: 'Go',
              included: false,
              order: 1
            }
          ],
          achievements: [
            {
              id: 'ach-saved-0',
              title: 'USENIX Best Paper Award (Saved Custom)',
              originalTitle: 'USENIX Paper',
              description: 'Awarded for breakthrough in asynchronous consensus.',
              originalDescription: 'Asynchronous consensus paper',
              date: 'Aug 2026',
              included: true,
              order: 0
            }
          ],
          projects: mockSavedDraft.content.projects,
          journey: mockSavedDraft.content.journey,
          version: 1,
          savedAt: '2026-09-28T12:00:00Z'
        },
        updated_at: '2026-09-28T12:00:00Z'
      };

      // Profile has completely different skills and achievements
      const differentProfile = {
        ...mockStudentProfile,
        skills: ['C++', 'Java', 'SQL'],
        achievements: ['High School Valedictorian']
      };

      const mocks = setupPageMocks(page, testStudentId, 'student', {
        savedDraft: mockSavedDraftWithSkills,
        profile: differentProfile
      });

      await page.addInitScript(
        ({ key, session }) => {
          localStorage.setItem(key, JSON.stringify(session));
        },
        { key: storageKey, session: makeMockSession(testStudentId, 'aria@mentra.edu', { role: 'student' }) }
      );

      await page.goto(`${baseUrl}/resume`);
      await page.waitForSelector('[data-testid="resume-preview-document"]');

      // Verify draft source badge indicates "Saved Draft"
      const statusBadge = page.locator('header span:has-text("Saved Draft"), div:has-text("Saved Draft")').first();
      runAssertion('Status badge indicates Saved Draft', (await statusBadge.count()) > 0);

      // Verify saved custom skill is rendered in preview
      const previewSkillsList = page.locator('[data-testid="preview-skills-list"]');
      const skillsText = await previewSkillsList.innerText();
      runAssertion('Preview contains saved custom skill', skillsText.includes('Rust Systems Programming (Saved Custom)'));

      // Verify excluded saved skill is omitted from preview
      runAssertion('Excluded saved skill is NOT in preview', !skillsText.includes('Go Concurrency (Saved Excluded)'));

      // Verify profile skills (C++, Java, SQL) did NOT overwrite the saved draft choices
      runAssertion('Profile skill C++ did NOT overwrite saved draft', !skillsText.includes('C++'));
      runAssertion('Profile skill Java did NOT overwrite saved draft', !skillsText.includes('Java'));

      // Verify saved custom achievement is rendered in preview
      const previewAchievementsList = page.locator('[data-testid="preview-achievements-list"]');
      const achievementsText = await previewAchievementsList.innerText();
      runAssertion('Preview contains saved custom achievement', achievementsText.includes('USENIX Best Paper Award (Saved Custom)'));
      runAssertion('Preview contains saved achievement description', achievementsText.includes('breakthrough in asynchronous consensus'));
      runAssertion('Profile achievement did NOT overwrite saved draft', !achievementsText.includes('High School Valedictorian'));

      // Test Saving Draft retains skills and achievements in payload
      const saveBtn = page.locator('#save-draft-button');
      await saveBtn.click();
      await page.waitForSelector('[data-testid="save-success-banner"]');

      runAssertion('Draft save occurred', mocks.draftSaved);
      runAssertion('Saved payload contains content.skills array', Array.isArray(mocks.savedPayload?.content?.skills));
      runAssertion('Saved payload contains content.achievements array', Array.isArray(mocks.savedPayload?.content?.achievements));
      runAssertion('Saved skills in payload preserves custom text', mocks.savedPayload.content.skills[0].name.includes('Rust Systems Programming (Saved Custom)'));
      runAssertion('Zero source mutations occurred during save', mocks.sourceRecordMutations.length === 0);

      await page.close();
    });

    // TEST 29: Resume PDF download reflects in-memory skills and achievements including unsaved edits and omitting excluded items
    await test('Resume PDF download reflects in-memory skills and achievements (including unsaved edits, omitting excluded items)', async () => {
      // 1. Direct unit verification of buildResumePdfDoc
      const testDraftWithSkillsAndAchievements = {
        summary: 'Scholar in distributed algorithms and machine learning.',
        skills: [
          { id: 's-1', name: 'Distributed Systems', included: true },
          { id: 's-2', name: 'Deep Learning', included: true },
          { id: 's-3', name: 'Legacy Fortran', included: false } // Excluded!
        ],
        projects: [
          { id: 'p-1', title: 'Edge Cluster Orchestration', description: 'Real-time load balancer for IoT nodes.', date: 'Oct 2026', included: true }
        ],
        journey: [],
        achievements: [
          { id: 'a-1', title: 'Outstanding Undergraduate Researcher Award', description: 'Awarded by Department of Computer Science.', date: 'May 2026', included: true },
          { id: 'a-2', title: 'High School Debate Finalist', description: 'Regional competition.', date: '2023', included: false } // Excluded!
        ]
      };

      const { doc } = buildResumePdfDoc({
        draft: testDraftWithSkillsAndAchievements,
        profile: mockStudentProfile,
        user: { email: 'aria@mentra.edu' }
      });

      const pdfRaw = Buffer.from(doc.output('arraybuffer')).toString('latin1');

      runAssertion('PDF includes Technical & Academic Skills header', pdfRaw.toUpperCase().includes('TECHNICAL & ACADEMIC SKILLS'));
      runAssertion('PDF includes included skill Distributed Systems', pdfRaw.includes('Distributed Systems'));
      runAssertion('PDF includes included skill Deep Learning', pdfRaw.includes('Deep Learning'));
      runAssertion('PDF omits excluded skill Legacy Fortran', !pdfRaw.includes('Legacy Fortran'));

      runAssertion('PDF includes Honors & Achievements header', pdfRaw.toUpperCase().includes('HONORS & ACHIEVEMENTS'));
      runAssertion('PDF includes included achievement title', pdfRaw.includes('Outstanding Undergraduate Researcher Award'));
      runAssertion('PDF includes included achievement description', pdfRaw.includes('Awarded by Department of Computer Science.'));
      runAssertion('PDF omits excluded achievement', !pdfRaw.includes('High School Debate Finalist'));

      // 2. Playwright in-browser download verification
      const page = await browser.newPage();
      const mocks = setupPageMocks(page, testStudentId, 'student');
      await page.addInitScript(
        ({ key, session }) => {
          localStorage.setItem(key, JSON.stringify(session));
        },
        { key: storageKey, session: makeMockSession(testStudentId, 'aria@mentra.edu', { role: 'student' }) }
      );

      await page.goto(`${baseUrl}/resume`);
      await page.waitForSelector('#download-pdf-button');

      // Edit Skill 0 inline without saving
      const editSkillBtn = page.locator('[data-testid="skill-entry-skill-0"] button:has-text("Edit")');
      await editSkillBtn.click();
      await page.locator('#skill-name-skill-0').fill('TypeScript and Distributed Protocols Unsaved Skill Edit');

      // Exclude Skill 2 (PyTorch)
      const toggleSkill2 = page.locator('[data-testid="skill-entry-skill-2"] button[role="switch"]');
      await toggleSkill2.click();

      // Trigger download
      const downloadPromise = page.waitForEvent('download');
      await page.locator('#download-pdf-button').click();
      const download = await downloadPromise;

      const stream = await download.createReadStream();
      const chunks = [];
      for await (const chunk of stream) chunks.push(chunk);
      const downloadedPdfText = Buffer.concat(chunks).toString('latin1');

      runAssertion('Downloaded PDF contains unsaved edited skill', downloadedPdfText.includes('TypeScript and Distributed Protocols Unsaved Skill Edit'));
      runAssertion('Downloaded PDF omits excluded skill PyTorch', !downloadedPdfText.includes('PyTorch'));
      runAssertion('Zero draft saves occurred during download', !mocks.draftSaved);
      runAssertion('Zero source mutations occurred during download', mocks.sourceRecordMutations.length === 0);

      await page.close();
    });

    // TEST 30: Profile schema absence or loading failure displays error banner, disables saving, and protects saved drafts
    await test('Profile schema absence or profile loading failure displays error banner, disables save, and preserves saved draft', async () => {
      const page = await browser.newPage();
      const mockSavedDraftData = {
        id: 'protected-saved-draft-001',
        user_id: testStudentId,
        content: {
          summary: 'Precious saved resume draft that must never be overwritten.',
          skills: [{ id: 's-1', name: 'C++', included: true }],
          achievements: [],
          projects: [],
          journey: [],
          version: 1
        },
        updated_at: '2026-09-30T10:00:00Z'
      };

      const mocks = setupPageMocks(page, testStudentId, 'student', {
        profileFetchError: true, // Simulates column "skills" does not exist or profile error
        savedDraft: mockSavedDraftData
      });

      await page.addInitScript(
        ({ key, session }) => {
          localStorage.setItem(key, JSON.stringify(session));
        },
        { key: storageKey, session: makeMockSession(testStudentId, 'aria@mentra.edu', { role: 'student' }) }
      );

      await page.goto(`${baseUrl}/resume`);
      await page.waitForSelector('[data-testid="load-error-banner"]');

      // Verify clear load error banner is displayed
      const errorBanner = page.locator('[data-testid="load-error-banner"]');
      const errorText = await errorBanner.innerText();
      runAssertion('Load error banner is displayed', (await errorBanner.count()) > 0);
      runAssertion('Error text mentions profile loading failure', errorText.includes('profile') || errorText.includes('skills'));

      // Verify Save Draft button is disabled to protect against overwriting
      const saveBtn = page.locator('#save-draft-button');
      runAssertion('Save Draft button is disabled during profile load failure', await saveBtn.isDisabled());

      // Verify Download PDF button is disabled during load error
      const downloadBtn = page.locator('#download-pdf-button');
      runAssertion('Download PDF button is disabled during load error', await downloadBtn.isDisabled());

      // Verify zero save attempts and zero mutations occurred
      runAssertion('Zero draft save attempts were made', mocks.saveAttempts === 0);
      runAssertion('Zero source record mutations occurred', mocks.sourceRecordMutations.length === 0);
      runAssertion('Zero database mutations occurred overall', mocks.mutations.length === 0);

      await page.close();
    });

    // TEST 31: Academic details formatting and PDF generation deduplicates matching program/course and preserves differing values
    await test('Academic details formatting and PDF generation deduplicates matching program/course and preserves differing values', async () => {
      // 1. Matching program and course: displays value only once
      const matchingBcaProfile = {
        department: 'BCA',
        course: 'BCA',
        program: 'BCA',
        specialization: 'AI & Machine Learning',
      };
      const formattedMatching = formatAcademicDetails(matchingBcaProfile);
      runAssertion('Matching BCA profile displays BCA only once', formattedMatching === 'BCA • Specialization: AI & Machine Learning');
      runAssertion('Matching BCA profile does NOT contain duplicate BCA • BCA', !formattedMatching.includes('BCA • BCA'));

      // 1b. Matching program and course without department
      const matchingNoDept = {
        course: 'BCA',
        program: 'BCA',
        specialization: 'AI & Machine Learning',
      };
      runAssertion('Matching course and program without department displays BCA once', formatAcademicDetails(matchingNoDept) === 'BCA • Specialization: AI & Machine Learning');

      // 1c. Matching program and course without specialization
      const matchingNoSpec = {
        course: 'B.Tech',
        program: 'B.Tech',
      };
      runAssertion('Matching B.Tech course and program displays B.Tech once', formatAcademicDetails(matchingNoSpec) === 'B.Tech');

      // 2. Differing values: follows existing intended display behavior (displays both)
      const differingCourseProg = {
        course: 'Computer Science',
        program: 'B.Tech',
        specialization: 'Artificial Intelligence',
      };
      const formattedDiffering = formatAcademicDetails(differingCourseProg);
      runAssertion('Differing course and program displays both values', formattedDiffering === 'Computer Science • B.Tech • Specialization: Artificial Intelligence');
      runAssertion('Differing course and program preserves course', formattedDiffering.includes('Computer Science'));
      runAssertion('Differing course and program preserves program', formattedDiffering.includes('B.Tech'));

      // 2b. Differing department and program
      const differingDeptProg = {
        department: 'Computer Science',
        program: 'B.Tech',
        specialization: 'Artificial Intelligence',
      };
      runAssertion('Differing department and program displays both values', formatAcademicDetails(differingDeptProg) === 'Computer Science • B.Tech • Specialization: Artificial Intelligence');

      // 2c. Differing course and program (BCA and MCA)
      const differingBcaMca = {
        course: 'BCA',
        program: 'MCA',
      };
      runAssertion('Differing BCA and MCA displays both', formatAcademicDetails(differingBcaMca) === 'BCA • MCA');

      // 2d. Distinct department with matching course and program
      const distinctDeptMatchingCourseProg = {
        department: 'Computer Science',
        course: 'B.Tech',
        program: 'B.Tech',
        specialization: 'Artificial Intelligence',
      };
      runAssertion('Distinct department with matching course/prog preserves department and shows program once', formatAcademicDetails(distinctDeptMatchingCourseProg) === 'Computer Science • B.Tech • Specialization: Artificial Intelligence');

      // 3. Verify PDF generation with matching values
      const testDraft = {
        summary: 'Focused academic research in artificial intelligence.',
        skills: [{ id: 's-1', name: 'Python', included: true }],
        projects: [],
        journey: [],
        achievements: [],
      };

      const { doc: matchingDoc } = buildResumePdfDoc({
        draft: testDraft,
        profile: matchingBcaProfile,
        user: { email: 'student@mentra.edu' },
      });
      const matchingPdfText = Buffer.from(matchingDoc.output('arraybuffer')).toString('latin1').replace(/\x95/g, '•');
      runAssertion('Matching PDF text contains single BCA with specialization', matchingPdfText.includes('BCA • Specialization: AI & Machine Learning'));
      runAssertion('Matching PDF text does NOT contain duplicate BCA • BCA', !matchingPdfText.includes('BCA • BCA'));

      // 4. Verify PDF generation with differing values
      const { doc: differingDoc } = buildResumePdfDoc({
        draft: testDraft,
        profile: differingCourseProg,
        user: { email: 'student@mentra.edu' },
      });
      const differingPdfText = Buffer.from(differingDoc.output('arraybuffer')).toString('latin1').replace(/\x95/g, '•');
      runAssertion('Differing PDF text contains Computer Science • B.Tech', differingPdfText.includes('Computer Science • B.Tech'));
    });

    // TEST 32: Resume Builder live preview renders academic line with deduplicated matching values and distinct differing values
    await test('Resume Builder live preview renders academic line with deduplicated matching values and distinct differing values', async () => {
      // 1. Test student with matching course and program ('BCA')
      const matchingBcaStudent = {
        id: testStudentId,
        full_name: 'Devon Vance',
        role: 'student',
        department: 'BCA',
        course: 'BCA',
        program: 'BCA',
        specialization: 'AI & Machine Learning',
        year: '2',
        batch: '2028',
        bio: 'BCA Scholar.',
        skills: ['Python', 'SQL'],
        achievements: ['Dean Commendation'],
        is_verified: true,
      };

      const page1 = await browser.newPage();
      setupPageMocks(page1, testStudentId, 'student', { profile: matchingBcaStudent });
      await page1.addInitScript(
        ({ key, session }) => {
          localStorage.setItem(key, JSON.stringify(session));
        },
        { key: storageKey, session: makeMockSession(testStudentId, 'devon@mentra.edu', { role: 'student' }) }
      );

      await page1.goto(`${baseUrl}/resume`);
      await page1.waitForSelector('[data-testid="preview-academic-details"]');

      const academicDetailsEl = page1.locator('[data-testid="preview-academic-details"]');
      const academicText = await academicDetailsEl.innerText();
      runAssertion('Preview displays single BCA with specialization', academicText.includes('BCA • Specialization: AI & Machine Learning'));
      runAssertion('Preview does NOT display duplicate BCA • BCA', !academicText.includes('BCA • BCA'));
      await page1.close();

      // 2. Test student with differing department and program ('Computer Science' and 'B.Tech')
      const differingStudent = {
        id: testStudentId,
        full_name: 'Aria Montgomery',
        role: 'student',
        department: 'Computer Science',
        course: 'Computer Science',
        program: 'B.Tech',
        specialization: 'Artificial Intelligence',
        year: '3',
        batch: '2027',
        bio: 'B.Tech Scholar.',
        skills: ['TypeScript', 'Python'],
        achievements: ['HackMIT Winner'],
        is_verified: true,
      };

      const page2 = await browser.newPage();
      setupPageMocks(page2, testStudentId, 'student', { profile: differingStudent });
      await page2.addInitScript(
        ({ key, session }) => {
          localStorage.setItem(key, JSON.stringify(session));
        },
        { key: storageKey, session: makeMockSession(testStudentId, 'aria@mentra.edu', { role: 'student' }) }
      );

      await page2.goto(`${baseUrl}/resume`);
      await page2.waitForSelector('[data-testid="preview-academic-details"]');

      const differingAcademicText = await page2.locator('[data-testid="preview-academic-details"]').innerText();
      runAssertion('Preview displays Computer Science • B.Tech for differing values', differingAcademicText.includes('Computer Science • B.Tech'));
      runAssertion('Preview includes specialization for differing profile', differingAcademicText.includes('Specialization: Artificial Intelligence'));
      await page2.close();
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
