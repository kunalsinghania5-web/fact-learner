import { createClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client using the API secret key. Use this in API routes
 * or server components. Never expose the secret key to the browser.
 */
function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_API_SECRET_KEY;
  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_API_SECRET_KEY");
  }
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export { getSupabase };
