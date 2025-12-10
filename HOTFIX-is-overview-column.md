# 🔧 HOTFIX: Missing `is_overview` Column

## 🐛 THE ISSUE

**Error:** `Could not find the 'is_overview' column of 'flashcards' in the schema cache`

**Root Cause:** Due to context contamination during the AI crash/restart, the code was updated to use an `is_overview` column in the `flashcards` table, but the database schema was never actually updated to include this column.

**What Was Created:**
- ✅ `topic_overview_cards` table - Created successfully
- ❌ `is_overview` column in `flashcards` table - **MISSING** (causing the error)

---

## ✅ THE FIX

Run the migration SQL I've created:

### Step 1: Run the SQL Migration

1. Go to your Supabase dashboard
2. Navigate to **SQL Editor**
3. Run the file: `supabase/migrations/add_is_overview_column.sql`

Or copy and paste this directly:

```sql
-- Add the is_overview column to flashcards table
ALTER TABLE flashcards 
ADD COLUMN IF NOT EXISTS is_overview BOOLEAN DEFAULT FALSE;

-- Create an index for faster queries on overview cards
CREATE INDEX IF NOT EXISTS idx_flashcards_is_overview 
ON flashcards(is_overview) 
WHERE is_overview = TRUE;

-- Verify the column was added
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'flashcards' 
  AND column_name = 'is_overview';
```

### Step 2: Verify the Fix

After running the SQL, the verification query at the end should return:

```
column_name   | data_type | column_default | is_nullable
--------------+-----------+----------------+------------
is_overview   | boolean   | false          | YES
```

If you see this result, the column was added successfully! ✅

### Step 3: Test Card Saving

1. Navigate to your app
2. Try to generate and save cards (either regular or overview cards)
3. The save should now work without errors

---

## 📊 WHAT THIS COLUMN DOES

The `is_overview` flag distinguishes between two types of flashcards:

### Regular Cards (`is_overview = false`)
- **For:** L4/L5 specific topics (e.g., "viral marketing")
- **Questions:** Detailed, fact-based
- **Example:** "What is viral marketing?" / "Give 3 examples of viral campaigns"

### Overview Cards (`is_overview = true`)
- **For:** L1/L2 parent topics (e.g., "Decisions about promotional mix")  
- **Questions:** Comparison, integration, strategic
- **Example:** "Compare viral marketing vs traditional advertising" / "How do promotional methods complement each other?"

---

## 🔍 HOW THE SYSTEM WORKS NOW

When saving cards, the code checks `params.isOverview`:

```typescript
// In aiService.ts (line ~600)
{
  is_overview: params.isOverview || false  // ← This line needs the column to exist
}
```

**Two tracking systems:**
1. **`flashcards` table** - Stores ALL cards (both types) with `is_overview` flag
2. **`topic_overview_cards` table** - Metadata linking overview cards to parent topics

---

## 🚀 AFTER THE FIX

Once the column is added, the entire Reveal Context feature will work correctly:

✅ Generate specific cards for L4/L5 topics  
✅ Generate overview cards for L1/L2 parent topics  
✅ Save both types to database  
✅ Track overview metadata in `topic_overview_cards`  
✅ Display different AI prompts based on card type  

---

## ⚠️ PREVENTION FOR FUTURE

This happened due to context contamination during the AI crash. To prevent this:

1. **Always verify schema changes** - When an AI says "table created", check if it actually ran the SQL
2. **Test immediately** - Try the feature right after deployment
3. **Check migration files** - Ensure all planned schema changes have corresponding SQL files

---

## 📝 SUMMARY

**What you need to do:**
1. Run the SQL migration (see Step 1 above)
2. Verify the column exists (see Step 2)
3. Test card saving in the app

**Time:** < 2 minutes

Let me know when you've run the SQL and I'll help you test! 🎉

