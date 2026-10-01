/**
 * Mentra Phase 6 Part A, Build Order Step 2 Verification Suite
 *
 * Verifies:
 * 1. Requesting an AI draft:
 *    - Correctly invokes 'personal-ai' Edge Function with { mode: 'project_draft', prompt }
 *    - Extracts structured draft ({ title, description, tags }) from successful response
 * 2. Boundary security & untrusted content sanitization:
 *    - Discards any draft-supplied visibility, user_id, or protected fields
 *    - Normalizes and sanitizes tags according to Phase 4 rules (lowercase, <=24 chars, max 6)
 * 3. AI-Assisted INSERT boundary enforcement:
 *    - Enforces visibility = 'private' on every AI-assisted project regardless of requested visibility
 *    - Derives owner (user_id) strictly from authenticated session (user.id)
 * 4. Manual project creation preservation:
 *    - Preserves user-selected visibility (college, public, private, selected) when not AI-assisted
 *    - Preserves selected scholar sharing (project_shares)
 *    - Preserves title and description validation
 * 5. Rejection & error handling:
 *    - Rejects failed AI requests without database insertion
 *    - Rejects malformed/incomplete drafts (missing title, description, tags) without database insertion
 *    - Rejects unauthenticated attempts and empty required fields
 * 6. Authenticated project INSERT path:
 *    - Exercises insertProjectRecord against mock Supabase boundary with projection query
 * 7. End-to-end flow with and without user pre-save edits
 */

import assert from 'node:assert/strict';
import {
  requestProjectDraft,
  prepareProjectInsert,
  insertProjectRecord,
  normalizeDraftTags,
  executeAiProjectDraftFlow,
} from '../features/projects/projectDraftService.js';

let totalTests = 0;
let passedTests = 0;

async function test(name, fn) {
  totalTests++;
  console.log(`\n[TEST ${totalTests}] ${name}`);
  try {
    await fn();
    passedTests++;
    console.log(`  ✅ PASS`);
  } catch (err) {
    console.error(`  ❌ FAIL: ${err.message}`);
    throw err;
  }
}

// Mock User
const mockUser = Object.freeze({
  id: 'student-uuid-42',
  email: 'scholar@mentra.edu',
  role: 'student',
});

console.log('======================================================================');
console.log('  MENTRA PHASE 6 PART A, STEP 2 — AI DRAFT & INSERT INTEGRATION SUITE');
console.log('======================================================================');

// 1. Requesting an AI Draft
await test('Consumes Step 1 contract: invokes personal-ai edge function in project_draft mode', async () => {
  let invokedFunction = null;
  let invokedPayload = null;

  const mockClient = {
    functions: {
      invoke: async (fnName, options) => {
        invokedFunction = fnName;
        invokedPayload = options?.body;
        return {
          data: {
            draft: {
              title: 'Autonomous Quadrotor Navigation',
              description: 'SLAM-based pathfinding in GPS-denied environments.',
              tags: ['robotics', 'slam', 'computer-vision'],
            },
            model: 'gemini-3.6-flash',
          },
          error: null,
        };
      },
    },
  };

  const draft = await requestProjectDraft({
    prompt: 'Build an autonomous drone pathfinding system',
    clientOverride: mockClient,
  });

  assert.equal(invokedFunction, 'personal-ai', 'Invokes personal-ai Edge Function');
  assert.equal(invokedPayload.mode, 'project_draft', 'Mode is project_draft');
  assert.equal(invokedPayload.prompt, 'Build an autonomous drone pathfinding system', 'Prompt is forwarded');

  assert.equal(draft.title, 'Autonomous Quadrotor Navigation');
  assert.equal(draft.description, 'SLAM-based pathfinding in GPS-denied environments.');
  assert.deepEqual(draft.tags, ['robotics', 'slam', 'computer-vision']);
});

// 2. Discarding Draft-Supplied Visibility and Protected Fields
await test('Discards any draft-supplied visibility, owner, or extraneous fields at client boundary', async () => {
  const mockClient = {
    functions: {
      invoke: async () => ({
        data: {
          draft: {
            title: 'Malicious Injected Project',
            description: 'Attempting to inject public visibility and alter user identity.',
            tags: ['security', 'exploit'],
            visibility: 'public', // Attacker attempt to auto-publish
            user_id: 'victim-student-uuid', // Attacker attempt to spoof owner
            id: 'tampered-project-id',
            created_at: '2020-01-01T00:00:00Z',
            is_verified: true,
          },
          model: 'gemini-3.6-flash',
        },
        error: null,
      }),
    },
  };

  const draft = await requestProjectDraft({
    prompt: 'Test prompt',
    clientOverride: mockClient,
  });

  assert.equal(draft.visibility, undefined, 'Draft visibility property is dropped');
  assert.equal(draft.user_id, undefined, 'Draft user_id property is dropped');
  assert.equal(draft.id, undefined, 'Draft id property is dropped');
  assert.equal(draft.created_at, undefined, 'Draft created_at property is dropped');
  assert.equal(draft.is_verified, undefined, 'Draft is_verified property is dropped');
  assert.deepEqual(Object.keys(draft).sort(), ['description', 'tags', 'title'].sort(), 'Only clean content returned');
});

// 3. Tag Normalization according to Phase 4 rules
await test('Sanitizes and normalizes tags adhering to Phase 4 rules (lowercase, <=24 chars, max 6)', () => {
  const rawTags = [
    '  Artificial Intelligence  ',
    'ARTIFICIAL INTELLIGENCE', // Duplicate
    'valid-tag',
    'invalid_symbol!', // Invalid character rejected
    'A'.repeat(30), // Exceeds 24 chars rejected
    'tag-three',
    'tag-four',
    'tag-five',
    'tag-six',
    'tag-seven-overflow', // Capped at 6
  ];

  const normalized = normalizeDraftTags(rawTags);
  assert.deepEqual(normalized, [
    'artificial intelligence',
    'valid-tag',
    'tag-three',
    'tag-four',
    'tag-five',
    'tag-six',
  ]);
  assert.equal(normalized.length, 6, 'Capped at maximum of 6 tags');
});

// 4. Rejection of Failed AI Invocations
await test('Rejects failed AI Edge Function requests and propagates descriptive error', async () => {
  // 4a. Network/HTTP error
  const mockErrorClient = {
    functions: {
      invoke: async () => ({
        data: null,
        error: { message: 'Edge function execution timed out' },
      }),
    },
  };

  await assert.rejects(
    () => requestProjectDraft({ prompt: 'Some prompt', clientOverride: mockErrorClient }),
    /Edge function execution timed out/
  );

  // 4b. AI Service Error in data
  const mockServiceErrorClient = {
    functions: {
      invoke: async () => ({
        data: { error: 'RATE_LIMIT_EXCEEDED', message: 'Personal AI rate limit exceeded' },
        error: null,
      }),
    },
  };

  await assert.rejects(
    () => requestProjectDraft({ prompt: 'Some prompt', clientOverride: mockServiceErrorClient }),
    /Personal AI rate limit exceeded/
  );
});

// 5. Rejection of Malformed or Incomplete AI Outputs
await test('Rejects malformed or incomplete AI responses without creating projects', async () => {
  // Missing draft object
  await assert.rejects(
    () =>
      requestProjectDraft({
        prompt: 'test',
        clientOverride: { functions: { invoke: async () => ({ data: {}, error: null }) } },
      }),
    /incomplete response without a project draft/
  );

  // Missing title
  await assert.rejects(
    () =>
      requestProjectDraft({
        prompt: 'test',
        clientOverride: {
          functions: {
            invoke: async () => ({
              data: { draft: { description: 'desc', tags: [] } },
              error: null,
            }),
          },
        },
      }),
    /missing a valid project title/
  );

  // Missing description
  await assert.rejects(
    () =>
      requestProjectDraft({
        prompt: 'test',
        clientOverride: {
          functions: {
            invoke: async () => ({
              data: { draft: { title: 'title', tags: [] } },
              error: null,
            }),
          },
        },
      }),
    /missing a valid project description/
  );

  // Invalid tags type
  await assert.rejects(
    () =>
      requestProjectDraft({
        prompt: 'test',
        clientOverride: {
          functions: {
            invoke: async () => ({
              data: { draft: { title: 'title', description: 'desc', tags: 'not-an-array' } },
              error: null,
            }),
          },
        },
      }),
    /invalid tags format/
  );
});

// 6. Enforcing visibility = 'private' for AI-Assisted Projects
await test('Enforces visibility = "private" at the insert boundary for all AI-assisted projects', () => {
  // Even if caller passed 'public'
  const { projectPayload: p1 } = prepareProjectInsert({
    title: 'AI Draft Title',
    description: 'AI Draft Description',
    tags: ['ai'],
    visibility: 'public', // Caller requests public
    isAiAssisted: true, // But it's AI-assisted
    user: mockUser,
  });
  assert.equal(p1.visibility, 'private', 'Forced to private despite visibility="public"');

  // Even if caller passed 'college'
  const { projectPayload: p2 } = prepareProjectInsert({
    title: 'AI Draft Title',
    description: 'AI Draft Description',
    tags: ['ai'],
    visibility: 'college',
    isAiAssisted: true,
    user: mockUser,
  });
  assert.equal(p2.visibility, 'private', 'Forced to private despite visibility="college"');

  // Even if caller passed 'selected'
  const { projectPayload: p3, shareRows } = prepareProjectInsert({
    title: 'AI Draft Title',
    description: 'AI Draft Description',
    tags: ['ai'],
    visibility: 'selected',
    isAiAssisted: true,
    user: mockUser,
    stagedUsers: [{ id: 'other-user' }],
  });
  assert.equal(p3.visibility, 'private', 'Forced to private despite visibility="selected"');
  assert.equal(shareRows.length, 0, 'No shares generated for private project');
});

// 7. Deriving Owner Strictly from Authenticated User Session
await test('Derives project owner strictly from authenticated user session and ignores draft content', () => {
  const { projectPayload } = prepareProjectInsert({
    title: 'Owner Test',
    description: 'Testing owner derivation',
    tags: ['test'],
    isAiAssisted: true,
    user: mockUser,
  });

  assert.equal(projectPayload.user_id, 'student-uuid-42', 'Owner is set to authenticated session user.id');

  // Rejects unauthenticated creation
  assert.throws(
    () =>
      prepareProjectInsert({
        title: 'Unauth Test',
        description: 'No session',
        user: null,
      }),
    /authenticated/
  );
});

// 8. Preserving Manual Project Creation Behavior
await test('Preserves manual project creation behavior, visibility choices, and validations', () => {
  // Manual College project
  const { projectPayload: pCollege } = prepareProjectInsert({
    title: 'Manual College Project',
    description: 'Manual Description',
    tags: ['manual', 'engineering'],
    visibility: 'college',
    isAiAssisted: false,
    user: mockUser,
  });
  assert.equal(pCollege.visibility, 'college', 'Manual college project preserves visibility');

  // Manual Public project
  const { projectPayload: pPublic } = prepareProjectInsert({
    title: 'Manual Public Project',
    description: 'Manual Description',
    tags: ['manual'],
    visibility: 'public',
    isAiAssisted: false,
    user: mockUser,
  });
  assert.equal(pPublic.visibility, 'public', 'Manual public project preserves visibility');

  // Manual Selected project with shares
  const { projectPayload: pSelected, shareRows } = prepareProjectInsert({
    title: 'Manual Selected Project',
    description: 'Manual Description',
    tags: ['manual'],
    visibility: 'selected',
    isAiAssisted: false,
    user: mockUser,
    stagedUsers: [{ id: 'peer-user-1' }, { id: 'peer-user-2' }, { id: mockUser.id }],
  });
  assert.equal(pSelected.visibility, 'selected', 'Manual selected project preserves visibility');
  assert.deepEqual(
    shareRows,
    [{ shared_with: 'peer-user-1' }, { shared_with: 'peer-user-2' }],
    'Owner filtered out of shares; peers included'
  );

  // Validation: Missing Title
  assert.throws(
    () =>
      prepareProjectInsert({
        title: '',
        description: 'valid desc',
        user: mockUser,
      }),
    /Please provide a project title/
  );

  // Validation: Missing Description
  assert.throws(
    () =>
      prepareProjectInsert({
        title: 'valid title',
        description: '',
        user: mockUser,
      }),
    /Please provide a project description/
  );

  // Validation: Too Many Tags
  assert.throws(
    () =>
      prepareProjectInsert({
        title: 'valid title',
        description: 'valid desc',
        tags: ['1', '2', '3', '4', '5', '6', '7'],
        user: mockUser,
      }),
    /Too many tags/
  );
});

// 9. Saving through Normal Authenticated Project INSERT Path
await test('Executes insertion via normal authenticated projects table insert with select projection', async () => {
  let insertedTable = null;
  let insertedRows = null;
  let selectClause = null;

  const mockDbClient = {
    from: (table) => {
      insertedTable = table;
      return {
        insert: (rows) => {
          insertedRows = rows;
          return {
            select: (sel) => {
              selectClause = sel;
              return {
                single: async () => ({
                  data: {
                    id: 'new-project-uuid-99',
                    ...rows[0],
                    created_at: new Date().toISOString(),
                  },
                  error: null,
                }),
              };
            },
          };
        },
      };
    },
  };

  const { projectPayload } = prepareProjectInsert({
    title: 'Authenticated Insert Test',
    description: 'Testing insert query dispatch',
    tags: ['insert-test'],
    isAiAssisted: true,
    user: mockUser,
  });

  const created = await insertProjectRecord({
    projectPayload,
    clientOverride: mockDbClient,
  });

  assert.equal(insertedTable, 'projects', 'Dispatched to projects table');
  assert.equal(insertedRows[0].visibility, 'private', 'Inserted with visibility=private');
  assert.equal(insertedRows[0].user_id, 'student-uuid-42', 'Inserted with user_id=student-uuid-42');
  assert.equal(selectClause, '*, profiles:user_id(full_name, department, role, is_verified)', 'Projection query verified');
  assert.equal(created.id, 'new-project-uuid-99', 'Returned created row');
});

// 10. End-to-End AI Draft Flow Integration
await test('End-to-End: full AI draft request to private project creation', async () => {
  let storedRow = null;

  const mockClient = {
    functions: {
      invoke: async () => ({
        data: {
          draft: {
            title: 'Quantum Key Distribution Simulator',
            description: 'Simulation of BB84 protocol over noisy quantum channels.',
            tags: ['Quantum', 'Cryptography', 'Simulation'],
          },
          model: 'gemini-3.6-flash',
        },
        error: null,
      }),
    },
    from: (table) => ({
      insert: (rows) => ({
        select: () => ({
          single: async () => {
            storedRow = { id: 'quantum-proj-1', ...rows[0] };
            return { data: storedRow, error: null };
          },
        }),
      }),
    }),
  };

  const project = await executeAiProjectDraftFlow({
    prompt: 'Create a quantum cryptography simulation project',
    user: mockUser,
    clientOverride: mockClient,
  });

  assert.equal(project.id, 'quantum-proj-1');
  assert.equal(project.title, 'Quantum Key Distribution Simulator');
  assert.equal(project.description, 'Simulation of BB84 protocol over noisy quantum channels.');
  assert.deepEqual(project.tags, ['quantum', 'cryptography', 'simulation']);
  assert.equal(project.visibility, 'private', 'Explicitly saved as Private in database');
  assert.equal(project.user_id, 'student-uuid-42', 'Saved as authenticated user');
});

// 11. End-to-End Flow with User Pre-Save Review / Edits
await test('End-to-End: allows user to edit title and description before saving as private project', async () => {
  let storedRow = null;

  const mockClient = {
    functions: {
      invoke: async () => ({
        data: {
          draft: {
            title: 'Initial AI Title',
            description: 'Initial AI Description',
            tags: ['initial'],
          },
          model: 'gemini-3.6-flash',
        },
        error: null,
      }),
    },
    from: () => ({
      insert: (rows) => ({
        select: () => ({
          single: async () => {
            storedRow = { id: 'edited-proj-1', ...rows[0] };
            return { data: storedRow, error: null };
          },
        }),
      }),
    }),
  };

  const project = await executeAiProjectDraftFlow({
    prompt: 'Generate an initial draft',
    user: mockUser,
    clientOverride: mockClient,
    overrideFields: {
      title: 'User Refined Title: Advanced Bio-Informatics Pipeline',
      description: 'User refined narrative connecting genomics with machine learning.',
      tags: ['bioinformatics', 'genomics', 'ml'],
      visibility: 'public', // User tries to change visibility before publishing
    },
  });

  assert.equal(project.title, 'User Refined Title: Advanced Bio-Informatics Pipeline');
  assert.equal(project.description, 'User refined narrative connecting genomics with machine learning.');
  assert.deepEqual(project.tags, ['bioinformatics', 'genomics', 'ml']);
  assert.equal(project.visibility, 'private', 'Still strictly saved as Private regardless of overrideFields.visibility');
  assert.equal(project.user_id, 'student-uuid-42');
});

console.log('\n======================================================================');
console.log(`  ALL ${passedTests}/${totalTests} TESTS PASSED CLEANLY!`);
console.log('======================================================================\n');
