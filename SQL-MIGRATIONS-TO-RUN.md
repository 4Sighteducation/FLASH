# 🗃️ SQL MIGRATIONS - RUN THESE IN ORDER

**Before testing the app, run these 4 SQL migrations in your Supabase SQL Editor.**

---

## **Migration 1: Enhanced Topic Query** ⭐ CRITICAL

**Purpose:** Fetch topics with parent hierarchy  
**File:** `supabase/migrations/enhanced_topic_query.sql`

```sql
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
    COALESCE(utc.card_count, 0)::BIGINT as card_count,
    COALESCE(utc.cards_mastered, 0)::BIGINT as cards_mastered,
    utc.last_studied
  FROM curriculum_topics t
  INNER JOIN user_topic_cards utc ON utc.topic_id = t.id
  INNER JOIN exam_board_subjects ebs ON ebs.id = t.exam_board_subject_id
  LEFT JOIN curriculum_topics parent ON parent.id = t.parent_topic_id
  LEFT JOIN curriculum_topics grandparent ON grandparent.id = parent.parent_topic_id
  WHERE ebs.subject_name = p_subject_name
  ORDER BY t.topic_level, COALESCE(parent.display_name, parent.topic_name) NULLS FIRST, COALESCE(t.display_name, t.topic_name);
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION get_user_topics_with_hierarchy TO authenticated;
```

**Result:** ✅ Topics display in hierarchy on homepage

---

## **Migration 2: Tutorial Tracking**

**Purpose:** Track which users have seen the tutorial  
**File:** `supabase/migrations/add_tutorial_tracking.sql`

```sql
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS has_seen_reveal_context_tutorial BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_users_tutorial_status 
ON users(has_seen_reveal_context_tutorial) 
WHERE has_seen_reveal_context_tutorial = FALSE;
```

**Result:** ✅ Tutorial shows once per user

---

## **Migration 3: Display Names + Detection**

**Purpose:** Enable AI-enhanced topic names  
**File:** `supabase/migrations/add_display_name_column.sql`

```sql
-- Add columns
ALTER TABLE curriculum_topics 
ADD COLUMN IF NOT EXISTS display_name TEXT;

ALTER TABLE curriculum_topics 
ADD COLUMN IF NOT EXISTS needs_name_enhancement BOOLEAN DEFAULT FALSE;

-- Detection function
CREATE OR REPLACE FUNCTION detect_poor_topic_names()
RETURNS TABLE (
  topic_id UUID,
  topic_name TEXT,
  topic_level INTEGER,
  parent_name TEXT,
  grandparent_name TEXT,
  subject_name TEXT,
  reason TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id as topic_id,
    t.topic_name,
    t.topic_level,
    parent.topic_name as parent_name,
    grandparent.topic_name as grandparent_name,
    ebs.subject_name,
    CASE 
      WHEN LENGTH(t.topic_name) <= 3 THEN 'Too short (≤3 chars)'
      WHEN t.topic_name ~ '^[0-9]+$' THEN 'Just numbers'
      WHEN t.topic_name ~ '^[0-9]+\.[0-9]+$' THEN 'Number code only'
      WHEN t.topic_name ~ '^[0-9]+\.[0-9]+\.[0-9]+' THEN 'Nested number code'
      ELSE 'Other'
    END as reason
  FROM curriculum_topics t
  INNER JOIN exam_board_subjects ebs ON ebs.id = t.exam_board_subject_id
  LEFT JOIN curriculum_topics parent ON parent.id = t.parent_topic_id
  LEFT JOIN curriculum_topics grandparent ON grandparent.id = parent.parent_topic_id
  WHERE 
    t.display_name IS NULL AND (
      LENGTH(t.topic_name) <= 3 OR
      t.topic_name ~ '^[0-9]+$' OR
      t.topic_name ~ '^[0-9]+\.[0-9]+' OR
      t.topic_name ~ '^[0-9]+\.[0-9]+\.[0-9]+'
    )
  ORDER BY ebs.subject_name, t.topic_level, t.topic_name;
END;
$$ LANGUAGE plpgsql;

-- Mark poor names
UPDATE curriculum_topics
SET needs_name_enhancement = TRUE
WHERE display_name IS NULL AND (
  LENGTH(topic_name) <= 3 OR
  topic_name ~ '^[0-9]+$' OR
  topic_name ~ '^[0-9]+\.[0-9]+' OR
  topic_name ~ '^[0-9]+\.[0-9]+\.[0-9]+'
);

GRANT EXECUTE ON FUNCTION detect_poor_topic_names TO authenticated;
```

**Result:** ✅ AI auto-enhances poor names

---

## **Migration 4: Update Context Function**

**Purpose:** Return display_name in Reveal Context modal  
**File:** `supabase/migrations/fix_get_topic_context_v2.sql`

**Note:** This is the full updated version from earlier that includes display_name in all CTEs.

**Result:** ✅ Modal shows enhanced names

---

## 📋 **QUICK RUN SCRIPT**

Copy all 4 files into Supabase SQL Editor and run in sequence:

1. `enhanced_topic_query.sql`
2. `add_tutorial_tracking.sql`
3. `add_display_name_column.sql`
4. `fix_get_topic_context_v2.sql` (full version)

---

## ✅ **VERIFICATION**

After running migrations, check:

```sql
-- Check functions exist
SELECT routine_name 
FROM information_schema.routines
WHERE routine_schema = 'public' 
  AND routine_name IN (
    'get_user_topics_with_hierarchy',
    'detect_poor_topic_names',
    'get_topic_context'
  );

-- Check columns added
SELECT column_name 
FROM information_schema.columns
WHERE table_name = 'curriculum_topics' 
  AND column_name IN ('display_name', 'needs_name_enhancement');

SELECT column_name 
FROM information_schema.columns
WHERE table_name = 'users' 
  AND column_name = 'has_seen_reveal_context_tutorial';

-- Check how many topics need enhancement
SELECT COUNT(*) 
FROM curriculum_topics 
WHERE needs_name_enhancement = TRUE;
```

**Expected Results:**
- ✅ 3 functions found
- ✅ 3 columns added
- ✅ X topics flagged for enhancement

---

## 🎯 **AFTER SQL IS RUN:**

The app will:
1. ✅ Show topics in proper Level 0 parent hierarchy
2. ✅ Display "Create Overview Cards" buttons
3. ✅ Show tutorial to first-time users
4. ✅ Auto-enhance poor topic names in background

**Time to fully functional:** ~5 minutes (SQL + deployment)

---

## 🚀 **LET'S TEST!**

Run the SQL migrations and let me know when ready! 🎊





