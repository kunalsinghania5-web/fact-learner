-- Enable Row Level Security (RLS) on tables exposed via PostgREST.
-- With RLS enabled and no permissive policies for anon/authenticated roles,
-- only the service role (used by your API routes) can read/write data.
-- The service role key bypasses RLS, so your app continues to work as before.

-- Table: public.facts
ALTER TABLE public.facts ENABLE ROW LEVEL SECURITY;

-- Table: public.fact_quizzes (also used by the app; enable RLS for consistency)
ALTER TABLE public.fact_quizzes ENABLE ROW LEVEL SECURITY;

-- No policies are added for anon or authenticated roles.
-- Result: only server-side requests using SUPABASE_API_SECRET_KEY can access these tables.
