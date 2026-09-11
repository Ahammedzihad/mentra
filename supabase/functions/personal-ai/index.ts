import { createClient } from 'npm:@supabase/supabase-js@2';

const ALLOWED_ORIGINS = [
  'https://mentra-eta.vercel.app',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
];

export function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') || '';
  const isAllowed =
    ALLOWED_ORIGINS.includes(origin) ||
    /^https:\/\/mentra(-[a-z0-9-]+)?\.vercel\.app$/.test(origin) ||
    /^http:\/\/localhost:\d+$/.test(origin);

  const allowOrigin = isAllowed ? origin : 'https://mentra-eta.vercel.app';

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight request immediately
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  // Health / configuration check (GET)
  if (req.method === 'GET') {
    const isConfigured = Boolean(Deno.env.get('GEMINI_API_KEY'));
    return new Response(
      JSON.stringify({
        function: 'personal-ai',
        status: 'active',
        configured: isConfigured,
        model: 'gemini-3.6-flash',
        message: isConfigured
          ? 'Personal AI Edge Function is active and configured.'
          : 'GEMINI_API_KEY secret is not configured in Supabase Edge Function environment.',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'METHOD_NOT_ALLOWED', message: 'Only POST requests are supported.' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // 1. Verify Authorization Header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({
          error: 'UNAUTHORIZED',
          message: 'An active student authentication token is required to consult the Mentra Advisor.',
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) {
      return new Response(
        JSON.stringify({ error: 'UNAUTHORIZED', message: 'Bearer token cannot be empty.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Initialize Supabase Client with caller's token to enforce existing RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(
        JSON.stringify({ error: 'SUPABASE_CONFIG_ERROR', message: 'Supabase URL or Anon key missing in environment.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    // 3. Authenticate User session securely from Supabase Auth
    const { data: authData, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !authData?.user) {
      return new Response(
        JSON.stringify({
          error: 'INVALID_TOKEN',
          message: 'Student session token is invalid or has expired. Please sign in again.',
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const verifiedUserId = authData.user.id;

    // 4. Verify that GEMINI_API_KEY secret is configured
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey || geminiApiKey.trim() === '') {
      return new Response(
        JSON.stringify({
          error: 'CONFIG_REQUIRED',
          message: 'GEMINI_API_KEY secret is not configured in Supabase Edge Function environment. Please set it using: supabase secrets set GEMINI_API_KEY=your_key',
          configured: false,
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Parse Request Body (never trust client-supplied user_id)
    const body = await req.json().catch(() => ({}));
    const { message, history = [] } = body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return new Response(
        JSON.stringify({ error: 'BAD_REQUEST', message: 'Inquiry message cannot be empty.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. Fetch strictly this authenticated user's profile, projects, and journey entries
    const [profileRes, projectsRes, journeyRes] = await Promise.all([
      supabaseClient
        .from('profiles')
        .select('full_name, department, role')
        .eq('id', verifiedUserId)
        .maybeSingle(),
      supabaseClient
        .from('projects')
        .select('id, title, description, created_at')
        .eq('user_id', verifiedUserId)
        .order('created_at', { ascending: false }),
      supabaseClient
        .from('journey')
        .select('id, title, description, created_at')
        .eq('user_id', verifiedUserId)
        .order('created_at', { ascending: false }),
    ]);

    const profile = profileRes.data || {};
    const projects = projectsRes.data || [];
    const journey = journeyRes.data || [];

    // 7. Format Controlled Student Context for Gemini
    const projectsSummary = projects.length > 0
      ? projects.map((p, i) => `${i + 1}. "${p.title}": ${p.description || 'No description provided'}`).join('\n')
      : 'None recorded yet in portfolio.';

    const journeySummary = journey.length > 0
      ? journey.map((j, i) => `${i + 1}. [${new Date(j.created_at).toLocaleDateString()}] "${j.title}": ${j.description || 'No notes'}`).join('\n')
      : 'None recorded yet on timeline.';

    const systemInstruction = `You are Mentra Advisor, a trusted personal academic and project mentor for collegiate students.
You communicate in a warm, thoughtful, intellectual, encouraging, and human tone — avoiding generic tech jargon, hollow cheerleading, hyperbole, or corporate buzzwords.
Your role is to help this student reflect on their creative and technical journey, connect ideas between their projects and milestones, suggest meaningful next steps, and refine their project narratives.

AUTHENTIC STUDENT CONTEXT:
- Student Name: ${profile.full_name || authData.user.email || 'Scholar'}
- Department / Major: ${profile.department || 'Not specified'}
- Academic Role: ${profile.role || 'student'}

STUDENT'S RECORDED PROJECTS:
${projectsSummary}

STUDENT'S RECORDED JOURNEY MILESTONES:
${journeySummary}

GUIDANCE PRINCIPLES:
1. Ground your responses specifically in their portfolio projects and journey milestones listed above when relevant.
2. If they ask what they built or for a summary, synthesize their real projects and milestones concisely with an encouraging, scholarly perspective.
3. Suggest practical, incremental next steps that align with their department and current portfolio.
4. Keep the formatting clean, elegant, and readable using markdown (bullet points, clear paragraphs).
5. Never hallucinate fake projects that aren't in their context; if they haven't added any yet, warmly invite them to start a new project or log their first milestone.`;

    // 8. Assemble contents with conversation history
    const contents = [];
    if (Array.isArray(history)) {
      for (const turn of history.slice(-8)) {
        if (turn.role === 'user' && typeof turn.content === 'string') {
          contents.push({ role: 'user', parts: [{ text: turn.content }] });
        } else if (turn.role === 'assistant' && typeof turn.content === 'string') {
          contents.push({ role: 'model', parts: [{ text: turn.content }] });
        }
      }
    }
    contents.push({ role: 'user', parts: [{ text: message.trim() }] });

    // 9. Call Google Gemini API (Gemini 3.6 Flash)
    const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${encodeURIComponent(geminiApiKey)}`;

    const geminiPayload = {
      systemInstruction: {
        parts: [{ text: systemInstruction }],
      },
      contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
      },
    };

    const geminiResponse = await fetch(geminiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiPayload),
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      let errorMessage = `Gemini API responded with HTTP status ${geminiResponse.status}`;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error?.message) {
          errorMessage = errorJson.error.message;
        }
      } catch {
        // use fallback message
      }

      console.error('Gemini API Error:', errorMessage);
      return new Response(
        JSON.stringify({
          error: 'GEMINI_API_ERROR',
          message: `Gemini AI service error: ${errorMessage}`,
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const geminiResult = await geminiResponse.json();
    const candidate = geminiResult.candidates?.[0];
    const replyText = candidate?.content?.parts?.[0]?.text;

    if (!replyText || replyText.trim() === '') {
      return new Response(
        JSON.stringify({
          error: 'EMPTY_RESPONSE',
          message: 'Gemini AI returned an empty response. Please try rephrasing your inquiry.',
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 10. Return only the AI response
    return new Response(
      JSON.stringify({
        reply: replyText.trim(),
        model: 'gemini-3.6-flash',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Edge Function Unexpected Error:', err);
    return new Response(
      JSON.stringify({
        error: 'INTERNAL_SERVER_ERROR',
        message: err.message || 'An unexpected error occurred in the personal-ai Edge Function.',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
