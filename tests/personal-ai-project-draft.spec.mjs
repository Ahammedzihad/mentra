/**
 * Mentra Phase 6 Part A, Personal AI Groq Verification Suite
 *
 * Exercises the production Personal AI Edge Function handler switched to Groq:
 * 1. Preserves existing chat behavior and { reply, model } contract when mode is omitted or 'chat'
 * 2. Returns structured draft shape { draft: { title, description, tags }, model } in 'project_draft' mode
 * 3. Enforces Phase 4 tag normalization (lowercase, trim, max 24 chars, /^[a-z0-9 -]+$/, deduplication, max 6)
 * 4. Rejects invalid tags and handles empty tag sets
 * 5. Rejects unsupported modes with 400 BAD_REQUEST
 * 6. Validates project prompt length and required content
 * 7. Returns clear 502 errors on missing/malformed model output without fabricating fallback data
 * 8. Preserves authentication, durable rate limiting, and mentor verification boundaries
 * 9. Honest error reporting: reports upstream Groq failures as errors without canned chat fallbacks
 * 10. Validates Groq OpenAI-compatible request construction, headers, payloads, and response contracts
 */

import { register } from 'node:module';

// Register hook to resolve npm: specifiers to local node_modules
register(
  'data:text/javascript,' +
    encodeURIComponent(`
  export function resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('npm:')) {
      const pkg = specifier.replace(/^npm:/, '').replace(/@[0-9^~].*$/, '');
      return nextResolve(pkg, context);
    }
    return nextResolve(specifier, context);
  }
`),
  import.meta.url
);

// Polyfill Deno environment for test runtime
const mockEnvVars = {
  GROQ_API_KEY: 'mock-groq-key',
  GEMINI_API_KEY: 'mock-gemini-key',
  SUPABASE_URL: 'https://mock-supabase.mentra.internal',
  SUPABASE_ANON_KEY: 'mock-anon-key',
};

globalThis.Deno = {
  env: {
    get: (key) => mockEnvVars[key] ?? process.env[key],
  },
  serve: (handler) => {
    globalThis.__edge_handler = handler;
  },
};

// Import production handler and helpers
const { handleRequest, normalizeProjectTags, GROQ_MODEL } = await import(
  '../supabase/functions/personal-ai/index.ts'
);

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✅ PASS: ${message}`);
}

async function test(name, fn) {
  totalTests++;
  console.log(`\n[TEST ${totalTests}] ${name}`);
  try {
    await fn();
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${err.message}`);
    throw err;
  }
}

// Mock HTTP Fetch Boundary
let groqResponseMock = null;
let lastGroqRequest = null;
let rateLimitAllowed = true;
let userRole = 'student';
let isVerified = true;

const originalFetch = globalThis.fetch;

function setupMockFetch() {
  globalThis.fetch = async (url, options = {}) => {
    const urlStr = String(url);

    // Mock Groq API
    if (urlStr.includes('api.groq.com')) {
      let parsedBody = null;
      try {
        parsedBody = typeof options?.body === 'string' ? JSON.parse(options.body) : options?.body;
      } catch {}
      lastGroqRequest = {
        url: urlStr,
        method: options?.method,
        headers: options?.headers || {},
        body: parsedBody,
      };
      if (typeof groqResponseMock === 'function') {
        return groqResponseMock(url, options);
      }
      return new Response(JSON.stringify(groqResponseMock), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Mock Supabase Auth: getUser
    if (urlStr.includes('/auth/v1/user')) {
      const authHeader = options.headers?.Authorization || '';
      if (!authHeader.includes('valid-token')) {
        return new Response(JSON.stringify({ message: 'Invalid token' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(
        JSON.stringify({
          id: 'usr-12345',
          email: 'scholar@mentra.edu',
          role: 'authenticated',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Mock Supabase RPC: check_ai_rate_limit
    if (urlStr.includes('/rpc/check_ai_rate_limit')) {
      if (!rateLimitAllowed) {
        return new Response(
          JSON.stringify({ allowed: false, retry_after: 45 }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ allowed: true, retry_after: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Mock Supabase REST: profiles
    if (urlStr.includes('/rest/v1/profiles')) {
      return new Response(
        JSON.stringify({
          id: 'usr-12345',
          full_name: 'Alex Rivera',
          department: 'Computer Science',
          role: userRole,
          is_verified: isVerified,
          bio: 'Collegiate researcher',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Mock Supabase REST: projects & journey & mentorships
    if (
      urlStr.includes('/rest/v1/projects') ||
      urlStr.includes('/rest/v1/journey') ||
      urlStr.includes('/rest/v1/mentorships')
    ) {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fallback to real fetch if other
    return originalFetch(url, options);
  };
}

function restoreFetch() {
  globalThis.fetch = originalFetch;
}

function createRequest(body, token = 'valid-token') {
  return new Request('https://edge.mentra.internal/personal-ai', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------
// Test Execution
// ---------------------------------------------------------
console.log('======================================================================');
console.log('  MENTRA PERSONAL AI GROQ MIGRATION — VERIFICATION SUITE');
console.log('======================================================================');

setupMockFetch();

try {
  // Test 1: Phase 4 tag normalization unit rules
  await test('Phase 4 tag normalization helper satisfies all constraints', () => {
    // 1. Lowercase & trimming
    assert(
      JSON.stringify(normalizeProjectTags(['  BLOCKCHAIN  ', 'AI Research'])) ===
        JSON.stringify(['blockchain', 'ai research']),
      'Trims whitespace and converts to lowercase'
    );

    // 2. Reject length > 24
    const longTag = 'a'.repeat(25);
    const valid24 = 'b'.repeat(24);
    assert(
      JSON.stringify(normalizeProjectTags([longTag, valid24])) ===
        JSON.stringify([valid24]),
      'Rejects tags exceeding 24 characters'
    );

    // 3. Allowed characters regex: /^[a-z0-9 -]+$/
    assert(
      JSON.stringify(
        normalizeProjectTags(['react-19', 'next js', 'web3', 'tag#hash', 'tag@at', 'tag_under'])
      ) === JSON.stringify(['react-19', 'next js', 'web3']),
      'Rejects tags with punctuation, hashtags, or underscores'
    );

    // 4. Deduplication
    assert(
      JSON.stringify(normalizeProjectTags(['python', 'PYTHON', '  Python  ', 'rust'])) ===
        JSON.stringify(['python', 'rust']),
      'Deduplicates case-insensitively and whitespace-normalized'
    );

    // 5. Capped at 6 tags
    const tenTags = ['t1', 't2', 't3', 't4', 't5', 't6', 't7', 't8', 't9', 't10'];
    const result = normalizeProjectTags(tenTags);
    assert(result.length === 6, 'Caps tag count at exactly 6');
    assert(JSON.stringify(result) === JSON.stringify(['t1', 't2', 't3', 't4', 't5', 't6']), 'Preserves first 6 valid tags');

    // 6. Non-array or empty handling
    assert(JSON.stringify(normalizeProjectTags(null)) === '[]', 'Returns empty array for null');
    assert(JSON.stringify(normalizeProjectTags('not-an-array')) === '[]', 'Returns empty array for string');
    assert(JSON.stringify(normalizeProjectTags(['', '   '])) === '[]', 'Ignores empty or blank tags');
  });

  // Test 2: Mode discrimination - Unsupported modes
  await test('Rejects unsupported modes with 400 BAD_REQUEST', async () => {
    const res = await handleRequest(createRequest({ mode: 'unsupported_mode', message: 'Hello' }));
    assert(res.status === 400, 'Returns HTTP 400');
    const json = await res.json();
    assert(json.error === 'BAD_REQUEST', 'Error code is BAD_REQUEST');
    assert(json.message.includes('Unsupported request mode'), 'Includes clear message citing mode');

    // Non-string mode
    const numModeRes = await handleRequest(createRequest({ mode: 999, message: 'Hello' }));
    assert(numModeRes.status === 400, 'Non-string mode returns HTTP 400');
    const numJson = await numModeRes.json();
    assert(numJson.error === 'BAD_REQUEST', 'Non-string mode error code is BAD_REQUEST');
  });

  // Test 3: Backward compatibility - Default conversational chat when mode is omitted
  await test('Preserves default conversational chat contract when mode is omitted', async () => {
    groqResponseMock = {
      choices: [
        {
          message: {
            role: 'assistant',
            content: 'Here is structured advice on your academic research roadmap.',
          },
        },
      ],
    };

    const res = await handleRequest(createRequest({ message: 'How do I decompose my sprint deliverables?' }));
    assert(res.status === 200, 'Returns HTTP 200');
    const json = await res.json();
    assert(json.reply === 'Here is structured advice on your academic research roadmap.', 'Returns reply string');
    assert(json.model === GROQ_MODEL, 'Identifies model as GROQ_MODEL');
    assert(json.draft === undefined, 'Does NOT include draft property in chat response');
  });

  // Test 4: Backward compatibility - Explicit mode: 'chat'
  await test('Preserves conversational chat contract when mode is explicitly "chat"', async () => {
    groqResponseMock = {
      choices: [
        {
          message: {
            role: 'assistant',
            content: 'Faculty guidance on project milestones.',
          },
        },
      ],
    };

    const res = await handleRequest(
      createRequest({ mode: 'chat', message: 'Can you advise on my milestone checklist?' })
    );
    assert(res.status === 200, 'Returns HTTP 200');
    const json = await res.json();
    assert(json.reply === 'Faculty guidance on project milestones.', 'Returns reply string');
    assert(json.model === GROQ_MODEL, 'Returns model property');
    assert(json.draft === undefined, 'No draft property in chat response');
  });

  // Test 5: Valid project-draft response shape and tag normalization
  await test('Generates structured project draft with valid title, description, and normalized tags', async () => {
    groqResponseMock = {
      choices: [
        {
          message: {
            role: 'assistant',
            content: JSON.stringify({
              title: 'Decentralized Academic Identity System',
              description:
                'A blockchain-powered verification protocol enabling collegiate scholars to cryptographically attest credentials.',
              tags: ['Blockchain', 'Identity', 'Web3-Auth', 'tag#invalid', '  SMART CONTRACTS  '],
            }),
          },
        },
      ],
    };

    const res = await handleRequest(
      createRequest({
        mode: 'project_draft',
        prompt: 'Build a decentralized identity protocol for college credentials',
      })
    );

    assert(res.status === 200, 'Returns HTTP 200');
    const json = await res.json();
    assert(Boolean(json.draft), 'Contains root draft object');
    assert(json.draft.title === 'Decentralized Academic Identity System', 'Preserves clean title');
    assert(
      json.draft.description ===
        'A blockchain-powered verification protocol enabling collegiate scholars to cryptographically attest credentials.',
      'Preserves clean description'
    );
    // Tags verification:
    // 'Blockchain' -> 'blockchain'
    // 'Identity' -> 'identity'
    // 'Web3-Auth' -> 'web3-auth'
    // 'tag#invalid' -> ignored (# not allowed)
    // '  SMART CONTRACTS  ' -> 'smart contracts'
    assert(
      JSON.stringify(json.draft.tags) ===
        JSON.stringify(['blockchain', 'identity', 'web3-auth', 'smart contracts']),
      'Sanitizes and normalizes draft tags adhering strictly to Phase 4 rules'
    );
    assert(json.draft.visibility === undefined, 'Strict boundary: draft does NOT contain visibility');
    assert(json.model === GROQ_MODEL, 'Identifies model as GROQ_MODEL');
  });

  // Test 6: Accepts prompt in body.message if prompt property is absent in project_draft mode
  await test('Accepts project prompt via message property when prompt property is omitted', async () => {
    groqResponseMock = {
      choices: [
        {
          message: {
            role: 'assistant',
            content: JSON.stringify({
              title: 'AI Lab Scheduler',
              description: 'Automated GPU cluster allocation for university research labs.',
              tags: ['ai', 'gpu', 'scheduling'],
            }),
          },
        },
      ],
    };

    const res = await handleRequest(
      createRequest({
        mode: 'project_draft',
        message: 'Build a GPU cluster scheduling system for research labs',
      })
    );

    assert(res.status === 200, 'Returns HTTP 200');
    const json = await res.json();
    assert(json.draft.title === 'AI Lab Scheduler', 'Successfully parsed prompt from message property');
  });

  // Test 7: Project prompt input validation
  await test('Validates prompt input requirements in project_draft mode', async () => {
    // Missing prompt
    const missingRes = await handleRequest(createRequest({ mode: 'project_draft' }));
    assert(missingRes.status === 400, 'Missing prompt returns HTTP 400');
    const missingJson = await missingRes.json();
    assert(missingJson.error === 'BAD_REQUEST', 'Missing prompt error code is BAD_REQUEST');

    // Empty prompt
    const emptyRes = await handleRequest(createRequest({ mode: 'project_draft', prompt: '   ' }));
    assert(emptyRes.status === 400, 'Empty prompt returns HTTP 400');

    // Exceeds 2000 chars
    const longPromptRes = await handleRequest(
      createRequest({ mode: 'project_draft', prompt: 'x'.repeat(2001) })
    );
    assert(longPromptRes.status === 400, 'Prompt > 2000 chars returns HTTP 400');
    const longJson = await longPromptRes.json();
    assert(longJson.error === 'MESSAGE_TOO_LONG', 'Error code is MESSAGE_TOO_LONG');
  });

  // Test 8: Strips markdown code fences when model outputs wrapped JSON
  await test('Strips markdown code fences when model outputs wrapped JSON', async () => {
    groqResponseMock = {
      choices: [
        {
          message: {
            role: 'assistant',
            content: '```json\n{\n  "title": "Robotics Vision Navigator",\n  "description": "SLAM navigation package.",\n  "tags": ["robotics", "slam"]\n}\n```',
          },
        },
      ],
    };

    const res = await handleRequest(
      createRequest({ mode: 'project_draft', prompt: 'Robotics navigation system' })
    );
    assert(res.status === 200, 'Returns HTTP 200');
    const json = await res.json();
    assert(json.draft.title === 'Robotics Vision Navigator', 'Strips code fence and extracts title');
    assert(json.draft.description === 'SLAM navigation package.', 'Strips code fence and extracts description');
  });

  // Test 9: Malformed and missing AI output handling - No fabricated data
  await test('Returns 502 error without fabricating fallback content on malformed output or provider error', async () => {
    // 9a. Non-JSON string from model
    groqResponseMock = {
      choices: [{ message: { role: 'assistant', content: 'I am not returning JSON today!' } }],
    };
    const malformedRes = await handleRequest(
      createRequest({ mode: 'project_draft', prompt: 'Any prompt' })
    );
    assert(malformedRes.status === 502, 'Returns HTTP 502 on non-JSON response');
    const malformedJson = await malformedRes.json();
    assert(malformedJson.error === 'MALFORMED_AI_OUTPUT', 'Returns MALFORMED_AI_OUTPUT error code');
    assert(!malformedJson.draft, 'Does NOT fabricate fallback draft');

    // 9b. Missing title in model JSON
    groqResponseMock = {
      choices: [
        {
          message: {
            role: 'assistant',
            content: JSON.stringify({ description: 'A project with no title', tags: ['ai'] }),
          },
        },
      ],
    };
    const missingTitleRes = await handleRequest(
      createRequest({ mode: 'project_draft', prompt: 'Any prompt' })
    );
    assert(missingTitleRes.status === 502, 'Returns HTTP 502 when title is missing');
    const missingTitleJson = await missingTitleRes.json();
    assert(missingTitleJson.error === 'INVALID_DRAFT_CONTENT', 'Error code is INVALID_DRAFT_CONTENT');
    assert(!missingTitleJson.draft, 'Does NOT fabricate fallback title');

    // 9c. Missing description in model JSON
    groqResponseMock = {
      choices: [
        {
          message: {
            role: 'assistant',
            content: JSON.stringify({ title: 'A Project Title', tags: ['ai'] }),
          },
        },
      ],
    };
    const missingDescRes = await handleRequest(
      createRequest({ mode: 'project_draft', prompt: 'Any prompt' })
    );
    assert(missingDescRes.status === 502, 'Returns HTTP 502 when description is missing');

    // 9d. Missing tags array in model JSON
    groqResponseMock = {
      choices: [
        {
          message: {
            role: 'assistant',
            content: JSON.stringify({ title: 'A Title', description: 'A Desc' }),
          },
        },
      ],
    };
    const missingTagsRes = await handleRequest(
      createRequest({ mode: 'project_draft', prompt: 'Any prompt' })
    );
    assert(missingTagsRes.status === 502, 'Returns HTTP 502 when tags array is missing');

    // 9e. Empty response from model
    groqResponseMock = { choices: [{ message: { role: 'assistant', content: '   ' } }] };
    const emptyRes = await handleRequest(
      createRequest({ mode: 'project_draft', prompt: 'Any prompt' })
    );
    assert(emptyRes.status === 502, 'Returns HTTP 502 on empty candidate text');
    const emptyJson = await emptyRes.json();
    assert(emptyJson.error === 'EMPTY_RESPONSE', 'Error code is EMPTY_RESPONSE');

    // 9f. Upstream Groq API error
    groqResponseMock = () =>
      new Response(JSON.stringify({ error: { message: 'Rate limit reached for model' } }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      });
    const upstreamErrRes = await handleRequest(
      createRequest({ mode: 'project_draft', prompt: 'Any prompt' })
    );
    assert(upstreamErrRes.status === 502, 'Upstream Groq error returns HTTP 502');
    const upstreamJson = await upstreamErrRes.json();
    assert(upstreamJson.error === 'GROQ_API_ERROR', 'Error code is GROQ_API_ERROR');
    assert(!upstreamJson.draft, 'Never fabricates fallback draft on upstream error');
  });

  // Test 10: Authentication, Authorization & Rate Limit Enforcement
  await test('Preserves authentication, durable rate limiting, and verification boundaries', async () => {
    // Missing Bearer token
    const unauthReq = new Request('https://edge.mentra.internal/personal-ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'project_draft', prompt: 'Test' }),
    });
    const unauthRes = await handleRequest(unauthReq);
    assert(unauthRes.status === 401, 'Missing token returns HTTP 401');

    // Rate limit exceeded
    rateLimitAllowed = false;
    const rateRes = await handleRequest(
      createRequest({ mode: 'project_draft', prompt: 'Test rate limit' })
    );
    assert(rateRes.status === 429, 'Rate limit exceeded returns HTTP 429');
    const rateJson = await rateRes.json();
    assert(rateJson.error === 'RATE_LIMIT_EXCEEDED', 'Error code is RATE_LIMIT_EXCEEDED');
    assert(rateRes.headers.get('Retry-After') === '45', 'Includes Retry-After header');
    rateLimitAllowed = true;

    // Unverified mentor role
    userRole = 'mentor';
    isVerified = false;
    const mentorRes = await handleRequest(
      createRequest({ mode: 'project_draft', prompt: 'Faculty project' })
    );
    assert(mentorRes.status === 403, 'Unverified mentor returns HTTP 403 FORBIDDEN');
    userRole = 'student';
    isVerified = true;
  });

  // Test 11: CORS Preflight and GET Health Check
  await test('CORS preflight and GET health check respond properly', async () => {
    // OPTIONS
    const optReq = new Request('https://edge.mentra.internal/personal-ai', {
      method: 'OPTIONS',
      headers: { Origin: 'http://localhost:5173' },
    });
    const optRes = await handleRequest(optReq);
    assert(optRes.status === 200, 'OPTIONS returns HTTP 200');
    assert(
      optRes.headers.get('Access-Control-Allow-Origin') === 'http://localhost:5173',
      'Reflects allowed CORS origin'
    );

    // GET
    const getReq = new Request('https://edge.mentra.internal/personal-ai', {
      method: 'GET',
    });
    const getRes = await handleRequest(getReq);
    assert(getRes.status === 200, 'GET health check returns HTTP 200');
    const getJson = await getRes.json();
    assert(getJson.function === 'personal-ai', 'Health check identifies function');
    assert(getJson.configured === true, 'Identifies as configured');
    assert(getJson.model === GROQ_MODEL, 'Health check identifies model as GROQ_MODEL');
  });

  // Test 12: Production request construction, headers, payloads, and response contracts for chat and draft modes
  await test('Verifies production Groq request construction, headers, and response shapes for chat and draft modes', async () => {
    assert(GROQ_MODEL === 'openai/gpt-oss-120b', 'Exported GROQ_MODEL constant is openai/gpt-oss-120b');

    // 12a. Conversational Chat Mode
    lastGroqRequest = null;
    groqResponseMock = {
      choices: [
        {
          message: {
            role: 'assistant',
            content: 'Grounded mentorship guidance.',
          },
        },
      ],
    };

    const chatRes = await handleRequest(
      createRequest({
        mode: 'chat',
        message: 'How do I organize sprint retrospective milestones?',
        history: [
          { role: 'user', content: 'What is agile development?' },
          { role: 'assistant', content: 'Agile development is an iterative approach.' },
        ],
      })
    );

    assert(chatRes.status === 200, 'Chat request returns HTTP 200');
    const chatJson = await chatRes.json();

    // Verify chat response contract
    assert(
      JSON.stringify(Object.keys(chatJson).sort()) === JSON.stringify(['model', 'reply']),
      'Chat response contract is strictly { reply, model }'
    );
    assert(chatJson.model === GROQ_MODEL, 'Chat response identifies GROQ_MODEL (openai/gpt-oss-120b)');
    assert(chatJson.reply === 'Grounded mentorship guidance.', 'Chat reply matches candidate text');

    // Verify chat production request construction sent to Groq
    assert(
      lastGroqRequest?.url === 'https://api.groq.com/openai/v1/chat/completions',
      'Chat calls Groq OpenAI-compatible chat/completions endpoint'
    );
    assert(lastGroqRequest?.method === 'POST', 'Chat HTTP method is POST');
    assert(
      lastGroqRequest?.headers?.['Content-Type'] === 'application/json',
      'Chat Content-Type is application/json'
    );
    assert(
      lastGroqRequest?.headers?.['Authorization'] === 'Bearer mock-groq-key',
      'Chat passes Authorization: Bearer mock-groq-key header'
    );
    assert(
      lastGroqRequest?.body?.model === GROQ_MODEL,
      'Chat requests configured GROQ_MODEL'
    );
    assert(
      Array.isArray(lastGroqRequest?.body?.messages) && lastGroqRequest.body.messages.length === 4,
      'Chat messages includes 1 system instruction, 2 history turns, and 1 current user message'
    );
    assert(
      lastGroqRequest?.body?.messages[0]?.role === 'system' &&
        Boolean(lastGroqRequest?.body?.messages[0]?.content),
      'Chat messages starts with system instruction'
    );
    assert(
      lastGroqRequest?.body?.messages[1]?.role === 'user' &&
        lastGroqRequest?.body?.messages[1]?.content === 'What is agile development?',
      'Chat messages preserves first user history turn'
    );
    assert(
      lastGroqRequest?.body?.messages[2]?.role === 'assistant' &&
        lastGroqRequest?.body?.messages[2]?.content === 'Agile development is an iterative approach.',
      'Chat messages preserves assistant history turn'
    );
    assert(
      lastGroqRequest?.body?.messages[3]?.role === 'user' &&
        lastGroqRequest?.body?.messages[3]?.content === 'How do I organize sprint retrospective milestones?',
      'Chat messages ends with current user prompt'
    );
    assert(
      lastGroqRequest?.body?.temperature === 0.7,
      'Chat temperature is 0.7'
    );
    assert(
      lastGroqRequest?.body?.max_completion_tokens === 1024,
      'Chat max_completion_tokens is 1024'
    );

    // 12b. Structured Project-Draft Mode
    lastGroqRequest = null;
    groqResponseMock = {
      choices: [
        {
          message: {
            role: 'assistant',
            content: JSON.stringify({
              title: 'Embedded Vision Verification',
              description: 'A formal verification pipeline for lightweight vision models on edge microcontrollers.',
              tags: ['Embedded-Vision', 'Formal-Methods', 'Microcontrollers'],
            }),
          },
        },
      ],
    };

    const draftRes = await handleRequest(
      createRequest({
        mode: 'project_draft',
        prompt: 'Build a formal verification pipeline for vision models on microcontrollers',
      })
    );

    assert(draftRes.status === 200, 'Project draft request returns HTTP 200');
    const draftJson = await draftRes.json();

    // Verify project draft response contract
    assert(
      JSON.stringify(Object.keys(draftJson).sort()) === JSON.stringify(['draft', 'model']),
      'Project draft response contract is strictly { draft, model }'
    );
    assert(
      JSON.stringify(Object.keys(draftJson.draft).sort()) === JSON.stringify(['description', 'tags', 'title']),
      'Project draft object strictly contains { title, description, tags }'
    );
    assert(draftJson.model === GROQ_MODEL, 'Project draft identifies GROQ_MODEL (openai/gpt-oss-120b)');
    assert(draftJson.draft.title === 'Embedded Vision Verification', 'Draft title matches');
    assert(
      draftJson.draft.description ===
        'A formal verification pipeline for lightweight vision models on edge microcontrollers.',
      'Draft description matches'
    );
    assert(
      JSON.stringify(draftJson.draft.tags) ===
        JSON.stringify(['embedded-vision', 'formal-methods', 'microcontrollers']),
      'Draft tags are correctly sanitized and normalized'
    );

    // Verify project-draft production request construction sent to Groq
    assert(
      lastGroqRequest?.url === 'https://api.groq.com/openai/v1/chat/completions',
      'Draft calls Groq OpenAI-compatible chat/completions endpoint'
    );
    assert(lastGroqRequest?.method === 'POST', 'Draft HTTP method is POST');
    assert(
      lastGroqRequest?.headers?.['Content-Type'] === 'application/json',
      'Draft Content-Type is application/json'
    );
    assert(
      lastGroqRequest?.headers?.['Authorization'] === 'Bearer mock-groq-key',
      'Draft passes Authorization: Bearer mock-groq-key header'
    );
    assert(
      lastGroqRequest?.body?.model === GROQ_MODEL,
      'Draft requests configured GROQ_MODEL'
    );
    assert(
      lastGroqRequest?.body?.messages?.[0]?.role === 'system' &&
        Boolean(lastGroqRequest?.body?.messages?.[0]?.content),
      'Draft includes structured draft systemInstruction in messages'
    );
    assert(
      lastGroqRequest?.body?.messages?.[1]?.role === 'user' &&
        lastGroqRequest?.body?.messages?.[1]?.content ===
          'Build a formal verification pipeline for vision models on microcontrollers',
      'Draft messages contains user prompt'
    );
    assert(
      lastGroqRequest?.body?.response_format?.type === 'json_object',
      'Draft enforces response_format: { type: "json_object" }'
    );
    assert(
      lastGroqRequest?.body?.temperature === 0.7,
      'Draft temperature is 0.7'
    );
    assert(
      lastGroqRequest?.body?.max_completion_tokens === 1024,
      'Draft max_completion_tokens is 1024'
    );
  });

  // Test 13: Removal of canned chat fallback on upstream provider errors
  await test('Chat mode reports upstream provider failures honestly without canned fallback responses', async () => {
    // 13a. Provider rate limit error (429)
    groqResponseMock = () =>
      new Response(
        JSON.stringify({
          error: {
            message: 'Rate limit reached for model `openai/gpt-oss-120b` in organization `org_xxx` on tokens per minute (TPM).',
            type: 'tokens',
            code: 'rate_limit_exceeded',
          },
        }),
        {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        }
      );

    const rateErrRes = await handleRequest(
      createRequest({ mode: 'chat', message: 'Can you critique my system design?' })
    );

    assert(rateErrRes.status === 502, 'Chat returns HTTP 502 when Groq encounters rate limit / quota error');
    const rateErrJson = await rateErrRes.json();
    assert(rateErrJson.error === 'GROQ_API_ERROR', 'Returns GROQ_API_ERROR error code');
    assert(
      rateErrJson.message.includes('Rate limit reached for model'),
      'Propagates upstream Groq error message'
    );
    assert(rateErrJson.reply === undefined, 'Does NOT return canned or fabricated AI reply');

    // 13b. Provider internal server error (500)
    groqResponseMock = () =>
      new Response(
        JSON.stringify({
          error: {
            message: 'Internal server error processing request.',
            type: 'server_error',
          },
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );

    const serverErrRes = await handleRequest(
      createRequest({ mode: 'chat', message: 'Help me plan next week tasks.' })
    );

    assert(serverErrRes.status === 502, 'Chat returns HTTP 502 on Groq 500 error');
    const serverErrJson = await serverErrRes.json();
    assert(serverErrJson.error === 'GROQ_API_ERROR', 'Error code is GROQ_API_ERROR');
    assert(serverErrJson.reply === undefined, 'No fake reply is returned on provider failure');
  });

} finally {
  restoreFetch();
}

console.log('\n======================================================================');
console.log(`  ALL ${passedTests}/${totalTests} TESTS PASSED CLEANLY!`);
console.log('======================================================================\n');
