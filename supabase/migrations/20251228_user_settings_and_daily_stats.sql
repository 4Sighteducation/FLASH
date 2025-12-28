-- User Settings + Daily Stats Aggregates (Pro features)
-- Adds:
-- - public.user_settings: per-user study settings (shuffle + answer timer)
-- - extra metadata columns on public.card_reviews for analytics + XP multipliers
-- - materialized view public.user_daily_study_stats_mv for dashboard
--
-- Notes:
-- - MV must be refreshed to reflect new reviews.
-- - You can refresh manually in SQL: REFRESH MATERIALIZED VIEW public.user_daily_study_stats_mv;

-- 1) Per-user study settings
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  shuffle_mcq_enabled boolean NOT NULL DEFAULT false,
  answer_timer_seconds integer NOT NULL DEFAULT 0, -- 0=off, 30/15/5 etc
  grace_seconds integer NOT NULL DEFAULT 3,
  -- Optional v2 idea: "time bank" (extra grace earned by fast correct answers)
  time_bank_seconds integer NOT NULL DEFAULT 0, -- 0..7 (so grace 3..10)
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Keep updated_at current
CREATE OR REPLACE FUNCTION public.set_user_settings_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_settings_updated_at ON public.user_settings;
CREATE TRIGGER trg_user_settings_updated_at
BEFORE UPDATE ON public.user_settings
FOR EACH ROW
EXECUTE FUNCTION public.set_user_settings_updated_at();

-- 2) Extend card_reviews with analytics fields
ALTER TABLE public.card_reviews
  ADD COLUMN IF NOT EXISTS answered_in_ms integer,
  ADD COLUMN IF NOT EXISTS answer_timer_seconds integer,
  ADD COLUMN IF NOT EXISTS grace_seconds integer,
  ADD COLUMN IF NOT EXISTS shuffle_mcq_enabled boolean,
  ADD COLUMN IF NOT EXISTS xp_multiplier numeric,
  ADD COLUMN IF NOT EXISTS xp_awarded integer;

-- 3) Daily aggregates MV (per-user per-day)
DROP MATERIALIZED VIEW IF EXISTS public.user_daily_study_stats_mv;
CREATE MATERIALIZED VIEW public.user_daily_study_stats_mv AS
SELECT
  cr.user_id,
  (date_trunc('day', cr.reviewed_at))::date AS study_date,
  count(*)::integer AS reviews_total,
  sum(CASE WHEN cr.was_correct THEN 1 ELSE 0 END)::integer AS correct_total,
  sum(CASE WHEN cr.was_correct THEN 0 ELSE 1 END)::integer AS incorrect_total,
  -- accuracy as 0..1 (avoid div by zero)
  CASE WHEN count(*) > 0
    THEN (sum(CASE WHEN cr.was_correct THEN 1 ELSE 0 END)::numeric / count(*)::numeric)
    ELSE 0
  END AS accuracy,
  avg(cr.answered_in_ms)::numeric AS avg_answer_ms,
  -- timer usage
  sum(CASE WHEN coalesce(cr.answer_timer_seconds, 0) > 0 THEN 1 ELSE 0 END)::integer AS timed_reviews_total,
  -- XP
  coalesce(sum(cr.xp_awarded), 0)::integer AS xp_awarded_total,
  avg(cr.xp_multiplier)::numeric AS avg_xp_multiplier
FROM public.card_reviews cr
GROUP BY cr.user_id, (date_trunc('day', cr.reviewed_at))::date;

CREATE INDEX IF NOT EXISTS idx_user_daily_study_stats_mv_user_date
  ON public.user_daily_study_stats_mv (user_id, study_date DESC);

-- 4) Convenience function to refresh MV (can be called from client via RPC)
CREATE OR REPLACE FUNCTION public.refresh_user_daily_study_stats_mv()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW public.user_daily_study_stats_mv;
END;
$$;


