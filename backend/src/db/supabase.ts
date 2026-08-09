import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseSecretKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SECRET_KEY env vars");
}

if (!supabaseAnonKey) {
    throw new Error("Missing SUPABASE_ANON_KEY env var");
}

// Storage uploads get random UUID filenames, so a URL's content can never
// change — browsers may cache it forever. Passed as `cacheControl` (seconds,
// one year) on every upload; without it objects are stored with `no-cache`
// and every <img> remount re-validates against storage.
export const IMMUTABLE_CACHE = "31536000";

// Secret key: server-side only, bypasses RLS. Never expose to frontend.
export const supabase = createClient(supabaseUrl, supabaseSecretKey, {
    auth: { persistSession: false },
});

// Anon (publishable) key: used only to verify the access tokens the browser
// sends, via supabaseAuth.auth.getUser(token). Deliberately NOT the secret
// key — token verification needs no elevated privilege, and this client must
// never be reachable from a code path that reads tables.
export const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
});