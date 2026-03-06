-- Global weekly topic: one topic for the whole app, shared by all users and devices.
-- No user_id; reset after 7 days (enforced in app). Access via service role in API only.

CREATE TABLE IF NOT EXISTS public.global_weekly_topic (
  id text PRIMARY KEY DEFAULT 'default',
  topic text NOT NULL,
  set_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.global_weekly_topic IS 'Single row (id=default): current weekly topic for the app; shared by all users/devices.';
