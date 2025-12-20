# TEST_PUSH_NOTIFICATIONS.md

This doc is a **hands-on checklist** for verifying push notifications end-to-end:

- iOS app stores an **Expo push token** in Supabase
- user has **server-side notification preferences**
- the **daily due-cards** RPC returns targets when conditions match
- the Edge Function can send pushes (once deployed/scheduled)

---

## Prerequisites

### App-side (required)

- Install the latest TestFlight build that includes push registration.
- Log in to the app.
- In the app: **Profile → Settings → Push Notifications** → toggle **ON**.
- Accept the iOS permission prompt.

If you do not see an iOS permission prompt, iOS may have permission already set:
- iOS Settings → Notifications → FLASH → enable notifications.

### Supabase-side (required)

Run the migration:
- `supabase/migrations/20251220_push_notifications.sql`

This creates:
- `public.user_push_tokens`
- `public.user_notification_preferences`
- RPC `public.get_due_cards_push_targets(p_limit int)`

---

## Step 1 — Verify tables are receiving rows

### 1A) Count rows

```sql
select
  (select count(*) from public.user_push_tokens) as push_tokens,
  (select count(*) from public.user_notification_preferences) as prefs;
```

Expected:
- `push_tokens >= 1` after at least one device registers
- `prefs >= 1` after at least one user saves prefs

### 1B) Inspect your user’s prefs row

```sql
select u.id, u.email,
       p.push_enabled,
       p.daily_due_cards_enabled,
       p.daily_due_cards_hour,
       p.timezone,
       p.last_daily_due_cards_sent_at,
       p.updated_at
from auth.users u
left join public.user_notification_preferences p on p.user_id = u.id
where u.email = 'tony@vespa.academy';
```

Expected:
- `push_enabled = true`
- `daily_due_cards_enabled = true`
- `timezone` set (e.g. `Europe/London`)
- `daily_due_cards_hour` set (defaults to `18`)

### 1C) Inspect your stored push tokens

```sql
select u.email,
       t.expo_push_token,
       t.platform,
       t.enabled,
       t.created_at,
       t.updated_at,
       t.last_seen_at
from auth.users u
join public.user_push_tokens t on t.user_id = u.id
where u.email = 'tony@vespa.academy'
order by t.updated_at desc
limit 20;
```

Expected:
- `expo_push_token` looks like `ExponentPushToken[...]`
- `enabled = true`

---

## Step 2 — Verify the “daily due cards” RPC returns targets

The RPC returns rows only when **all** are true:
- user has an **enabled push token**
- prefs have `push_enabled = true` and `daily_due_cards_enabled = true`
- the user has **due cards** right now
- the user’s **local hour** equals `daily_due_cards_hour`
- we haven’t already sent a daily push “today” in the user’s timezone

### 2A) Run the RPC “as-is”

```sql
select *
from public.get_due_cards_push_targets(50);
```

If it returns no rows, that can still be correct — it’s time-gated.

### 2B) Force your user to be eligible “right now”

This sets your daily hour to your current hour and clears last-sent.

```sql
update public.user_notification_preferences p
set daily_due_cards_hour = extract(hour from now() at time zone p.timezone)::int,
    last_daily_due_cards_sent_at = null
where p.user_id = (select id from auth.users where email = 'tony@vespa.academy');

select *
from public.get_due_cards_push_targets(50);
```

Expected:
- You should see your `user_id`, `expo_push_token`, and a `due_count > 0`

---

## Step 3 — Quick checks if the RPC still returns no rows

### 3A) Do you have any due cards at all?

This approximates “due” as `next_review_date <= now()` and `in_study_bank = true`.

```sql
select count(*) as due_cards
from public.flashcards f
where f.user_id = '55de17e6-7d26-4b00-a424-fac0b53fef78'
  and f.in_study_bank = true
  and coalesce(f.next_review_date, now()) <= now();
```

If `due_cards = 0`, the RPC will correctly return no rows.

### 3B) Are you missing active subjects?

The due-cards RPC filters to cards in the user’s active subjects.

```sql
select count(*) as active_subjects
from public.user_subjects
where user_id = '55de17e6-7d26-4b00-a424-fac0b53fef78';
```

If `active_subjects = 0`, the RPC will correctly return no rows.

---

## Step 4 — Sending (Edge Function + schedule)

The Edge Function is:
- `supabase/functions/send-daily-due-cards/index.ts`

To actually send pushes automatically you must:
- deploy the function
- set secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- schedule it (recommended: run it **hourly**; it selects users whose local hour matches)

---

## Troubleshooting

### “push_tokens = 0” and “prefs = 0”

This means the app hasn’t written to Supabase yet. Common reasons:
- you never toggled Push Notifications ON in-app
- iOS permission denied
- user is not logged in
- the migration wasn’t run (tables don’t exist)
- RLS policies blocked inserts (check user is authenticated and `user_id` matches `auth.uid()`)


