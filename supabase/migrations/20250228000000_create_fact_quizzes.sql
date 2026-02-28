-- fact_quizzes: one quiz (question + answer) per fact, generated when the fact is created.
-- Separate table keeps facts focused on content and allows a simple "random question" query.

create table if not exists fact_quizzes (
  id uuid primary key default gen_random_uuid(),
  fact_id uuid not null references facts(id) on delete cascade,
  question text not null,
  answer text not null,
  created_at timestamptz default now(),
  unique(fact_id)
);

create index if not exists fact_quizzes_fact_id_idx on fact_quizzes(fact_id);

comment on table fact_quizzes is 'Quiz question and expected answer per fact; populated when fact is created.';
