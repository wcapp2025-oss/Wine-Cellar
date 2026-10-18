// App settings in one place. Change values here instead of hunting through the code.

export const SUPABASE_URL = 'https://xozynrlduiyuqkstyhly.supabase.co';
// This is Supabase's public "anon" key. It is meant to be in the browser;
// your data is protected by the row-level security rules in Supabase.
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvenlucmxkdWl5dXFrc3R5aGx5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5OTY3MjksImV4cCI6MjA4NTU3MjcyOX0.SBvP6E7AZF0c9xFXwQU664n_M1L2xyiA6tafAXRlyRQ';

export const AI_PROXY_URL = 'https://wine-ai-proxy.vercel.app/api/analyze-wine';
export const PASSWORD_RESET_REDIRECT = 'https://wcapp2025-oss.github.io/Wine-Cellar/';

// Feature switches. Set one to false to hide that feature completely,
// e.g. while you're rebuilding it. Each one is a file in js/features/.
export const FEATURES = {
    dashboard: true,
    'add-wine': true,
    'label-scanner': true,
    inventory: true,
    consumed: true,
    locations: true,
    friends: true,
};
