// Browser Supabase client — used only for admin authentication (Google
// sign-in). All data still goes through the Express API, so nothing here
// reads or writes tables.
//
// The anon key is a publishable key and is safe to ship to the browser; it
// grants only what RLS allows. The secret key never leaves the backend.

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — see frontend/.env.example",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Refreshing in the background is what retires the old 8-hour expiry
    // cliff: a tab left idle overnight can still save.
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
