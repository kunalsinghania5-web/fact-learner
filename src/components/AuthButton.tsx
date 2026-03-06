"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

/**
 * Renders "Sign in with Google" or the current user's email + Sign out.
 * Uses the browser Supabase client so OAuth redirect and signOut run in the client.
 */
export default function AuthButton() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  async function handleSignIn() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  if (loading) {
    return (
      <span className="text-sm text-zinc-500 dark:text-zinc-400">Loading…</span>
    );
  }

  if (user) {
    const email = user.email ?? "Signed in";
    return (
      <div className="flex items-center gap-3">
        <span
          className="max-w-[180px] truncate text-sm text-zinc-600 dark:text-zinc-400"
          title={email}
        >
          {email}
        </span>
        <button
          type="button"
          onClick={handleSignOut}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleSignIn}
      className="flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
    >
      <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
      Sign in with Google
    </button>
  );
}
