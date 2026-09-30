/**
 * Phase 5, Step 2 — Profile Edit Verification Suite
 *
 * Exercises the ACTUAL PRODUCTION components and AuthContext methods:
 * - EditProfileModal.jsx
 * - AuthContext.jsx (AuthProvider, updateProfile)
 *
 * Zero test-only props on AuthProvider:
 * - Mounts pure production <AuthProvider> with no test-only props or branches.
 * - Authenticated sessions established at the external Supabase/API boundary (mock JWT in localStorage & setSession).
 * - Real fallback path: Provider startup -> Profile lookup returns no row -> supabase.auth.getUser() fetches /auth/v1/user -> production fallback upsert intercepted and asserted.
 *
 * Tests:
 * 1. Dialog semantics, accessibility, and label associations
 * 2. Form pre-fill from current profile
 * 3. Canonical academic years (1st Year - 4th Year; Graduate excluded from active options)
 * 4. Program change immediately clears specialization
 * 5. Validation rejects empty full name
 * 6. Validation rejects legacy invalid year upon submit
 * 7. End-to-end Student update: HTTP payload contains allowlisted fields, synchronizes department/course
 * 8. End-to-end Mentor update: HTTP payload preserves faculty department (omits department/course overwrite)
 * 9. Nullable fields (specialization, year, bio) sent as null over the wire when cleared
 * 10. Modal dismissal via Cancel button without sending HTTP requests
 * 11. Modal dismissal via Escape key without sending HTTP requests
 * 12. Legacy non-canonical profile values displayed gracefully as disabled options
 * 13. Supabase HTTP error handling displays error feedback
 * 14. Missing authentication rejects updateProfile
 * 15. Double-save prevention disables submit button and prevents duplicate dispatch
 * 16. Fallback for mentor with faculty department preserves department and sets program=null
 * 17. Fallback for mentor with existing course metadata preserves both department and course
 * 18. Fallback for student with valid canonical program persists program and synchronizes department/course
 * 19. Fallback with missing or invalid program metadata sets program=null with no non-canonical value sent
 * 20. Fallback with invalid meta.program but canonical meta.course uses course as canonical program
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

async function setup() {
  viteServer = await createServer({
    server: { port: 5199 },
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
  console.log('  MENTRA PHASE 5 STEP 2 — PROFILE EDIT VERIFICATION SUITE');
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

  const page = await browser.newPage();
  page.on('console', (msg) => {
    const text = msg.text();
    if (text.includes('Error') || text.includes('error')) {
      console.log('BROWSER CONSOLE:', text);
    }
  });

  const storageKey = 'sb-jqiqbiqybqnpmibceath-auth-token';
  const defaultUserId = '00000000-0000-0000-0000-000000000001';
  const defaultProfile = {
    id: defaultUserId,
    full_name: 'Alex Rivera',
    program: 'B.Tech',
    specialization: 'Cyber Security',
    year: '3rd Year',
    bio: 'Undergraduate researcher focusing on decentralized consensus and distributed ledger security.',
    department: 'B.Tech',
    course: 'B.Tech',
    batch: '2024-2028',
    role: 'student',
    is_verified: true,
    created_at: '2026-09-01T00:00:00.000Z',
  };

  let activeProfile = { ...defaultProfile };

  const defaultSession = makeMockSession(defaultUserId, 'alex@mentra.edu', {
    full_name: 'Alex Rivera',
    role: 'student',
    program: 'B.Tech',
    specialization: 'Cyber Security',
  });

  // Track intercepted Supabase REST requests
  let lastInterceptedRequest = null;
  let interceptedRequests = [];

  let fallbackUserId = null;
  let fallbackMeta = null;
  let lastUpsertPayload = null;
  let authGetUserCount = 0;

  // 1. External Supabase Auth Boundary Mock (/auth/v1/user)
  await page.route('**/auth/v1/user*', async (route) => {
    if (fallbackUserId && fallbackMeta) {
      authGetUserCount++;
      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: fallbackUserId,
          email: `${fallbackUserId}@mentra.edu`,
          user_metadata: fallbackMeta,
        }),
      });
      return;
    }

    const authHeader = route.request().headers()['authorization'] || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    let uid = defaultUserId;
    let email = 'alex@mentra.edu';
    let meta = { full_name: 'Alex Rivera', role: 'student' };

    try {
      if (token && token.includes('.')) {
        const decoded = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
        if (decoded.sub) uid = decoded.sub;
        if (decoded.email) email = decoded.email;
        if (decoded.user_metadata) meta = decoded.user_metadata;
      }
    } catch {
      // Fallback to default
    }

    await route.fulfill({
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: uid,
        email,
        user_metadata: meta,
      }),
    });
  });

  // External Supabase Auth Boundary Mock (/auth/v1/logout)
  await page.route('**/auth/v1/logout*', async (route) => {
    await route.fulfill({
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
  });

  // 2. External Supabase REST Database Boundary Mock (/rest/v1/profiles)
  await page.route('**/rest/v1/profiles*', async (route) => {
    const request = route.request();
    const method = request.method();
    const url = request.url();

    // Fallback profile creation flow: lookup finds no row -> upsert records fallback profile
    if (fallbackUserId) {
      if (method === 'GET' && url.includes(fallbackUserId)) {
        // Return 200 with null to simulate profile row not existing yet
        await route.fulfill({
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Content-Range': '*/0',
          },
          body: 'null',
        });
        return;
      }
      if (method === 'POST') {
        const postData = JSON.parse(request.postData() || '[]');
        const record = Array.isArray(postData) ? postData[0] : postData;
        if (record && record.id === fallbackUserId) {
          lastUpsertPayload = record;
          await route.fulfill({
            status: 201,
            headers: {
              'Content-Type': 'application/json',
              'Content-Range': '0-0/1',
            },
            body: JSON.stringify(record),
          });
          return;
        }
      }
    }

    // Standard profile read query
    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Range': '0-0/1',
        },
        body: JSON.stringify(activeProfile),
      });
      return;
    }

    // Standard profile mutation (PATCH / POST / PUT)
    if (method === 'PATCH' || method === 'POST' || method === 'PUT') {
      const postData = JSON.parse(request.postData() || '{}');
      lastInterceptedRequest = {
        method,
        url,
        data: postData,
      };
      interceptedRequests.push(lastInterceptedRequest);

      const updatedRecord = {
        ...activeProfile,
        ...postData,
      };
      activeProfile = updatedRecord;

      await route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Range': '0-0/1',
        },
        body: JSON.stringify(updatedRecord),
      });
      return;
    }

    await route.continue();
  });

  // Seed default session in browser storage before initial navigation
  await page.addInitScript(({ key, session }) => {
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, JSON.stringify(session));
    }
  }, { key: storageKey, session: defaultSession });

  // Navigate to test harness with normal AuthProvider startup
  await page.goto(`${baseUrl}/tests/fixtures/profile-test-harness.html`, { waitUntil: 'networkidle' });
  await page.locator('#test-auth-loading').filter({ hasText: 'ready' }).waitFor({ timeout: 5000 });

  // --- SECTION 1: DIALOG ACCESSIBILITY & INITIAL HYDRATION ---

  await test('1: EditProfileModal renders with accessible dialog semantics and associated labels', async () => {
    const dialog = page.locator('div[role="dialog"]');
    runAssertion('Modal dialog exists with role="dialog"', (await dialog.count()) === 1);
    runAssertion('Modal dialog has aria-modal="true"', (await dialog.getAttribute('aria-modal')) === 'true');
    runAssertion('Modal dialog has aria-labelledby="edit-profile-title"', (await dialog.getAttribute('aria-labelledby')) === 'edit-profile-title');

    const title = page.locator('#edit-profile-title');
    runAssertion('Dialog title exists', (await title.count()) === 1);
    runAssertion('Dialog title is Edit Academic Profile', (await title.innerText()) === 'Edit Academic Profile');

    const closeBtn = page.locator('button[aria-label="Close dialog"]');
    runAssertion('Close button has accessible aria-label', (await closeBtn.count()) === 1);

    // Associated labels check
    runAssertion('Name input has associated label', (await page.locator('label[for="edit-profile-fullname"]').count()) === 1);
    runAssertion('Program select has associated label', (await page.locator('label[for="edit-profile-program"]').count()) === 1);
    runAssertion('Specialization select has associated label', (await page.locator('label[for="edit-profile-specialization"]').count()) === 1);
    runAssertion('Year select has associated label', (await page.locator('label[for="edit-profile-year"]').count()) === 1);
    runAssertion('Bio textarea has associated label', (await page.locator('label[for="edit-profile-bio"]').count()) === 1);
  });

  await test('2: Form fields pre-fill accurately from existing profile state', async () => {
    const nameVal = await page.locator('#edit-profile-fullname').inputValue();
    const progVal = await page.locator('#edit-profile-program').inputValue();
    const specVal = await page.locator('#edit-profile-specialization').inputValue();
    const yearVal = await page.locator('#edit-profile-year').inputValue();
    const bioVal = await page.locator('#edit-profile-bio').inputValue();

    runAssertion('Full name pre-filled', nameVal === 'Alex Rivera');
    runAssertion('Program pre-filled', progVal === 'B.Tech');
    runAssertion('Specialization pre-filled', specVal === 'Cyber Security');
    runAssertion('Year pre-filled', yearVal === '3rd Year');
    runAssertion('Bio pre-filled', bioVal.includes('decentralized consensus'));
  });

  // --- SECTION 2: ACADEMIC YEAR CANONICAL CONVENTIONS ---

  await test('3: Year dropdown options strictly match 1st Year - 4th Year and exclude Graduate', async () => {
    const yearOptions = (await page.locator('#edit-profile-year option').allInnerTexts()).slice(1);
    runAssertion('Year options count is exactly 4', yearOptions.length === 4);
    runAssertion('Contains 1st Year', yearOptions.includes('1st Year'));
    runAssertion('Contains 2nd Year', yearOptions.includes('2nd Year'));
    runAssertion('Contains 3rd Year', yearOptions.includes('3rd Year'));
    runAssertion('Contains 4th Year', yearOptions.includes('4th Year'));
    runAssertion('Graduate is strictly excluded from canonical options', !yearOptions.includes('Graduate'));
  });

  // --- SECTION 3: DEPENDENT SPECIALIZATION & PROGRAM CHANGE RESET ---

  await test('4: Changing program from B.Tech to BCA immediately clears specialization', async () => {
    runAssertion('Specialization is Cyber Security', (await page.locator('#edit-profile-specialization').inputValue()) === 'Cyber Security');

    // Switch program to BCA
    await page.selectOption('#edit-profile-program', 'BCA');

    // Specialization must be IMMEDIATELY cleared to empty string
    const clearedSpecVal = await page.locator('#edit-profile-specialization').inputValue();
    runAssertion('Specialization cleared immediately on program switch', clearedSpecVal === '');

    // Available options are now BCA specializations (8 options)
    const bcaOptions = (await page.locator('#edit-profile-specialization option').allInnerTexts()).slice(1);
    runAssertion('BCA has 8 canonical specializations', bcaOptions.length === 8);
    runAssertion('BCA options contain Flutter Development', bcaOptions.includes('Flutter Development'));
    runAssertion('BCA options do not contain Internet of Things (IoT)', !bcaOptions.includes('Internet of Things (IoT)'));
  });

  // --- SECTION 4: FORM VALIDATION ---

  await test('5: Validation rejects empty full name', async () => {
    await page.fill('#edit-profile-fullname', '   ');
    await page.click('button[type="submit"]');

    const errorAlert = page.locator('.notice-box.error');
    runAssertion('Error alert shown for empty name', (await errorAlert.count()) === 1);
    runAssertion('Error mentions full legal or academic name', (await errorAlert.innerText()).includes('full legal or academic name'));
  });

  await test('6: Validation rejects legacy invalid year upon submit', async () => {
    // Inject legacy invalid year option to test submission validation
    await page.evaluate(() => {
      const yearSelect = document.getElementById('edit-profile-year');
      const opt = document.createElement('option');
      opt.value = 'Graduate';
      opt.innerText = 'Graduate (Legacy value)';
      yearSelect.appendChild(opt);
      yearSelect.value = 'Graduate';
      yearSelect.dispatchEvent(new Event('change', { bubbles: true }));
    });

    await page.fill('#edit-profile-fullname', 'Alex Rivera');
    await page.click('button[type="submit"]');

    const errorAlert = page.locator('.notice-box.error');
    runAssertion('Error alert shown for invalid year', (await errorAlert.count()) === 1);
    runAssertion('Error mentions valid academic year level', (await errorAlert.innerText()).includes('valid academic year level'));
  });

  // --- SECTION 5: PRODUCTION END-TO-END STUDENT UPDATE ---

  await test('7: Production Student update sends strict allowlist and synchronizes department/course', async () => {
    lastInterceptedRequest = null;

    // Fill valid data
    await page.fill('#edit-profile-fullname', 'Alex Rivera, Jr.');
    await page.selectOption('#edit-profile-program', 'B.Tech');
    await page.selectOption('#edit-profile-specialization', 'AI & Data Science');
    await page.selectOption('#edit-profile-year', '4th Year');
    await page.fill('#edit-profile-bio', 'Undergraduate scholar researching neural verification.');

    await page.click('button[type="submit"]');

    // Wait for success notice
    const successNotice = page.locator('.notice-box.success');
    await successNotice.waitFor({ state: 'visible', timeout: 3000 });
    runAssertion('Success notice shown', true);

    // Verify intercepted HTTP request from the real AuthContext / Supabase client
    runAssertion('Supabase REST request was dispatched', lastInterceptedRequest !== null);
    runAssertion('Request URL filters by user id', lastInterceptedRequest.url.includes(`id=eq.${defaultUserId}`));

    const payload = lastInterceptedRequest.data;
    runAssertion('Payload has full_name', payload.full_name === 'Alex Rivera, Jr.');
    runAssertion('Payload has program', payload.program === 'B.Tech');
    runAssertion('Payload has specialization', payload.specialization === 'AI & Data Science');
    runAssertion('Payload has year', payload.year === '4th Year');
    runAssertion('Payload has bio', payload.bio.includes('neural verification'));

    // Student legacy synchronization verification
    runAssertion('Student department synced with program', payload.department === 'B.Tech');
    runAssertion('Student course synced with program', payload.course === 'B.Tech');

    // Security: verify protected fields are absent from HTTP body
    runAssertion('role is not in payload', payload.role === undefined);
    runAssertion('is_verified is not in payload', payload.is_verified === undefined);
    runAssertion('email is not in payload', payload.email === undefined);
    runAssertion('id is not in payload', payload.id === undefined);
    runAssertion('created_at is not in payload', payload.created_at === undefined);

    // Modal closes after success
    await page.locator('div[role="dialog"]').waitFor({ state: 'detached', timeout: 3000 });
    runAssertion('Modal closed automatically after success', true);
  });

  // --- SECTION 6: PRODUCTION END-TO-END MENTOR UPDATE (ROLE-AWARE PRESERVATION) ---

  await test('8: Production Mentor update preserves faculty department (does NOT overwrite with program)', async () => {
    lastInterceptedRequest = null;

    const mentorId = '00000000-0000-0000-0000-000000000002';
    const mentorProfile = {
      id: mentorId,
      full_name: 'Dr. Evelyn Reed',
      program: 'B.Tech',
      specialization: null,
      year: null,
      bio: 'Senior faculty in Systems Architecture.',
      department: 'Department of Computer Science', // Mentor faculty department
      course: null,
      batch: null,
      role: 'mentor',
      is_verified: true,
      created_at: '2026-09-01T00:00:00.000Z',
    };
    activeProfile = { ...mentorProfile };

    const mentorSession = makeMockSession(mentorId, 'evelyn@mentra.edu', {
      role: 'mentor',
      full_name: 'Dr. Evelyn Reed',
      department: 'Department of Computer Science',
    });

    await page.evaluate(async ({ session }) => {
      await window.__supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });
      await window.__profileAuth.refreshProfile();
      window.__profileHarness.setIsOpen(true);
    }, { session: mentorSession });

    await page.locator('div[role="dialog"]').waitFor({ state: 'visible' });

    // Verify mentor name is prefilled
    runAssertion('Mentor name prefilled', (await page.locator('#edit-profile-fullname').inputValue()) === 'Dr. Evelyn Reed');

    // Update program to B.Des and save
    await page.selectOption('#edit-profile-program', 'B.Des');
    await page.fill('#edit-profile-bio', 'Cross-disciplinary design faculty.');
    await page.click('button[type="submit"]');

    await page.locator('.notice-box.success').waitFor({ state: 'visible', timeout: 3000 });
    runAssertion('Mentor save success notice shown', true);

    runAssertion('Supabase update was dispatched for mentor', lastInterceptedRequest !== null);
    const mentorPayload = lastInterceptedRequest.data;
    runAssertion('Mentor payload has updated program', mentorPayload.program === 'B.Des');
    runAssertion('Mentor payload has updated bio', mentorPayload.bio === 'Cross-disciplinary design faculty.');

    // CRITICAL SECURITY & COMPATIBILITY CHECK:
    // department and course must NOT be in mentorPayload to preserve faculty department
    runAssertion('Mentor payload DOES NOT overwrite department', mentorPayload.department === undefined);
    runAssertion('Mentor payload DOES NOT set course', mentorPayload.course === undefined);

    await page.locator('div[role="dialog"]').waitFor({ state: 'detached', timeout: 3000 });

    // Restore student session and profile
    activeProfile = { ...defaultProfile };
    await page.evaluate(async ({ session }) => {
      await window.__supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });
      await window.__profileAuth.refreshProfile();
    }, { session: defaultSession });
    await page.waitForFunction((id) => window.__profileAuth?.user?.id === id, defaultUserId);
  });

  // --- SECTION 7: NULLABLE FIELDS (SPECIALIZATION, YEAR, BIO) SAVED AS NULL ---

  await test('9: Empty specialization, year, and bio are saved as null over the wire', async () => {
    lastInterceptedRequest = null;

    activeProfile = {
      id: defaultUserId,
      full_name: 'Alex Rivera',
      program: 'BBA',
      specialization: 'Digital Marketing',
      year: '2nd Year',
      bio: 'Business analytics explorer.',
      department: 'BBA',
      course: 'BBA',
      batch: '2024-2028',
      role: 'student',
      is_verified: true,
      created_at: '2026-09-01T00:00:00.000Z',
    };

    await page.evaluate(async () => {
      await window.__profileAuth.refreshProfile();
      window.__profileHarness.setIsOpen(true);
    });

    await page.locator('div[role="dialog"]').waitFor({ state: 'visible' });

    // Clear optional fields
    await page.selectOption('#edit-profile-specialization', '');
    await page.selectOption('#edit-profile-year', '');
    await page.fill('#edit-profile-bio', '');

    await page.click('button[type="submit"]');
    await page.locator('.notice-box.success').waitFor({ state: 'visible', timeout: 3000 });

    runAssertion('Request intercepted', lastInterceptedRequest !== null);
    const payload = lastInterceptedRequest.data;
    runAssertion('Empty specialization saved as null', payload.specialization === null);
    runAssertion('Empty year saved as null', payload.year === null);
    runAssertion('Empty bio saved as null', payload.bio === null);

    await page.locator('div[role="dialog"]').waitFor({ state: 'detached', timeout: 3000 });
  });

  // --- SECTION 8: DISMISSAL WITHOUT SUBMITTING (CANCEL & ESCAPE) ---

  await test('10: Cancel button closes modal without submitting HTTP request', async () => {
    const beforeCount = interceptedRequests.length;

    await page.click('#open-modal-btn');
    await page.locator('div[role="dialog"]').waitFor({ state: 'visible' });

    await page.fill('#edit-profile-fullname', 'Discarded Name Edit');
    await page.click('button:has-text("Cancel")');

    await page.locator('div[role="dialog"]').waitFor({ state: 'detached' });
    runAssertion('No HTTP request was sent on Cancel', interceptedRequests.length === beforeCount);
  });

  await test('11: Escape key dismisses modal without submitting HTTP request', async () => {
    const beforeCount = interceptedRequests.length;

    await page.click('#open-modal-btn');
    await page.locator('div[role="dialog"]').waitFor({ state: 'visible' });

    await page.keyboard.press('Escape');
    await page.locator('div[role="dialog"]').waitFor({ state: 'detached' });

    runAssertion('No HTTP request was sent on Escape', interceptedRequests.length === beforeCount);
  });

  // --- SECTION 9: LEGACY PROFILE VALUES HANDLING ---

  await test('12: Legacy non-canonical program value displayed gracefully without throwing', async () => {
    activeProfile = {
      id: defaultUserId,
      full_name: 'Legacy Scholar',
      program: 'Legacy Aerospace Engineering',
      specialization: null,
      year: null,
      bio: null,
      department: 'Legacy Aerospace Engineering',
      course: 'Legacy Aerospace Engineering',
      batch: null,
      role: 'student',
      is_verified: false,
      created_at: '2026-09-01T00:00:00.000Z',
    };

    await page.evaluate(async () => {
      await window.__profileAuth.refreshProfile();
      window.__profileHarness.setIsOpen(true);
    });

    await page.locator('div[role="dialog"]').waitFor({ state: 'visible' });

    const legacyOption = page.locator('#edit-profile-program option:has-text("Legacy / Non-canonical")');
    runAssertion('Legacy program option is rendered', (await legacyOption.count()) > 0);
    runAssertion('Legacy program option is disabled', await legacyOption.isDisabled());

    await page.keyboard.press('Escape');
    await page.locator('div[role="dialog"]').waitFor({ state: 'detached' });

    // Restore standard student profile
    activeProfile = { ...defaultProfile };
    await page.evaluate(async () => {
      await window.__profileAuth.refreshProfile();
    });
  });

  // --- SECTION 10: SUPABASE ERROR FEEDBACK ---

  await test('13: Displays error banner when Supabase update fails', async () => {
    // Override route to return 500
    const errRoute = async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Internal database constraint violation' }),
      });
    };
    await page.route('**/rest/v1/profiles*', errRoute);

    await page.click('#open-modal-btn');
    await page.locator('div[role="dialog"]').waitFor({ state: 'visible' });

    await page.selectOption('#edit-profile-program', 'B.Tech');
    await page.click('button[type="submit"]');

    const errorBox = page.locator('.notice-box.error');
    await errorBox.waitFor({ state: 'visible', timeout: 3000 });
    const actualErrorText = await errorBox.innerText();
    runAssertion('Error alert shown on Supabase failure', (await errorBox.count()) === 1);
    runAssertion('Error text shows server error message', actualErrorText.includes('Internal database constraint violation'));

    await page.keyboard.press('Escape');
    await page.locator('div[role="dialog"]').waitFor({ state: 'detached' });
    await page.unroute('**/rest/v1/profiles*', errRoute);
  });

  // --- SECTION 11: MISSING AUTHENTICATION REJECTION ---

  await test('14: Missing authentication session rejects updateProfile', async () => {
    await page.evaluate(async () => {
      await window.__supabase.auth.signOut();
      window.__profileHarness.setIsOpen(true);
    });
    await page.waitForFunction(() => !window.__profileAuth?.user);

    await page.locator('div[role="dialog"]').waitFor({ state: 'visible' });
    await page.selectOption('#edit-profile-program', 'B.Tech');
    await page.click('button[type="submit"]');

    const errorBox = page.locator('.notice-box.error');
    await errorBox.waitFor({ state: 'visible', timeout: 3000 });
    const errText = await errorBox.innerText();
    runAssertion('Unauthorized error alert displayed', errText.includes('Authentication required'));

    await page.keyboard.press('Escape');
    await page.locator('div[role="dialog"]').waitFor({ state: 'detached' });

    // Restore default session
    await page.evaluate(async ({ session }) => {
      await window.__supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });
      await window.__profileAuth.refreshProfile();
    }, { session: defaultSession });
    await page.waitForFunction((id) => window.__profileAuth?.user?.id === id, defaultUserId);
  });

  // --- SECTION 12: DOUBLE SAVE PREVENTION ---

  await test('15: Double-save prevention disables submit button and prevents duplicate dispatch', async () => {
    let patchCount = 0;
    // Intercept with simulated delay
    const delayRoute = async (route) => {
      if (route.request().method() === 'PATCH') {
        patchCount++;
        await new Promise((r) => setTimeout(r, 600));
        await route.fulfill({
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Content-Range': '0-0/1',
          },
          body: JSON.stringify({
            ...activeProfile,
          }),
        });
      } else {
        await route.continue();
      }
    };
    await page.route('**/rest/v1/profiles*', delayRoute);

    await page.click('#open-modal-btn');
    await page.locator('div[role="dialog"]').waitFor({ state: 'visible' });

    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();

    runAssertion('Submit button is disabled during save', await submitBtn.isDisabled());
    runAssertion('Submit button shows Saving Changes...', (await submitBtn.innerText()).includes('Saving Changes...'));

    await page.waitForTimeout(900);
    runAssertion('Exactly 1 PATCH request was dispatched (no duplicate saves)', patchCount === 1);
    await page.unroute('**/rest/v1/profiles*', delayRoute);
  });

  // --- SECTION 13: PRODUCTION FALLBACK PROFILE CREATION (ROLE-AWARE & CANONICAL PROGRAM INVARIANTS) ---
  //
  // Real flow:
  // 1. Seed localStorage with mocked session for fallback user.
  // 2. Reload page to trigger fresh AuthProvider startup (initAuth).
  // 3. fetchProfile performs lookup on profiles table -> intercepted, returns no row (null).
  // 4. fetchProfile calls supabase.auth.getUser() -> intercepted /auth/v1/user HTTP request returning metadata.
  // 5. AuthContext executes production fallback logic and calls supabase.from('profiles').upsert(...)
  // 6. Test intercepts upsert HTTP POST request and asserts payload.

  const triggerProviderFallbackStartup = async (targetUid, meta) => {
    lastUpsertPayload = null;
    authGetUserCount = 0;
    fallbackUserId = targetUid;
    fallbackMeta = meta;

    const session = makeMockSession(targetUid, `${targetUid}@mentra.edu`, meta);

    // Seed localStorage with mock session for targetUid so provider startup finds it
    await page.evaluate(({ key, mockSession }) => {
      localStorage.setItem(key, JSON.stringify(mockSession));
    }, { key: storageKey, mockSession: session });

    // Reload page to trigger clean AuthProvider startup
    await page.reload({ waitUntil: 'networkidle' });

    // Wait until AuthProvider completes startup
    await page.locator('#test-auth-loading').filter({ hasText: 'ready' }).waitFor({ timeout: 5000 });

    // Read the resulting profile from harness state
    const resultProfileText = await page.locator('#test-state-profile').innerText();
    return JSON.parse(resultProfileText || 'null');
  };

  await test('16: Fallback for mentor with faculty department preserves department and sets program=null', async () => {
    const fallbackId = '00000000-0000-0000-0000-000000000010';
    const meta = {
      role: 'mentor',
      full_name: 'Prof. Alan Turing',
      department: 'Department of Computer Science and Technology',
    };

    const result = await triggerProviderFallbackStartup(fallbackId, meta);

    runAssertion('supabase.auth.getUser() dispatched HTTP request to /auth/v1/user', authGetUserCount > 0);
    runAssertion('Upsert was intercepted over the wire', lastUpsertPayload !== null);
    runAssertion('Target row ID matches user ID', lastUpsertPayload.id === fallbackId);
    runAssertion('Mentor faculty department is preserved exactly', lastUpsertPayload.department === 'Department of Computer Science and Technology');
    runAssertion('Program is strictly null (not faculty dept)', lastUpsertPayload.program === null);
    runAssertion('Course is null (not faculty dept)', lastUpsertPayload.course === null);
    runAssertion('Role is mentor', lastUpsertPayload.role === 'mentor');
    runAssertion('is_verified is false', lastUpsertPayload.is_verified === false);
    runAssertion('Full name is preserved', lastUpsertPayload.full_name === 'Prof. Alan Turing');
    runAssertion('Provider startup returned matching fallback profile', result.department === 'Department of Computer Science and Technology' && result.program === null);
  });

  await test('17: Fallback for mentor with existing course metadata preserves both department and course', async () => {
    const fallbackId = '00000000-0000-0000-0000-000000000011';
    const meta = {
      role: 'mentor',
      full_name: 'Dr. Grace Hopper',
      department: 'Department of Electrical Engineering',
      course: 'Compiler Architecture',
      program: 'B.Tech',
    };

    const result = await triggerProviderFallbackStartup(fallbackId, meta);

    runAssertion('supabase.auth.getUser() dispatched HTTP request to /auth/v1/user', authGetUserCount > 0);
    runAssertion('Upsert was intercepted over the wire', lastUpsertPayload !== null);
    runAssertion('Mentor faculty department preserved', lastUpsertPayload.department === 'Department of Electrical Engineering');
    runAssertion('Mentor existing course preserved rather than replaced by program', lastUpsertPayload.course === 'Compiler Architecture');
    runAssertion('Canonical program preserved', lastUpsertPayload.program === 'B.Tech');
    runAssertion('Role is mentor', lastUpsertPayload.role === 'mentor');
    runAssertion('Provider startup returned matching fallback profile', result.course === 'Compiler Architecture' && result.department === 'Department of Electrical Engineering');
  });

  await test('18: Fallback for student with valid canonical program persists program and synchronizes department/course', async () => {
    const fallbackId = '00000000-0000-0000-0000-000000000012';
    const meta = {
      role: 'student',
      full_name: 'Linus Torvalds',
      program: 'BCA',
      specialization: 'Flutter Development',
    };

    const result = await triggerProviderFallbackStartup(fallbackId, meta);

    runAssertion('supabase.auth.getUser() dispatched HTTP request to /auth/v1/user', authGetUserCount > 0);
    runAssertion('Upsert was intercepted over the wire', lastUpsertPayload !== null);
    runAssertion('Student canonical program persisted', lastUpsertPayload.program === 'BCA');
    runAssertion('Student specialization persisted', lastUpsertPayload.specialization === 'Flutter Development');
    runAssertion('Legacy department synchronized with program', lastUpsertPayload.department === 'BCA');
    runAssertion('Legacy course synchronized with program', lastUpsertPayload.course === 'BCA');
    runAssertion('Role is student', lastUpsertPayload.role === 'student');
    runAssertion('Provider startup returned matching fallback student profile', result.program === 'BCA' && result.department === 'BCA');
  });

  await test('19: Fallback with missing or invalid program metadata sets program=null with no non-canonical value sent', async () => {
    const fallbackId = '00000000-0000-0000-0000-000000000013';
    const meta = {
      role: 'student',
      full_name: 'Claude Shannon',
      program: 'Information Theory and Cryptography', // non-canonical program
      department: 'Information Theory and Cryptography',
    };

    const result = await triggerProviderFallbackStartup(fallbackId, meta);

    runAssertion('supabase.auth.getUser() dispatched HTTP request to /auth/v1/user', authGetUserCount > 0);
    runAssertion('Upsert was intercepted over the wire', lastUpsertPayload !== null);
    runAssertion('Program is strictly null (non-canonical string rejected)', lastUpsertPayload.program === null);
    runAssertion('Department preserved as legacy department', lastUpsertPayload.department === 'Information Theory and Cryptography');
    runAssertion('Course preserved as legacy department fallback', lastUpsertPayload.course === 'Information Theory and Cryptography');
    runAssertion('Specialization is null when program is null', lastUpsertPayload.specialization === null);
    runAssertion('Role is student', lastUpsertPayload.role === 'student');
    runAssertion('Provider startup returned matching fallback profile with null program', result.program === null);
  });

  await test('20: Fallback with invalid meta.program but canonical meta.course uses course as canonical program', async () => {
    const fallbackId = '00000000-0000-0000-0000-000000000014';
    const meta = {
      role: 'student',
      full_name: 'Margaret Hamilton',
      program: 'Apollo Guidance Systems', // invalid program
      course: 'B.Tech', // canonical course
      specialization: 'Cyber Security', // valid for B.Tech
    };

    const result = await triggerProviderFallbackStartup(fallbackId, meta);

    runAssertion('supabase.auth.getUser() dispatched HTTP request to /auth/v1/user', authGetUserCount > 0);
    runAssertion('Upsert was intercepted over the wire', lastUpsertPayload !== null);
    runAssertion('Program derived from canonical course value (B.Tech)', lastUpsertPayload.program === 'B.Tech');
    runAssertion('Student specialization valid for B.Tech is preserved', lastUpsertPayload.specialization === 'Cyber Security');
    runAssertion('Student department synchronized with canonical program', lastUpsertPayload.department === 'B.Tech');
    runAssertion('Student course synchronized with canonical program', lastUpsertPayload.course === 'B.Tech');
    runAssertion('Role is student', lastUpsertPayload.role === 'student');
    runAssertion('Provider startup returned matching fallback student profile', result.program === 'B.Tech' && result.specialization === 'Cyber Security');
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
    console.error('Test suite failed:', err);
    process.exit(1);
  } finally {
    await teardown();
  }
})();
