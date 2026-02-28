-- Run this in Supabase: SQL Editor → New query → paste and run.
-- Creates the table used by the Fact Learner API.

create table if not exists public.facts (
  id uuid primary key default gen_random_uuid(),
  topic text not null,
  fact text not null,
  source_url text,
  created_at timestamptz default now()
);

-- Optional: enable RLS. With service_role key the API bypasses RLS anyway.
-- alter table public.facts enable row level security;
