-- Lock down high-risk views and user discovery data.
-- Prevent global access; keep service_role for internal use.

-- 1) Make views run as invoker and remove public access.
ALTER VIEW IF EXISTS public.user_topics_with_progress SET (security_invoker = true);
ALTER VIEW IF EXISTS public.flashcards_with_details SET (security_invoker = true);

REVOKE ALL ON public.user_topics_with_progress FROM anon, authenticated;
REVOKE ALL ON public.flashcards_with_details FROM anon, authenticated;

GRANT SELECT ON public.user_topics_with_progress TO service_role;
GRANT SELECT ON public.flashcards_with_details TO service_role;

-- 2) Enable RLS on user_discovered_topics and restrict to owner.
ALTER TABLE public.user_discovered_topics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_discovered_topics_select_own" ON public.user_discovered_topics;
CREATE POLICY "user_discovered_topics_select_own"
  ON public.user_discovered_topics
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "user_discovered_topics_insert_own" ON public.user_discovered_topics;
CREATE POLICY "user_discovered_topics_insert_own"
  ON public.user_discovered_topics
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "user_discovered_topics_update_own" ON public.user_discovered_topics;
CREATE POLICY "user_discovered_topics_update_own"
  ON public.user_discovered_topics
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "user_discovered_topics_delete_own" ON public.user_discovered_topics;
CREATE POLICY "user_discovered_topics_delete_own"
  ON public.user_discovered_topics
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
