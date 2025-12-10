# ⚠️ SQL MIGRATION REQUIRED

## 🔧 **Run This SQL in Supabase:**

The deployment is live on Vercel, but you need to run the SQL function in Supabase first.

**File:** `supabase/migrations/enhanced_topic_query.sql`

Or copy/paste this:

```sql
-- Function to get user's discovered topics with full hierarchy
CREATE OR REPLACE FUNCTION get_user_topics_with_hierarchy(
  p_user_id UUID,
  p_subject_name TEXT
)
RETURNS TABLE (
  topic_id UUID,
  topic_name TEXT,
  topic_level INTEGER,
  parent_topic_id UUID,
  parent_name TEXT,
  grandparent_name TEXT,
  card_count BIGINT,
  cards_mastered BIGINT,
  last_studied TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  WITH user_topic_cards AS (
    -- Get all topics this user has cards for
    SELECT 
      f.topic_id,
      COUNT(*) as card_count,
      COUNT(*) FILTER (WHERE f.box_number >= 4) as cards_mastered,
      MAX(cr.reviewed_at) as last_studied
    FROM flashcards f
    LEFT JOIN card_reviews cr ON cr.flashcard_id = f.id
    WHERE f.user_id = p_user_id
    GROUP BY f.topic_id
  )
  SELECT 
    t.id as topic_id,
    t.topic_name,
    t.topic_level,
    t.parent_topic_id,
    parent.topic_name as parent_name,
    grandparent.topic_name as grandparent_name,
    COALESCE(utc.card_count, 0)::BIGINT as card_count,
    COALESCE(utc.cards_mastered, 0)::BIGINT as cards_mastered,
    utc.last_studied
  FROM curriculum_topics t
  INNER JOIN user_topic_cards utc ON utc.topic_id = t.id
  INNER JOIN exam_board_subjects ebs ON ebs.id = t.exam_board_subject_id
  LEFT JOIN curriculum_topics parent ON parent.id = t.parent_topic_id
  LEFT JOIN curriculum_topics grandparent ON grandparent.id = parent.parent_topic_id
  WHERE ebs.subject_name = p_subject_name
  ORDER BY t.topic_level, parent.topic_name NULLS FIRST, t.topic_name;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_user_topics_with_hierarchy TO authenticated;
```

## ✅ **After Running SQL:**

1. **Refresh your app**
2. **Navigate to Physical Education subject page**
3. **Expected:** Topics now appear in hierarchical groups!
4. **Expected:** Parent sections are collapsible

---

## 🧪 **What This Fixes:**

**Before:**
- ❌ Create cards → Navigate back → Empty screen
- ❌ Cards exist but no topics show
- ❌ "Start Your Journey!" always showing

**After:**
- ✅ Create cards → Navigate back → Topics appear!
- ✅ Organized by parent topic hierarchy
- ✅ Collapsible sections
- ✅ Shows card counts and progress

---

## ⏱️ **ETA:** 

- **SQL:** Run in 30 seconds
- **Frontend:** Already deployed (2-3 minutes)
- **Ready to test:** ~3 minutes from now

---

## 🚀 **PHASE 1 COMPLETE!**

Next up: **Phase 2 - AI-Enhanced Topic Names** (fixing those "1", "2", "3" names)

Let me know when SQL is run and we'll test! 🎉

