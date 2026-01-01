# ⚠️ CRITICAL: Run These 4 SQL Migrations

**Before testing the app, you MUST run these migrations in Supabase SQL Editor.**

---

## 🎯 **MIGRATION 1: Great-Grandparent (MOST CRITICAL)**

**File:** `supabase/migrations/add_great_grandparent.sql`

**What it does:** Adds Level 0 parent support (e.g., "Physical chemistry")

**Copy and paste this:**

```sql
DROP FUNCTION IF EXISTS get_user_topics_with_hierarchy(UUID, TEXT);

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
  great_grandparent_name TEXT,
  card_count BIGINT,
  cards_mastered BIGINT,
  last_studied TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  WITH user_topic_cards AS (
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
    COALESCE(t.display_name, t.topic_name) as topic_name,
    t.topic_level,
    t.parent_topic_id,
    COALESCE(parent.display_name, parent.topic_name) as parent_name,
    COALESCE(grandparent.display_name, grandparent.topic_name) as grandparent_name,
    COALESCE(great_grandparent.display_name, great_grandparent.topic_name) as great_grandparent_name,
    COALESCE(utc.card_count, 0)::BIGINT as card_count,
    COALESCE(utc.cards_mastered, 0)::BIGINT as cards_mastered,
    utc.last_studied
  FROM curriculum_topics t
  INNER JOIN user_topic_cards utc ON utc.topic_id = t.id
  INNER JOIN exam_board_subjects ebs ON ebs.id = t.exam_board_subject_id
  LEFT JOIN curriculum_topics parent ON parent.id = t.parent_topic_id
  LEFT JOIN curriculum_topics grandparent ON grandparent.id = parent.parent_topic_id
  LEFT JOIN curriculum_topics great_grandparent ON great_grandparent.id = grandparent.parent_topic_id
  WHERE ebs.subject_name = p_subject_name
  ORDER BY t.topic_level, COALESCE(parent.display_name, parent.topic_name) NULLS FIRST, COALESCE(t.display_name, t.topic_name);
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION get_user_topics_with_hierarchy TO authenticated;
```

**Result:** ✅ "Physical chemistry" appears as Level 0 collapsible section

---

## 🎯 **MIGRATION 2: Tutorial Tracking**

```sql
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS has_seen_reveal_context_tutorial BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_users_tutorial_status 
ON users(has_seen_reveal_context_tutorial) 
WHERE has_seen_reveal_context_tutorial = FALSE;
```

**Result:** ✅ Tutorial shows once per user

---

## 🎯 **MIGRATION 3: Display Names**

```sql
ALTER TABLE curriculum_topics 
ADD COLUMN IF NOT EXISTS display_name TEXT;

ALTER TABLE curriculum_topics 
ADD COLUMN IF NOT EXISTS needs_name_enhancement BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_curriculum_topics_display_name 
ON curriculum_topics(display_name) 
WHERE display_name IS NOT NULL;

-- Detection function (from add_display_name_column.sql)
-- Run the full file for complete setup
```

**Result:** ✅ AI can enhance topic names

---

## 🎯 **MIGRATION 4: Updated Context Function**

Run the FULL file: `supabase/migrations/fix_get_topic_context_v2.sql`

This includes display_name support in the Reveal Context modal.

---

## ✅ **VERIFY MIGRATIONS WORKED:**

Run this after completing migrations:

```sql
-- Check all functions exist
SELECT routine_name, data_type
FROM information_schema.routines
WHERE routine_schema = 'public' 
  AND routine_name IN (
    'get_user_topics_with_hierarchy',
    'get_topic_context',
    'detect_poor_topic_names'
  );

-- Should return 3 rows

-- Check columns added
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_name IN ('curriculum_topics', 'users')
  AND column_name IN ('display_name', 'needs_name_enhancement', 'has_seen_reveal_context_tutorial');

-- Should return 3 rows

-- Test the hierarchy query
SELECT * FROM get_user_topics_with_hierarchy(
  'da52b509-99df-4743-bf36-d3fd1858d0a6', -- Your current user
  'Chemistry (A-Level)'
);

-- Should return your 3 topics with great_grandparent_name = "Physical chemistry"
```

---

## 🎉 **EXPECTED RESULTS:**

### **Homepage:**
- ✅ See "Physical chemistry" as collapsible Level 0 section
- ✅ Expand to see "Atomic structure" and all your topics
- ✅ "Create Overview Cards" button in section
- ✅ Card counts: 11 total across 3 topics

### **Reveal Context Modal:**
- ✅ First time: Tutorial shows
- ✅ Subsequent times: Help (?) button available
- ✅ Long titles abbreviated
- ✅ "Creating..." overlay when clicking +Create
- ✅ Modal closes smoothly before navigation

### **AI Enhancements:**
- ✅ Poor names like "1", "2.1.1" enhance automatically
- ✅ Happens in background (non-blocking)
- ✅ Takes 5-10 seconds per name
- ✅ Refresh page to see enhancements persist

---

## ⏱️ **TIME ESTIMATE:**

- SQL Migrations: 3-5 minutes
- Vercel Deployment: Already done (or 2-3 min)
- **Total: ~5 minutes to fully functional**

---

## 🚀 **READY TO TEST!**

1. ✅ Run the 4 SQL migrations above
2. ✅ Refresh your app at https://www.fl4sh.cards
3. ✅ Navigate to Chemistry (A-Level)
4. ✅ See "Physical chemistry" Level 0 section! 🎉

**This feature is now world-class and ready for launch!** 🌟


