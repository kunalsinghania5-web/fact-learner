-- Weekly topic per user: one topic for the week, reset after 7 days (enforced in app).
-- RLS ensures each user can only read/write their own row.

CREATE TABLE IF NOT EXISTS public.weekly_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic text NOT NULL,
  set_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE public.weekly_topics ENABLE ROW LEVEL SECURITY;

-- Users can only read their own row
CREATE POLICY "Users can read own weekly topic"
  ON public.weekly_topics
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own row
CREATE POLICY "Users can insert own weekly topic"
  ON public.weekly_topics
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own row (for upsert)
CREATE POLICY "Users can update own weekly topic"
  ON public.weekly_topics
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own row (change topic)
CREATE POLICY "Users can delete own weekly topic"
  ON public.weekly_topics
  FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.weekly_topics IS 'Stores the current weekly topic per user; app treats as expired after 7 days from set_at.';
