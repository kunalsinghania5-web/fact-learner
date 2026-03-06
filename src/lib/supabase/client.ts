import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client for Client Components. Uses the public anon key so
 * it's safe to expose. Use this for signInWithOAuth, signOut, and reading
 * session in the browser. Never use the service role key here.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  return createBrowserClient(url, anonKey);
}
