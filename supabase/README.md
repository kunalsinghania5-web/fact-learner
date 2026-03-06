# Supabase & RLS (Row Level Security)

## What is RLS and why did Supabase flag this?

**Row Level Security (RLS)** is a Postgres feature that controls **who can read or write which rows** in a table.

- **Without RLS:** Any client that can talk to your Supabase project (e.g. using the **anon** key in the browser or in a script) can call PostgREST and read/update/delete rows in tables in the `public` schema. So if someone gets your anon key or uses the API directly, they could access or change your `facts` (and `fact_quizzes`) data.
- **With RLS enabled:** Postgres checks **policies** on every query. If there are no policies that allow a role (e.g. `anon` or `authenticated`), that role gets **no rows**—so the table is effectively locked down for direct client access.

**Your app:** All access to `facts` and `fact_quizzes` goes through your **Next.js API routes** using the **service role** key (`SUPABASE_API_SECRET_KEY`). The service role **bypasses RLS**, so your server can still read and write everything. Enabling RLS only restricts **other** clients (anon/authenticated); it does not restrict your backend.

**In short:** Enabling RLS closes the hole where the table was “public” to PostgREST without any row-level rules. Your app keeps working because it uses the service role; only direct use of the anon (or authenticated) key would be blocked from accessing these tables.

---

## How to apply the fix

1. Open the **Supabase Dashboard** → your project.
2. Go to **SQL Editor**.
3. Copy the contents of `supabase/migrations/20250304000000_enable_rls.sql` and run it.

Alternatively, if you use the Supabase CLI and link this project:

```bash
supabase db push
```

---

## Verify

- In the dashboard: **Table Editor** → select `public.facts` → check that RLS is **Enabled** (and similarly for `public.fact_quizzes`).
- The “RLS Disabled in Public” security warning for `public.facts` (and any similar for `fact_quizzes`) should disappear.
- Use your app as usual (generate facts, view facts, take quizzes); everything should work the same, since the API routes use the service role.
