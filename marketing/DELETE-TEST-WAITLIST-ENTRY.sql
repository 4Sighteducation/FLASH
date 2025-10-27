-- Delete test waitlist entry for tony@vespa.academy

DELETE FROM public.waitlist 
WHERE email = 'tony@vespa.academy';

-- Verify it's gone
SELECT * FROM public.waitlist ORDER BY position ASC;

-- Reset position counter if needed (recalculate positions)
UPDATE public.waitlist 
SET position = (
  SELECT COUNT(*) 
  FROM public.waitlist AS w2 
  WHERE w2.created_at <= waitlist.created_at
)
WHERE true;

-- Recalculate is_top_twenty based on new positions
UPDATE public.waitlist
SET is_top_twenty = (position <= 20);

