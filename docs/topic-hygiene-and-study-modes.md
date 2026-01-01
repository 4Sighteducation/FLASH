# Topic Hygiene + Study Modes (Intercept Strategy)

## Why this document exists
You have a very large curriculum graph (tens of thousands of topics) that cannot be fully QA’d before launch, and you’ll continue to **upsert** scrapes over time. Therefore the correct strategy is not “make scrapes perfect”, but to **protect the user experience** with consistent presentation and AI-assisted cleanup where needed.

This document captures:
- What we found in the DB (HTML/blobs in topic names)
- The product philosophy (coverage vs completion)
- A systematic “intercept” solution that scales with ongoing scraping
- A concrete list of app paths that currently leak, and what to change

---

## The two user-facing problems (separate them)

### 1) Overwhelm / anxiety
- Some subjects have hundreds to ~1000 topics.
- If completion uses “% of all topics”, a student can create dozens of cards and still see ~1%.
- The full topic tree can feel overwhelming.

**Fix:** Create a “study lens” (Study Modes) so default progress/navigation is bounded and achievable, while full coverage remains available.

### 2) Label hygiene / trust
- Some `curriculum_topics.topic_name` values are not labels; they are **full specification content**, sometimes including literal HTML such as `<br>`.
- Even if this affects <1% of rows, it can cluster into high-usage subjects and break trust.

**Fix:** Treat `topic_name` as **raw ingestion**. Ensure user-facing labels always go through a hygiene layer: `display_name` (preferred) + deterministic sanitization fallback.

These problems are related, but one does not solve the other. You need both.

---

## What we discovered from SQL (facts)

### HTML in topic names exists and is clustered
From DB queries you ran:
- `curriculum_topics.topic_name` contains HTML tags in **490 / 54,942** rows (~0.9%).
- `topic_ai_metadata.plain_english_summary` contains HTML tags in **3 / 54,942** rows (rare).
- `display_name` currently shows **0** HTML tags (good).

Top affected subjects (examples you returned):
- AQA A-Level Physics: **132**
- AQA A-Level Economics: **77**
- AQA A-Level Design & Technology: **76**
- AQA A-Level Music: **51**
- AQA GCSE Business: **38**
- AQA GCSE Economics: **34**
… plus smaller counts elsewhere.

Distribution by `topic_level`:
- L1: 158
- L2: 29
- L3: 301
- L4: 2

Example row you returned (AQA Physics A-Level, L3):
- `"Hadrons are subject to the strong interaction.<br>... - baryons ... - mesons ..."`

**Interpretation:** This is consistent with “content cell leakage” (spec bullet blocks stored in `topic_name`) rather than random corruption.

---

## Core design principle: separate “coverage” from “completion”

You can keep full **coverage** (all scraped nodes) while presenting a smaller, achievable set for default progress:
- **Coverage layer:** everything you scraped (searchable, expandable, always accessible)
- **Completion layer:** curated/bounded learning units used for the default “% complete”

This preserves granularity for power users without causing anxiety for everyone else.

---

## Decision: Option A (conservative, recommended)

When a blob is detected:
- Set `curriculum_topics.display_name` to a short label (AI-generated when needed)
- Set `curriculum_topics.description` to the cleaned readable “blob text”
- Preserve raw in `curriculum_topics.metadata`
- Leave `curriculum_topics.topic_name` unchanged (auditability, minimal invasiveness)

### UX implication
User experience is identical (often better) **if all UI paths display topic labels using a single rule**:

**Label rule (everywhere):**
- show `display_name` if present
- else show a deterministic sanitized version of `topic_name`
- else (last resort) show raw `topic_name`

This ensures users never see `<br>`/blob titles even while the DB continues to receive imperfect scrapes.

---

## Systematic solution (do not fix screen-by-screen ad hoc)

### Part 1: One canonical label helper (app-level)
Implement a single shared helper, used everywhere a topic name is rendered:
- `sanitizeTopicLabel(text: string): string`
  - strip HTML tags (e.g. `<br>`, `<b>`, etc.)
  - normalize whitespace/newlines
  - trim leading bullets/hyphens
  - truncate for display (e.g. 120–160 chars)
- `getTopicLabel(topic: { topic_name?: string; display_name?: string }): string`
  - return `display_name || sanitize(topic_name) || topic_name || 'Untitled topic'`

**Goal:** No component should render `topic.topic_name` directly.

### Part 2: Query discipline (avoid accidental raw usage)
Anywhere you query `curriculum_topics`:
- Prefer explicit selects: `id, topic_name, display_name, topic_level, parent_topic_id, sort_order`
- Avoid `select('*')` (easy to accidentally use raw `topic_name` later)

### Part 3: Prevent propagation via flashcards (optional but ideal)
Currently, some flows store a topic label string in `flashcards.topic` / `flashcards.topic_name`.
If a leaky screen is used once, the bad string can propagate into study views.

Long-term best practice:
- Treat `flashcards.topic_id` as canonical.
- Derive the label via join to `curriculum_topics` so improvements to `display_name` instantly fix historical cards.

Short-term safe practice:
- Sanitize on display in all study/card list UIs.

---

## Current leak audit (paths that can show `<br>`/blob titles today)

### High priority leak sources (curriculum tree/browse screens)
These fetch `curriculum_topics` (often `select('*')`) and render `topic_name` directly:
- `src/screens/topics/TopicListScreen.tsx`
- `src/screens/cards/CardTopicSelector.tsx`
- `src/screens/topics/TopicHubScreen.tsx`
- `src/components/TopicEditModal.tsx`
- `src/screens/topics/TopicSelectorScreen.tsx`

### Secondary leaks (small queries that pull only topic_name)
- `src/screens/topics/SmartTopicDiscoveryScreen.tsx` (Recent Topics join currently pulls only `curriculum_topics(topic_name)`)
- `src/components/TopicContextModal.tsx` (overview children fetch selects `topic_name`)
- `src/screens/subjects/SubjectProgressScreen.tsx` (overview parent fetch selects `topic_name` only)

### Propagation (shows whatever got passed/stored earlier)
These screens can display ugly names if they were passed via navigation params or stored on `flashcards`:
- `src/screens/cards/CreateCardScreen.tsx`
- `src/screens/cards/AIGeneratorScreen.tsx`
- `src/screens/cards/StudyModal.tsx`
- `src/screens/main/StudyScreen.tsx`
- `src/components/DailyCardsModal.tsx`
- `src/components/StudyBoxModal.tsx`

---

## AI “Intercept on discovery” (non-blocking, cached, scalable)

### Hook point
- When cards are saved, the app calls `discover_topic()` (progressive discovery).
- This is the best moment to run hygiene/enhancement because it’s tied to user intent and limits cost.

### Suggested flow
1) Detect if `topic_name` is unsafe to show:
   - contains HTML tags (`<...>`)
   - too long (e.g. > 120 chars)
   - looks like bullet/prose block (many separators, many sentences)
2) If unsafe:
   - compute `clean_description` (HTML stripped + normalized)
   - generate `display_name` via AI (short syllabus-style noun phrase)
   - write audit info to `metadata`
3) Make it non-blocking:
   - UI can show sanitized fallback immediately
   - AI runs async and then the UI shows `display_name` next time

### Storage model (Option A)
- `display_name`: short label
- `description`: cleaned readable blob
- `metadata`: raw + provenance, e.g. original string, detection reasons, timestamp, model name/confidence

---

## Study Mode UX (overwhelm prompt) — complements hygiene, doesn’t replace it

### Why this helps
“Condense this subject?” is really about **reducing overwhelm** and making progress feel achievable. It does not fix label quality.

### Recommended framing (avoid fear of “losing content”)
Offer a mode selection:
- **Standard (recommended):** guided set of key topics (simpler progress). Full spec always available.
- **Detailed:** show every micro-topic (maximum granularity).
- **Exam Sprint:** focus on high-importance topics only.

Optional reassurance:
- “We’ll automatically tidy messy topic titles you discover so everything stays readable.”

---

## Completion metric note (why % can feel stuck)
In the current implementation, completion comes from `calculate_subject_completion()`:
- numerator: count of `user_discovered_topics` for that subject
- denominator: count of “important topics” (AI metadata) or fallback to all curriculum topics if no matches

If the denominator is large (or falls back due to metadata mismatch), users can see very low % even after creating many cards.
This reinforces the need for Study Modes / bounded completion.

---

## SQL snippets (for periodic monitoring)

### Count HTML-tagged topic_name rows
```sql
select
  count(*) filter (where topic_name ~ '<[^>]+>') as topic_name_has_html_tags,
  count(*) as total_topics
from curriculum_topics;
```

### Subjects most affected (joins via IDs)
```sql
select
  eb.code as exam_board,
  qt.code as qualification_type,
  ebs.subject_name,
  count(*) as html_tag_topics
from curriculum_topics ct
join exam_board_subjects ebs on ebs.id = ct.exam_board_subject_id
left join exam_boards eb on eb.id = ebs.exam_board_id
left join qualification_types qt on qt.id = ebs.qualification_type_id
where ct.topic_name ~ '<[^>]+>'
group by eb.code, qt.code, ebs.subject_name
order by html_tag_topics desc
limit 50;
```

### Show `<br>` examples
```sql
select
  eb.code as exam_board,
  qt.code as qualification_type,
  ebs.subject_name,
  ct.id,
  ct.topic_level,
  left(ct.topic_name, 300) as topic_name_snippet
from curriculum_topics ct
join exam_board_subjects ebs on ebs.id = ct.exam_board_subject_id
left join exam_boards eb on eb.id = ebs.exam_board_id
left join qualification_types qt on qt.id = ebs.qualification_type_id
where ct.topic_name ilike '%<br%'
order by length(ct.topic_name) desc
limit 50;
```

---

## Implementation to-do (minimal-risk order)

### P0 — Stop visible leaks everywhere
- Add shared helper: `getTopicLabel()` + `sanitizeTopicLabel()`.
- Update all curriculum tree/browse/edit screens to use it:
  - `TopicListScreen`, `CardTopicSelector`, `TopicHubScreen`, `TopicEditModal`, `TopicSelectorScreen`
- Update `SmartTopicDiscoveryScreen` recent topics join to include `display_name`
- Update `TopicContextModal` overview children fetch to prefer `display_name`
- Update `SubjectProgressScreen` overview parent fetch to include `display_name`

### P1 — Prevent propagation into Study flows
- Sanitize any topic strings shown in study screens (even if sourced from `flashcards`).
- Prefer using `topic_id` + join to `curriculum_topics` for display labels (best).

### P2 — AI intercept on discovery
- Expand “poor name detection” to include: HTML tags, length, bullet/prose blocks.
- On discovery: set `display_name`, set `description`, preserve raw in `metadata`.
- Make non-blocking + cached per topic.

### P3 — Study Modes prompt (overwhelm)
- Add Study Mode selection for large subjects.
- Align progress UI wording to the chosen completion lens.


