import { chromium } from 'file:///C:/Anti%20Gravity/mentra%202/v1/node_modules/playwright/index.mjs';

const BASE_URL = 'http://localhost:5173';
const SUPABASE_PROJECT_REF = 'jqiqbiqybqnpmibceath';

function createMockJwt(userId, email, role) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const exp = Math.floor(Date.now() / 1000) + 86400; // 24 hours
  const payload = Buffer.from(JSON.stringify({
    sub: userId,
    email: email,
    role: 'authenticated',
    aud: 'authenticated',
    exp: exp,
    iat: Math.floor(Date.now() / 1000),
    user_metadata: { role: role }
  })).toString('base64url');
  const signature = 'mock-signature';
  return `${header}.${payload}.${signature}`;
}

const ROLES = {
  unauthenticated: null,
  student: {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'student@mentra.edu',
    profile: {
      id: '00000000-0000-0000-0000-000000000001',
      full_name: 'Alex Rivera',
      department: 'Computer Science',
      course: 'B.Tech',
      year: '3rd Year',
      batch: '2024-2028',
      role: 'student',
      is_verified: false,
      created_at: new Date().toISOString(),
    }
  },
  mentor_unverified: {
    id: '00000000-0000-0000-0000-000000000002',
    email: 'unverified.mentor@mentra.edu',
    profile: {
      id: '00000000-0000-0000-0000-000000000002',
      full_name: 'Dr. Evelyn Reed',
      department: 'Computer Science',
      course: null,
      year: null,
      batch: null,
      role: 'mentor',
      is_verified: false,
      created_at: new Date().toISOString(),
    }
  },
  mentor_verified: {
    id: '00000000-0000-0000-0000-000000000003',
    email: 'verified.mentor@mentra.edu',
    profile: {
      id: '00000000-0000-0000-0000-000000000003',
      full_name: 'Prof. Marcus Vance',
      department: 'Information Technology',
      course: null,
      year: null,
      batch: null,
      role: 'mentor',
      is_verified: true,
      created_at: new Date().toISOString(),
    }
  },
  admin: {
    id: '00000000-0000-0000-0000-000000000004',
    email: 'admin@mentra.edu',
    profile: {
      id: '00000000-0000-0000-0000-000000000004',
      full_name: 'Dean Eleanor Wright',
      department: 'Dean of Academic Affairs',
      course: null,
      year: null,
      batch: null,
      role: 'admin',
      is_verified: true,
      created_at: new Date().toISOString(),
    }
  }
};

async function createRoleContext(browser, roleConfig) {
  const context = await browser.newContext();

  if (roleConfig) {
    const token = createMockJwt(roleConfig.id, roleConfig.email, roleConfig.profile.role);
    const sessionData = {
      access_token: token,
      token_type: 'bearer',
      expires_in: 86400,
      expires_at: Math.floor(Date.now() / 1000) + 86400,
      refresh_token: 'mock-refresh-token',
      user: {
        id: roleConfig.id,
        aud: 'authenticated',
        role: 'authenticated',
        email: roleConfig.email,
        email_confirmed_at: new Date().toISOString(),
        app_metadata: { provider: 'email' },
        user_metadata: { role: roleConfig.profile.role },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    };

    // Inject session into localStorage before any page script executes
    await context.addInitScript(({ key, value }) => {
      window.localStorage.setItem(key, JSON.stringify(value));
    }, {
      key: `sb-${SUPABASE_PROJECT_REF}-auth-token`,
      value: sessionData
    });

    // Intercept Supabase REST profile query
    await context.route('**/rest/v1/profiles*', async (route) => {
      const url = route.request().url();
      if (url.includes('select=')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([roleConfig.profile]),
        });
      } else {
        await route.continue();
      }
    });

    // Intercept all other Supabase queries so dashboards load mock-cleanly
    await context.route('**/rest/v1/projects*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await context.route('**/rest/v1/journey*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await context.route('**/rest/v1/mentorships*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });
  }

  return context;
}

// Test a route under a specific authentication context
async function testSingleRoute(browser, roleConfig, targetPath) {
  const context = await createRoleContext(browser, roleConfig);
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (!text.includes('favicon') && !text.includes('404')) {
        consoleErrors.push(text);
      }
    }
  });

  page.on('pageerror', (err) => {
    consoleErrors.push(err.message);
  });

  const fullUrl = `${BASE_URL}${targetPath}`;
  const response = await page.goto(fullUrl, { waitUntil: 'networkidle' });
  const status = response ? response.status() : null;
  const initialPath = new URL(page.url()).pathname;

  // Test Refresh
  const reloadResponse = await page.reload({ waitUntil: 'networkidle' });
  const reloadStatus = reloadResponse ? reloadResponse.status() : null;
  const pathAfterRefresh = new URL(page.url()).pathname;

  await context.close();

  return {
    status,
    reloadStatus,
    initialPath,
    pathAfterRefresh,
    consoleErrors,
  };
}

async function runTestSuite() {
  console.log('===============================================================');
  console.log('  MENTRA ROUTE VERIFICATION SUITE — POST ARCHITECTURE REFACTOR');
  console.log('===============================================================\n');

  const browser = await chromium.launch({ headless: true });

  const routesConfig = [
    { path: '/', name: 'Landing Page', type: 'public' },
    { path: '/login', name: 'Login Page', type: 'public_auth' },
    { path: '/signup', name: 'Sign Up Page', type: 'public_auth' },
    { path: '/reset-password', name: 'Reset Password Page', type: 'public_auth' },
    { path: '/projects', name: 'Public Projects Showcase', type: 'public' },
    { path: '/student', name: 'Student Dashboard', type: 'protected', allowedRoleKey: 'student', unauthorizedRoleKey: 'mentor_verified' },
    { path: '/mentor', name: 'Mentor Dashboard', type: 'protected', allowedRoleKey: 'mentor_verified', unauthorizedRoleKey: 'student' },
    { path: '/mentor/pending', name: 'Mentor Pending Verification', type: 'protected', allowedRoleKey: 'mentor_unverified', unauthorizedRoleKey: 'student' },
    { path: '/admin', name: 'Admin Dashboard', type: 'protected', allowedRoleKey: 'admin', unauthorizedRoleKey: 'student' },
    { path: '/journey', name: 'Academic Journey Timeline', type: 'protected', allowedRoleKey: 'student', unauthorizedRoleKey: null },
    { path: '/ai', name: 'Student AI Advisor', type: 'protected', allowedRoleKey: 'student', unauthorizedRoleKey: 'mentor_verified' },
    { path: '/mentor/ai', name: 'Mentor AI Co-Pilot', type: 'protected', allowedRoleKey: 'mentor_verified', unauthorizedRoleKey: 'mentor_unverified' },
  ];

  const results = [];

  for (const r of routesConfig) {
    console.log(`[TESTING] Route: ${r.path} (${r.name})`);

    let pageLoads = false;
    let noConsoleErrors = false;
    let refreshWorks = false;
    let unauthorizedBlocked = false;
    let correctRoleAccess = false;
    let errors = [];

    if (r.type === 'public' || r.type === 'public_auth') {
      // 1. Test public route with unauthenticated visitor
      const unauth = await testSingleRoute(browser, ROLES.unauthenticated, r.path);
      pageLoads = unauth.status === 200;
      noConsoleErrors = unauth.consoleErrors.length === 0;
      refreshWorks = unauth.reloadStatus === 200 && unauth.pathAfterRefresh === r.path;
      unauthorizedBlocked = true; // Public routes don't block unauthenticated visitors
      correctRoleAccess = unauth.initialPath === r.path;
      errors = unauth.consoleErrors;

      // For public_auth routes, also verify that an already-authenticated user is redirected safely
      if (r.type === 'public_auth' && r.path === '/login') {
        const authUser = await testSingleRoute(browser, ROLES.student, '/login');
        const authRedirectOk = authUser.initialPath === '/student';
        console.log(`  -> Authenticated student visiting /login redirects to dashboard: ${authRedirectOk ? 'PASS' : 'FAIL'} (${authUser.initialPath})`);
      }
    } else {
      // Protected Route Testing
      // 1. Unauthenticated Visitor should be BLOCKED and redirected to /login
      const unauth = await testSingleRoute(browser, ROLES.unauthenticated, r.path);
      const unauthBlocked = unauth.initialPath === '/login';

      // 2. Cross-Role Visitor should be BLOCKED and redirected away
      let crossBlocked = true;
      let crossPath = 'N/A';
      if (r.unauthorizedRoleKey) {
        const cross = await testSingleRoute(browser, ROLES[r.unauthorizedRoleKey], r.path);
        crossPath = cross.initialPath;
        // Should not remain on the protected route
        crossBlocked = cross.initialPath !== r.path;
      }
      unauthorizedBlocked = unauthBlocked && crossBlocked;

      // 3. Authorized User should be GRANTED access
      const auth = await testSingleRoute(browser, ROLES[r.allowedRoleKey], r.path);
      pageLoads = auth.status === 200;
      noConsoleErrors = auth.consoleErrors.length === 0;
      refreshWorks = auth.reloadStatus === 200 && auth.pathAfterRefresh === r.path;
      correctRoleAccess = auth.initialPath === r.path;
      errors = auth.consoleErrors;
    }

    const routePassed = pageLoads && noConsoleErrors && refreshWorks && unauthorizedBlocked && correctRoleAccess;

    results.push({
      path: r.path,
      name: r.name,
      pageLoads,
      noConsoleErrors,
      refreshWorks,
      unauthorizedBlocked,
      correctRoleAccess,
      errors,
      passed: routePassed,
    });

    console.log(`  -> Page Loads: ${pageLoads ? 'PASS' : 'FAIL'}`);
    console.log(`  -> No Console Errors: ${noConsoleErrors ? 'PASS (0)' : 'FAIL (' + errors.length + ')'}`);
    console.log(`  -> Refresh Works: ${refreshWorks ? 'PASS' : 'FAIL'}`);
    console.log(`  -> Unauthorized Blocked: ${unauthorizedBlocked ? 'PASS' : 'FAIL'}`);
    console.log(`  -> Correct Role Can Access: ${correctRoleAccess ? 'PASS' : 'FAIL'}`);
    console.log(`  -> Overall Route Result: ${routePassed ? 'PASS' : 'FAIL'}\n`);
  }

  await browser.close();

  console.log('\n========================================================================================');
  console.log('                               FINAL ROUTE AUDIT MATRIX');
  console.log('========================================================================================');
  console.log(
    'Route'.padEnd(18) +
    'Loads'.padEnd(10) +
    'No Errors'.padEnd(12) +
    'Refresh'.padEnd(10) +
    'Blocked'.padEnd(12) +
    'Role Access'.padEnd(14) +
    'Result'
  );
  console.log('----------------------------------------------------------------------------------------');

  let allSucceeded = true;
  for (const res of results) {
    if (!res.passed) allSucceeded = false;
    console.log(
      res.path.padEnd(18) +
      (res.pageLoads ? 'YES' : 'NO').padEnd(10) +
      (res.noConsoleErrors ? 'YES (0)' : 'NO').padEnd(12) +
      (res.refreshWorks ? 'YES' : 'NO').padEnd(10) +
      (res.unauthorizedBlocked ? 'YES' : 'NO').padEnd(12) +
      (res.correctRoleAccess ? 'YES' : 'NO').padEnd(14) +
      (res.passed ? 'PASS' : 'FAIL')
    );
  }
  console.log('========================================================================================');
  console.log(`FINAL RESULT: ${allSucceeded ? '100% PASSED (12 of 12 routes fully verified)' : 'FAILURES DETECTED'}`);
  console.log('========================================================================================\n');
}

runTestSuite().catch((err) => {
  console.error('Test Suite Fatal Error:', err);
});
