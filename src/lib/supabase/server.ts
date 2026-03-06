import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server Supabase client that reads/writes the auth session from cookies.
 * Use in Route Handlers (e.g. auth callback) and Server Components when you
 * need the current user. Uses the anon key; RLS applies. For admin operations
 * (bypass RLS), use getSupabase() from @/lib/supabase instead.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // setAll can be called from a Server Component where cookies are read-only.
          // Middleware will refresh the session on the next request.
        }
      },
    },
  });
}
