// Talks to the AI advice endpoint on the Vercel proxy (see proxy/api/wine-advice.js).
// Sends your sign-in token so only signed-in users of this app can use your AI credit.

import { supabase } from './supabase.js';
import { AI_ADVICE_URL } from '../config.js';

export async function askAI(task, payload) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Please sign in again');

    let response;
    try {
        response = await fetch(AI_ADVICE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ task, ...payload }),
        });
    } catch {
        throw new Error('AI service is not reachable. It may not be set up yet.');
    }
    if (response.status === 404) throw new Error('AI advice is not set up on the server yet.');
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `AI error ${response.status}`);
    return data;
}

// A short description of a wine for the AI (no photos, nothing personal).
export function wineForAI(wine, extra = {}) {
    return {
        id: wine.id,
        name: wine.name,
        vintage: wine.vintage || 'NV',
        type: wine.type || '',
        region: [wine.sub_region, wine.region, wine.country].filter(Boolean).join(', '),
        bottles: wine.quantity || 1,
        ...extra,
    };
}
