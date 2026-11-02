// api/wine-advice.js
// AI advice for the Wine Cellar app:
//   task "pairing": { food, wines: [...] }  → { picks: [{ id, reason }], tip }
//   task "window":  { wine: {...} }         → { from, to, note }
//
// Only signed-in users of the app can call this: the request must carry their Supabase
// sign-in token, which is checked with Supabase before any AI call is made.
// Needs the ANTHROPIC_API_KEY environment variable (already set for analyze-wine).

import Anthropic from '@anthropic-ai/sdk';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://xozynrlduiyuqkstyhly.supabase.co';
// Public "anon" key (the same one the app ships in the browser)
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvenlucmxkdWl5dXFrc3R5aGx5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5OTY3MjksImV4cCI6MjA4NTU3MjcyOX0.SBvP6E7AZF0c9xFXwQU664n_M1L2xyiA6tafAXRlyRQ';

const ALLOWED_ORIGINS = [
  'https://wcapp2025-oss.github.io',
  'http://localhost:8080',
];

const MAX_WINES = 300;
const client = new Anthropic(); // reads ANTHROPIC_API_KEY

const SCHEMAS = {
  pairing: {
    type: 'object',
    properties: {
      picks: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            reason: { type: 'string' },
          },
          required: ['id', 'reason'],
          additionalProperties: false,
        },
      },
      tip: { type: 'string' },
    },
    required: ['picks', 'tip'],
    additionalProperties: false,
  },
  window: {
    type: 'object',
    properties: {
      from: { type: 'integer' },
      to: { type: 'integer' },
      note: { type: 'string' },
    },
    required: ['from', 'to', 'note'],
    additionalProperties: false,
  },
};

const SYSTEM = `You are a friendly, practical sommelier inside a personal wine cellar app.
Answers are read on a phone, so keep every text field short and plain (no markdown).`;

function pairingPrompt(food, wines) {
  return `I'm eating: ${food}

These are the wines I have (JSON). "window" is the estimated drinking window and "readiness" is where the wine is in it today (young, ready, soon = end of window, past, any = no vintage).
${JSON.stringify(wines)}

Pick up to 3 wines FROM THIS LIST that would go best with the food, best first. Prefer wines that are ready or near the end of their window over ones that are too young, unless a young wine is clearly the best match. For each, give its exact "id" and a one-sentence reason that mentions the food.
If nothing suits, return an empty picks list.
"tip": one short sentence of serving advice (temperature, decanting, or what kind of wine to buy if nothing fits).`;
}

function windowPrompt(wine) {
  return `Wine: ${JSON.stringify(wine)}
${wine.estimate ? `A simple rule estimated its drinking window as ${wine.estimate}.` : ''}

Give your best estimate of this wine's ideal drinking window as calendar years ("from" and "to"), based on the producer, appellation, vintage quality and style. If it's non-vintage or you can't tell, base it on typical wines of this kind starting from this year.
"note": one or two short sentences explaining why (e.g. vintage character, when it peaks).`;
}

async function verifyUser(req) {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return null;
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: auth },
  });
  if (!r.ok) return null;
  return r.json();
}

export default async function handler(req, res) {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await verifyUser(req).catch(() => null);
  if (!user) return res.status(401).json({ error: 'Please sign in again' });

  const { task } = req.body || {};
  let prompt;
  if (task === 'pairing') {
    const food = String(req.body.food || '').slice(0, 300).trim();
    const wines = Array.isArray(req.body.wines) ? req.body.wines.slice(0, MAX_WINES) : [];
    if (!food) return res.status(400).json({ error: 'Tell me what you are eating' });
    if (wines.length === 0) return res.status(400).json({ error: 'No wines to choose from' });
    prompt = pairingPrompt(food, wines);
  } else if (task === 'window') {
    if (!req.body.wine || typeof req.body.wine !== 'object') return res.status(400).json({ error: 'No wine given' });
    prompt = windowPrompt(req.body.wine);
  } else {
    return res.status(400).json({ error: 'Unknown task' });
  }

  try {
    const response = await client.beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 4000,
      // If a safety check declines the request, Anthropic retries it on a suitable model
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: {
        effort: 'low', // quick answers on a phone; raise to 'medium' for more careful picks
        format: { type: 'json_schema', schema: SCHEMAS[task] },
      },
      system: SYSTEM,
      messages: [{ role: 'user', content: prompt }],
    });

    if (response.stop_reason === 'refusal') {
      return res.status(422).json({ error: 'The AI could not help with that request.' });
    }
    const text = response.content.find(b => b.type === 'text')?.text;
    if (!text) return res.status(502).json({ error: 'The AI returned no answer. Please try again.' });
    return res.status(200).json(JSON.parse(text));
  } catch (error) {
    console.error('wine-advice error:', error);
    if (error instanceof Anthropic.RateLimitError) {
      return res.status(429).json({ error: 'The AI is busy. Try again in a minute.' });
    }
    if (error instanceof Anthropic.AuthenticationError) {
      return res.status(500).json({ error: 'AI key problem on the server.' });
    }
    if (error instanceof Anthropic.APIError) {
      return res.status(502).json({ error: `AI service error (${error.status}). Please try again.` });
    }
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}
