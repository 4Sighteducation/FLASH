-- Upgrade daily due-cards push targets to include per-Leitner-box breakdown.
-- This keeps the existing targeting logic (tokens + prefs + local-hour gate + not-sent-today)
-- while returning due counts for each box.

create or replace function public.get_due_cards_push_targets(p_limit integer default 500)
returns table (
  user_id uuid,
  expo_push_token text,
  timezone text,
  daily_due_cards_hour integer,
  last_daily_due_cards_sent_at timestamptz,
  due_count integer,
  due_box_1 integer,
  due_box_2 integer,
  due_box_3 integer,
  due_box_4 integer,
  due_box_5 integer
)
language sql
stable
as $$
  with active_tokens as (
    select upt.user_id, upt.expo_push_token
    from public.user_push_tokens upt
    where upt.enabled = true
  ),
  prefs as (
    select
      p.user_id,
      p.timezone,
      p.daily_due_cards_hour,
      p.last_daily_due_cards_sent_at
    from public.user_notification_preferences p
    where p.push_enabled = true
      and p.daily_due_cards_enabled = true
  ),
  candidates as (
    select
      t.user_id,
      t.expo_push_token,
      p.timezone,
      p.daily_due_cards_hour,
      p.last_daily_due_cards_sent_at
    from active_tokens t
    join prefs p on p.user_id = t.user_id
    where extract(hour from (now() at time zone p.timezone))::int = p.daily_due_cards_hour
      and (
        p.last_daily_due_cards_sent_at is null
        or date(p.last_daily_due_cards_sent_at at time zone p.timezone) < date(now() at time zone p.timezone)
      )
  ),
  due_cards as (
    select
      f.user_id,
      f.box_number
    from public.flashcards f
    where f.in_study_bank = true
      and coalesce(f.next_review_date, now()) <= now()
      and f.subject_name in (
        select s.subject_name
        from public.user_subjects us
        join public.exam_board_subjects s on s.id = us.subject_id
        where us.user_id = f.user_id
      )
  )
  select
    c.user_id,
    c.expo_push_token,
    c.timezone,
    c.daily_due_cards_hour,
    c.last_daily_due_cards_sent_at,
    count(dc.user_id)::int as due_count,
    count(*) filter (where dc.box_number = 1)::int as due_box_1,
    count(*) filter (where dc.box_number = 2)::int as due_box_2,
    count(*) filter (where dc.box_number = 3)::int as due_box_3,
    count(*) filter (where dc.box_number = 4)::int as due_box_4,
    count(*) filter (where dc.box_number = 5)::int as due_box_5
  from candidates c
  join due_cards dc on dc.user_id = c.user_id
  group by
    c.user_id,
    c.expo_push_token,
    c.timezone,
    c.daily_due_cards_hour,
    c.last_daily_due_cards_sent_at
  having count(dc.user_id) > 0
  limit p_limit;
$$;


