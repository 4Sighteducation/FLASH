-- RLS + safe RPC helpers for user_settings and daily stats MV.
-- This migration is important if you're running Supabase RLS (you are).

-- 1) RLS for user_settings
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_settings_select_own" ON public.user_settings;
CREATE POLICY "user_settings_select_own"
  ON public.user_settings
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "user_settings_insert_own" ON public.user_settings;
CREATE POLICY "user_settings_insert_own"
  ON public.user_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "user_settings_update_own" ON public.user_settings;
CREATE POLICY "user_settings_update_own"
  ON public.user_settings
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 2) Stats RPC: read from MV but only for the logged-in user.
-- Avoid granting direct SELECT on the MV.
CREATE OR REPLACE FUNCTION public.get_user_daily_study_stats(p_limit integer DEFAULT 60)
RETURNS TABLE (
  user_id uuid,
  study_date date,
  reviews_total integer,
  correct_total integer,
  incorrect_total integer,
  accuracy numeric,
  avg_answer_ms numeric,
  timed_reviews_total integer,
  xp_awarded_total integer,
  avg_xp_multiplier numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    mv.user_id,
    mv.study_date,
    mv.reviews_total,
    mv.correct_total,
    mv.incorrect_total,
    mv.accuracy,
    mv.avg_answer_ms,
    mv.timed_reviews_total,
    mv.xp_awarded_total,
    mv.avg_xp_multiplier
  FROM public.user_daily_study_stats_mv mv
  WHERE mv.user_id = auth.uid()
  ORDER BY mv.study_date DESC
  LIMIT greatest(1, least(coalesce(p_limit, 60), 365));
$$;

GRANT EXECUTE ON FUNCTION public.get_user_daily_study_stats(integer) TO authenticated;

-- 3) MV refresh: do NOT expose to authenticated users (too expensive + global).
-- Keep it for service_role/admin workflows.
ALTER FUNCTION public.refresh_user_daily_study_stats_mv() SECURITY DEFINER;
REVOKE EXECUTE ON FUNCTION public.refresh_user_daily_study_stats_mv() FROM authenticated, anon;
GRANT EXECUTE ON FUNCTION public.refresh_user_daily_study_stats_mv() TO service_role;


