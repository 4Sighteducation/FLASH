# Session Handover — 2025-12-29

## What we achieved (high-level)
- Implemented the **Study “Hero Card”** (card overlays boxes, full-screen feel, improved readability, controlled interaction).
- Fixed multiple **blank card** regressions (AI generator preview, Preview Tomorrow, locked/learning-journey review).
- Made **swipe navigation actually work** (Preview Tomorrow + Study Hub frozen browsing + AI generator preview paging).
- Wired **difficulty-based flippability** (Safe/Standard flippable; Turbo/Overdrive/Beast unflippable) across review surfaces.
- Added a **Reveal disabled** UX: tapping on locked reveal shows a message and opens an **in-place Difficulty bottom sheet** (no navigation away).
- Reduced disruptive **API 500 spam** from topic-name enhancement with a circuit breaker + silent fallback.
- Added `.gitattributes` to reduce Windows CRLF churn.

---

## Study Mode: “Card is the Star” + Hero Card flow
**Key UX behaviors implemented:**
- The card is a full-screen **hero overlay** above Leitner boxes.
- After answering, the hero card animates away and reveals the Leitner/box feedback moment, then the next card comes in.
- **No navigation while answering** (Study mode). User must answer or **Skip** (skip = hide for session, no scheduling changes).
- **Controlled flipping**: in Study, users cannot tap-to-flip to reveal answers before committing.
- Long questions clamp + **tap-to-expand** modal.
- MCQ options: high-contrast filled buttons, equal heights, evenly distributed layout.
- Subject-colored thicker border for cognition cue.

**Core files:**
- `src/screens/cards/StudyModal.tsx`
- `src/components/FlashcardCard.tsx`

---

## Review flows: Preview Tomorrow + Study Hub / Learning Journey
**Preview Tomorrow:**
- Full-screen hero styling (consistent with Study).
- Difficulty-based flippability:
  - Safe/Standard: can flip
  - Turbo/Overdrive/Beast: cannot flip (question-only)
- Swipe navigation fixed (and “Swipe to navigate” shown only when accurate).
- Exit Preview hang fixed (avoid state updates during unmount).

**Study Hub / Learning Journey / Review-by-subject:**
- Locked/frozen cards are always readable (question never hidden).
- Added swipe + visible Previous/Next controls where needed.
- “Frozen browse” in `StudyModal` now behaves like Preview swipe (no bounce-back).

**Core files:**
- `src/components/FrozenCard.tsx`
- `src/components/StudyBoxModal.tsx`
- `src/screens/cards/StudyModal.tsx`

---

## AI Card Generator preview fixes + swipe paging
**Fixed critical issue:** generated cards were created but preview rendered blank after hero-card styling changes.

**Current behavior:**
- AI preview uses **horizontal paged swipe** (stable centering; no drift).
- Preview cards use hero styling for consistency.
- Delete “X” restored and reliably visible; header shows “Swipe to preview” hint.

**Core files:**
- `src/screens/cards/AIGeneratorScreen.tsx`
- `src/screens/cards/ImageCardGeneratorScreen.tsx`
- `src/components/FlashcardCard.tsx`

---

## Difficulty Mode UX: Reveal disabled popup + in-place bottom sheet
**Requirement:** In Turbo/Overdrive/Beast, Reveal Answer is disabled.

**Implemented:**
- Tapping a locked reveal shows:
  - “Reveal Answer is disabled in {difficulty}. To enable Reveal Answer, please switch to Safe or Standard Mode.”
- From that prompt, user can open a **bottom sheet over the current card** and switch difficulty immediately (updates `user_settings`).

**Core files:**
- `src/screens/cards/StudyModal.tsx` (local sheet + update)
- `src/components/FrozenCard.tsx` (hook to trigger the prompt)
- `src/screens/main/ProfileScreen.tsx` (still supports Difficulty modal, plus optional deep-link param)

---

## Topic Name Enhancement API 500 (UX stability)
**Problem:** `Error: API returned 500` spam in UI/logs when enhancement endpoint fails.

**Fix:**
- Added circuit breaker + silent fallback to original topic name.

**File:**
- `src/services/topicNameEnhancement.ts`

---

## Repo health
- Added `.gitattributes` to normalize line endings and reduce CRLF churn.

---

## Key commits (this session)
- `2718fe1` — Improve study browse swipe, AI preview paging, and difficulty popup
- `682b6f2` — Add in-place difficulty sheet when reveal is disabled

---

## Outstanding follow-ups (next session)
- Investigate/resolve backend cause of `API returned 500` for card generation/search (server-side).
- Optional polish: unify sheet UI between Profile Difficulty modal and Study in-place sheet (shared component).

---

## Session Update — 2025-12-30 (Home / Subject Page + Free Tier gating)

### Subject Page / Card Bank (major production prep)
- Rebuilt the subject page topic tree so **Level 0 topics always display** (root topics in `curriculum_topics` where `parent_topic_id IS NULL`), even when the user has created **no cards**.
- Default view is now **fully collapsed** (no auto-expansion on entry).
- Moved **Discover Topics** CTA to sit **above the topic tree** (under the priority filter) to avoid long-scroll.

### “Add to Tree” + progressive drill-down
- Added an **Add-to-tree** modal (`TopicChildrenPickerModal`) that lets users drill down topic children and add topics to the visible tree.
- Adding a topic uses `discover_topic` with `discovery_method='add_to_tree'`, so it **counts towards discovery/completion %** even with 0 cards.
- Fixed UX where adding one child under a Level 0 made it hard to add more: **long-press Level 0** now always opens Add-to-tree for immediate children.

### Overview cards (big-picture cards for parent topics)
- Added **long-press on non-root parent topics** to access overview actions:
  - **Create Overview Cards** (AI generator with child-topic context)
  - **Study Overview Cards** (filters study to `is_overview = true`)
- Implemented safe, dynamic child-topic context caps for overview generation:
  - Level 1 parents: **30** children
  - Level 2 parents: **20** children
  - Level 3+ parents: **10** children
  - Adds `(+X more…)` hint when capped; prefers children by `topic_ai_metadata.exam_importance` when available.

### Priority consistency + explanation
- Unified priority mapping across the app via `src/constants/topicPriorities.ts`:
  - **1 = highest priority (red)** … **4 = lowest (green)**
- Added a **priority explainer modal** on the subject page (help icon beside “FILTER BY PRIORITY”).

### Free tier enforcement (critical)
Goal: Free tier must be **1 subject max** and **10 flashcards max** with a “View plans” upgrade prompt.
- Added a shared, authoritative limiter in `src/utils/usageLimits.ts` using Supabase counts (with a robust fallback to selecting ids when needed).
- Enforced **10-card limit** across all creation/save routes:
  - AI generator save
  - Image generator save
  - Manual create save
  - Manage Topic “Generate more cards”
- Enforced **1-subject limit** across all subject-add routes:
  - SubjectSelection (including a pre-insert gate)
  - SubjectSearch (pre-upsert gate)
  - Home “Add More Subjects” entry point
  - CardSubjectSelector empty state “Add Subjects”

### Core files touched (this session)
- `src/screens/subjects/SubjectProgressScreen.tsx`
- `src/components/TopicChildrenPickerModal.tsx` (new)
- `src/screens/cards/StudyModal.tsx` (adds `overviewOnly` + prefers topic_id filtering)
- `src/constants/topicPriorities.ts` (new)
- `src/utils/usageLimits.ts` (new)
- `src/screens/cards/AIGeneratorScreen.tsx`
- `src/screens/cards/ImageCardGeneratorScreen.tsx`
- `src/screens/cards/CreateCardScreen.tsx`
- `src/screens/cards/ManageTopicScreen.tsx`
- `src/screens/cards/ManageAllCardsScreen.tsx`
- `src/screens/onboarding/SubjectSelectionScreen.tsx`
- `src/screens/onboarding/SubjectSearchScreen.tsx`
- `src/screens/main/HomeScreen.tsx`
- `src/screens/cards/CardSubjectSelector.tsx`

---

## Session Update — 2025-12-30 (In-app Feedback/Support + Pro Priority Support + Repo cleanup)

### In-app Feedback / Support (all tiers)
- Added a global **Feedback/Support modal** that users can open from anywhere in the app.
- Feedback creates:
  - a **DB record** (for triage)
  - a **support email** via SendGrid (server-side)
- Added **screenshots** support:
  - Auto-capture via `react-native-view-shot` (true in-app screenshot, not “take photo”)
  - Uploads to a **private** Supabase Storage bucket (`feedback-screenshots`)

### Pro: Priority Support
- Added Pro-only **Priority Support** entry points:
  - Floating **Priority** button (FAB) across the app
  - Profile button changed to **Priority Help & Support** for Pro (and **Help & Support** for other tiers)
- Priority emails are now obvious:
  - Red priority banner + “high importance” headers
  - **Urgency color badges** (critical/high/medium/low)
  - Subject line includes urgency prefix for inbox scanning

### Screenshot access reliability (email links)
- Implemented a dedicated edge function `feedback-screenshot`:
  - **No JWT required** (deployed with `--no-verify-jwt`)
  - Validates `id` + `view_token`
  - **Serves screenshot bytes directly** (avoids giant signed URL rendering issues)
  - Supports `&download=1` to force download (avoids blank webviews)

### UI/UX tweaks
- Fixed Home vs Profile “rank icon” mismatch:
  - Home now uses `SystemStatusRankIcon` (consistent with Profile)
  - Fixed missing `singularity` mapping in `SystemStatusRankIcon`
- Removed **Manage subjects** button from Profile.
- Feedback pills:
  - Kept only on **Discover Topics** and **AI Generator** (others were rolled back due to layout interference; Study timer restored).

### Tooling / repo health
- Added lint/TS ergonomics so Supabase edge function files don’t spam editor errors:
  - `.eslintignore` excludes `supabase/functions/**`, `supabase/migrations/**`, `supabase/.temp/**`
  - Added `supabase/functions/tsconfig.json` + `deno-shims.d.ts` for VS Code/Cursor sanity
  - Added lightweight `.eslintrc.cjs` and adjusted `npm run lint` scope
- Fixed confusing IAP toggle message (android-only wording) in `scripts/toggle-iap.js`.
- Updated `build:ios:dev` script to use the correct device profile (`development-device`), and added `build:ios:sim`.

### Database + Edge Functions added this session
- Supabase migrations:
  - `supabase/migrations/20251230_user_feedback_and_support.sql` (user_feedback + bucket policies)
  - `supabase/migrations/20251230_user_feedback_view_token.sql` (adds `view_token` for email screenshot links)
- Edge functions (Supabase):
  - `supabase/functions/submit-feedback/index.ts`
  - `supabase/functions/feedback-screenshot/index.ts`

### Core files touched (this session)
- `src/screens/support/FeedbackModalScreen.tsx` (new)
- `src/components/support/PrioritySupportFab.tsx` (new)
- `src/components/support/FeedbackPill.tsx` (added then partially rolled back per UX)
- `src/utils/feedbackScreenshot.ts` (new)
- `src/screens/main/ProfileScreen.tsx`
- `src/screens/main/HomeScreen.tsx`
- `src/navigation/AppNavigator.tsx`
- `src/navigation/MainNavigator.tsx`
- `src/components/SystemStatusRankIcon.tsx`
- `supabase/functions/submit-feedback/index.ts`
- `supabase/functions/feedback-screenshot/index.ts`
- `supabase/migrations/20251230_user_feedback_and_support.sql`
- `supabase/migrations/20251230_user_feedback_view_token.sql`
- `.eslintrc.cjs`, `.eslintignore`, `tsconfig.json`, `package.json`, `package-lock.json`


