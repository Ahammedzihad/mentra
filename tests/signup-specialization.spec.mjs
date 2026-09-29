/**
 * Phase 5, Step 1 — Signup Specialization Dropdown Verification Suite
 *
 * Tests:
 * A. Canonical option coverage (4 programs, 22 specializations, exact strings)
 * B. Dependent selection behavior (disabled initially, program switch reset, shared specialization reset)
 * C. Invalid and stale values rejection (missing values, mismatched program/specialization)
 * D. Persistence flow (payload verification)
 * E. Signup regression (fields, role selection, validation)
 * F. Accessibility & responsive behavior (labels, keyboard access, mobile viewport)
 */

import { chromium } from 'playwright';
import { createServer } from 'vite';
import {
  CANONICAL_PROGRAMS,
  PROGRAM_SPECIALIZATIONS,
  isValidProgram,
  isValidSpecialization,
  getSpecializationsForProgram,
} from '../frontend/lib/academicPrograms.js';

let viteServer;
let browser;
let baseUrl;

const EXPECTED_SPECIALIZATIONS = {
  'B.Tech': [
    'AI & Machine Learning',
    'AI & Data Science',
    'Computer Science and Engineering',
    'Cyber Security',
    'Blockchain',
    'Internet of Things (IoT)',
  ],
  'BCA': [
    'AI & Data Science',
    'AI & Machine Learning',
    'Python Full Stack',
    'MERN Stack',
    'Flutter Development',
    'Cyber Security',
    'Blockchain',
    'UI/UX Designing',
  ],
  'BBA': [
    'Digital Marketing',
    'Business Analytics',
    'Aviation & Logistics',
    'Hospital Administration',
    'Film Making',
  ],
  'B.Des': [
    'Interaction Design (UI/UX systems)',
    'Communication Design',
    'Arts & Crafts Design',
  ],
};

async function setup() {
  viteServer = await createServer({
    server: { port: 5198 },
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

function runAssertion(desc, condition) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${desc}`);
    throw new Error(`Assertion failed: ${desc}`);
  }
  console.log(`  ✅ PASS: ${desc}`);
}

async function testSuite() {
  console.log('======================================================================');
  console.log('  MENTRA PHASE 5 STEP 1 — SIGNUP SPECIALIZATION VERIFICATION SUITE');
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
      console.error(`  ERROR in test: ${err.message}`);
      throw err;
    }
  }

  // --- SECTION A: CANONICAL OPTION COVERAGE ---
  await test('A1: Program list matches exactly 4 canonical programs', async () => {
    runAssertion('Canonical program count is 4', CANONICAL_PROGRAMS.length === 4);
    runAssertion('Programs contain B.Tech', CANONICAL_PROGRAMS.includes('B.Tech'));
    runAssertion('Programs contain BCA', CANONICAL_PROGRAMS.includes('BCA'));
    runAssertion('Programs contain BBA', CANONICAL_PROGRAMS.includes('BBA'));
    runAssertion('Programs contain B.Des', CANONICAL_PROGRAMS.includes('B.Des'));
  });

  await test('A2: Specialization counts match approved roadmap (6, 8, 5, 3 = 22 total)', async () => {
    runAssertion('B.Tech count is 6', PROGRAM_SPECIALIZATIONS['B.Tech'].length === 6);
    runAssertion('BCA count is 8', PROGRAM_SPECIALIZATIONS['BCA'].length === 8);
    runAssertion('BBA count is 5', PROGRAM_SPECIALIZATIONS['BBA'].length === 5);
    runAssertion('B.Des count is 3', PROGRAM_SPECIALIZATIONS['B.Des'].length === 3);

    const totalEntries = Object.values(PROGRAM_SPECIALIZATIONS).reduce((acc, list) => acc + list.length, 0);
    runAssertion('Total canonical entries count is exactly 22', totalEntries === 22);
  });

  await test('A3: Exact canonical string, punctuation, and capitalization matching', async () => {
    for (const [prog, expectedList] of Object.entries(EXPECTED_SPECIALIZATIONS)) {
      const actualList = PROGRAM_SPECIALIZATIONS[prog];
      runAssertion(`${prog} list length matches`, actualList.length === expectedList.length);
      for (let i = 0; i < expectedList.length; i++) {
        runAssertion(`${prog}[${i}] exact match: "${expectedList[i]}"`, actualList[i] === expectedList[i]);
      }
    }
  });

  await test('A4: Validation helpers correctness', async () => {
    runAssertion('B.Tech is valid program', isValidProgram('B.Tech'));
    runAssertion('InvalidProgram is not valid program', !isValidProgram('Engineering'));
    runAssertion('AI & Machine Learning valid under B.Tech', isValidSpecialization('B.Tech', 'AI & Machine Learning'));
    runAssertion('Film Making invalid under B.Tech', !isValidSpecialization('B.Tech', 'Film Making'));
    runAssertion('Film Making valid under BBA', isValidSpecialization('BBA', 'Film Making'));
    runAssertion('Empty specialization is invalid', !isValidSpecialization('B.Tech', ''));
    runAssertion('Null specialization is invalid', !isValidSpecialization('B.Tech', null));
    runAssertion('getSpecializationsForProgram returns B.Tech specs', getSpecializationsForProgram('B.Tech').length === 6);
    runAssertion('getSpecializationsForProgram returns empty array for invalid program', getSpecializationsForProgram('Invalid').length === 0);
  });

  // --- SECTION B & E: REAL BROWSER DOM AND REGRESSION TESTS ---
  const page = await browser.newPage();

  await test('B1: Initial signup page state (Specialization disabled before program chosen)', async () => {
    await page.goto(`${baseUrl}/signup`, { waitUntil: 'networkidle' });

    const programSelect = page.locator('#program');
    const specSelect = page.locator('#specialization');

    runAssertion('Program select exists', await programSelect.count() === 1);
    runAssertion('Specialization select exists', await specSelect.count() === 1);

    const isSpecDisabled = await specSelect.isDisabled();
    runAssertion('Specialization select is initially disabled', isSpecDisabled === true);

    const defaultOptionText = await specSelect.locator('option').first().innerText();
    runAssertion('Placeholder indicates selecting program first', defaultOptionText.includes('Select a program first'));

    const helperText = await page.locator('text=Please select an academic program above').count();
    runAssertion('Helper hint is visible when program unselected', helperText > 0);
  });

  await test('B2: Selecting B.Tech exposes only B.Tech specializations', async () => {
    await page.selectOption('#program', 'B.Tech');
    const specSelect = page.locator('#specialization');

    runAssertion('Specialization is now enabled', !(await specSelect.isDisabled()));

    const options = await specSelect.locator('option').allInnerTexts();
    const actualOptions = options.slice(1); // omit placeholder

    runAssertion('B.Tech options count is 6', actualOptions.length === 6);
    for (let i = 0; i < EXPECTED_SPECIALIZATIONS['B.Tech'].length; i++) {
      runAssertion(`Option ${i} is ${EXPECTED_SPECIALIZATIONS['B.Tech'][i]}`, actualOptions[i] === EXPECTED_SPECIALIZATIONS['B.Tech'][i]);
    }
  });

  await test('B3: Changing program from B.Tech to BCA immediately clears selected specialization', async () => {
    // Select a specialization that also exists in BCA: "AI & Machine Learning"
    await page.selectOption('#specialization', 'AI & Machine Learning');
    runAssertion('Specialization set to AI & Machine Learning', (await page.locator('#specialization').inputValue()) === 'AI & Machine Learning');

    // Switch program to BCA
    await page.selectOption('#program', 'BCA');

    // Verify specialization is IMMEDIATELY CLEARED to empty string
    const specValueAfterSwitch = await page.locator('#specialization').inputValue();
    runAssertion('Specialization was immediately cleared upon program change', specValueAfterSwitch === '');

    // Verify BCA options are now populated (8 options)
    const bcaOptions = (await page.locator('#specialization option').allInnerTexts()).slice(1);
    runAssertion('BCA has 8 options', bcaOptions.length === 8);
    runAssertion('BCA contains Flutter Development', bcaOptions.includes('Flutter Development'));
    runAssertion('BCA does not contain Internet of Things (IoT)', !bcaOptions.includes('Internet of Things (IoT)'));
  });

  await test('B4: Selecting BBA exposes only BBA specializations and clears previous value', async () => {
    await page.selectOption('#specialization', 'MERN Stack');
    runAssertion('Selected MERN Stack in BCA', (await page.locator('#specialization').inputValue()) === 'MERN Stack');

    await page.selectOption('#program', 'BBA');
    runAssertion('Specialization cleared on switch to BBA', (await page.locator('#specialization').inputValue()) === '');

    const bbaOptions = (await page.locator('#specialization option').allInnerTexts()).slice(1);
    runAssertion('BBA has 5 options', bbaOptions.length === 5);
    runAssertion('BBA contains Hospital Administration', bbaOptions.includes('Hospital Administration'));
    runAssertion('BBA does not contain Blockchain', !bbaOptions.includes('Blockchain'));
  });

  await test('B5: Selecting B.Des exposes only B.Des specializations', async () => {
    await page.selectOption('#program', 'B.Des');
    runAssertion('Specialization cleared on switch to B.Des', (await page.locator('#specialization').inputValue()) === '');

    const bdesOptions = (await page.locator('#specialization option').allInnerTexts()).slice(1);
    runAssertion('B.Des has 3 options', bdesOptions.length === 3);
    runAssertion('B.Des contains Interaction Design (UI/UX systems)', bdesOptions.includes('Interaction Design (UI/UX systems)'));
    runAssertion('B.Des contains Arts & Crafts Design', bdesOptions.includes('Arts & Crafts Design'));
  });

  // --- SECTION C: INVALID AND STALE VALUES VALIDATION ---
  await test('C1: Missing program is rejected on submit', async () => {
    await page.fill('#fullname', 'Alice Testing');
    await page.fill('#email', 'alice.test@mentra.edu');
    await page.fill('#password', 'ValidPassword123');

    // Deselect program
    await page.selectOption('#program', '');

    // Bypass browser native HTML5 constraint validation to test JS onSubmit validator
    await page.evaluate(() => {
      document.querySelector('form').noValidate = true;
    });

    await page.click('button[type="submit"]');

    const errorNotice = page.locator('.notice-box.error');
    runAssertion('Error alert shown for missing program', (await errorNotice.count()) > 0);
    runAssertion('Error message specifies program requirement', (await errorNotice.innerText()).includes('Please select your academic program'));
  });

  await test('C2: Missing specialization is rejected on submit', async () => {
    await page.selectOption('#program', 'B.Tech');
    // specialization is empty
    await page.click('button[type="submit"]');

    const errorNotice = page.locator('.notice-box.error');
    runAssertion('Error alert shown for missing specialization', (await errorNotice.count()) > 0);
    runAssertion('Error message specifies specialization requirement', (await errorNotice.innerText()).includes('Please select your degree specialization'));
  });

  await test('C3: Stale / mismatched program & specialization is rejected by submission validator', async () => {
    // Artificially inject a mismatched specialization via DOM
    await page.evaluate(() => {
      const specSelect = document.getElementById('specialization');
      const opt = document.createElement('option');
      opt.value = 'Hospital Administration'; // BBA-only specialization
      opt.innerText = 'Hospital Administration';
      specSelect.appendChild(opt);
      specSelect.value = 'Hospital Administration';
      specSelect.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Submit with Program = B.Tech and Specialization = Hospital Administration
    await page.click('button[type="submit"]');

    const errorNotice = page.locator('.notice-box.error');
    runAssertion('Error alert shown for invalid combination', (await errorNotice.count()) > 0);
    runAssertion('Error rejects mismatched specialization', (await errorNotice.innerText()).includes('not valid for your chosen program'));
  });

  // --- SECTION D: PERSISTENCE PAYLOAD FLOW ---
  await test('D1: Persistence payload captures canonical program and specialization', async () => {
    // Intercept Supabase Auth request to verify sent payload
    let capturedPayload = null;
    await page.route('**/auth/v1/signup*', async (route) => {
      const request = route.request();
      const postData = JSON.parse(request.postData() || '{}');
      capturedPayload = postData;
      // Respond with a mock successful signup response
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: '00000000-0000-0000-0000-000000000099',
          aud: 'authenticated',
          role: 'authenticated',
          email: 'scholar@mentra.edu',
          user_metadata: postData.data,
          identities: [{ id: 'mock-identity' }],
        }),
      });
    });

    await page.fill('#fullname', 'Ada Lovelace');
    await page.fill('#email', 'scholar@mentra.edu');
    await page.fill('#password', 'ValidPassword123');
    await page.selectOption('#program', 'B.Tech');
    await page.selectOption('#specialization', 'Internet of Things (IoT)');

    await page.click('button[type="submit"]');

    // Wait for the simulated response to complete
    await page.waitForTimeout(500);

    runAssertion('Supabase Auth signup request was intercepted', capturedPayload !== null);
    runAssertion('Payload metadata contains exact program: "B.Tech"', capturedPayload?.data?.program === 'B.Tech');
    runAssertion('Payload metadata contains exact specialization: "Internet of Things (IoT)"', capturedPayload?.data?.specialization === 'Internet of Things (IoT)');
    runAssertion('Payload metadata maintains department compatibility: "B.Tech"', capturedPayload?.data?.department === 'B.Tech');
    runAssertion('Payload metadata maintains course compatibility: "B.Tech"', capturedPayload?.data?.course === 'B.Tech');

    await page.unroute('**/auth/v1/signup*');
  });

  // --- SECTION E: SIGNUP REGRESSION ---
  await test('E1: Password toggle works correctly without losing field values', async () => {
    await page.goto(`${baseUrl}/signup`, { waitUntil: 'networkidle' });

    const passwordInput = page.locator('#password');
    await passwordInput.fill('SecretPassword99');
    runAssertion('Password field initial type is password', (await passwordInput.getAttribute('type')) === 'password');

    const toggleBtn = page.locator('button[aria-label="Show password"]');
    await toggleBtn.click();
    runAssertion('Password field type changed to text after toggle', (await passwordInput.getAttribute('type')) === 'text');

    const hideBtn = page.locator('button[aria-label="Hide password"]');
    await hideBtn.click();
    runAssertion('Password field type changed back to password', (await passwordInput.getAttribute('type')) === 'password');
    runAssertion('Password value is preserved', (await passwordInput.inputValue()) === 'SecretPassword99');
  });

  await test('E2: Role switching between Student and Mentor preserves form state', async () => {
    await page.selectOption('#program', 'BCA');
    await page.selectOption('#specialization', 'Flutter Development');

    // Click Mentor button
    const mentorBtn = page.getByRole('button', { name: /^Mentor/ });
    await mentorBtn.click();

    // Verify program and specialization are preserved when toggling role
    runAssertion('Program preserved after role switch', (await page.locator('#program').inputValue()) === 'BCA');
    runAssertion('Specialization preserved after role switch', (await page.locator('#specialization').inputValue()) === 'Flutter Development');

    // Click Student button
    const studentBtn = page.getByRole('button', { name: /^Student/ });
    await studentBtn.click();
    runAssertion('Program preserved after toggling back to student', (await page.locator('#program').inputValue()) === 'BCA');
  });
  await test('F1: Accessible form labels and structure', async () => {
    const programLabel = page.locator('label[for="program"]');
    const specLabel = page.locator('label[for="specialization"]');

    runAssertion('Label for program exists and links to #program', (await programLabel.count()) === 1);
    runAssertion('Label for specialization exists and links to #specialization', (await specLabel.count()) === 1);

    // Keyboard focus check
    await page.focus('#program');
    const isProgramFocused = await page.evaluate(() => document.activeElement.id === 'program');
    runAssertion('Program dropdown can receive keyboard focus', isProgramFocused);

    await page.focus('#specialization');
    const isSpecFocused = await page.evaluate(() => document.activeElement.id === 'specialization');
    runAssertion('Specialization dropdown can receive keyboard focus', isSpecFocused);
  });

  await test('F2: Mobile viewport responsiveness and no horizontal overflow', async () => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE viewport
    await page.waitForTimeout(200);

    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    runAssertion('No horizontal overflow on mobile viewport (375px)', !hasHorizontalOverflow);
  });

  await page.close();

  console.log('\n======================================================================');
  console.log(`  ALL ${passedTests}/${totalTests} TESTS PASSED CLEANLY!`);
  console.log('======================================================================\n');
}

(async () => {
  try {
    await setup();
    await testSuite();
    await teardown();
    process.exit(0);
  } catch (err) {
    console.error('Test suite failed:', err);
    await teardown();
    process.exit(1);
  }
})();
