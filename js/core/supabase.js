import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config.js';

// window.supabase comes from the <script> tag in index.html.
export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
