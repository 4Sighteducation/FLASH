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


