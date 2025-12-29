# Session Handover — 2025-12-29

## Goals covered this session
- Fix regressions and unblock iOS/Android dev testing (Metro bundling / missing files).
- Reinstate **Pro “Difficulty Mode”** in Study without re-breaking layout.
- Expand **subject appearance controls** (colors + gradients), add **XP-locked theme gradients**, then add **true 3-stop gradients**.
- Address multiple **navigation + gating** issues for Free plan hard limits.
- Stabilize/restore **Gamification ranks + Skins Vault** and Theme unlocks.
- Add **Statistics screen range toggle**.
- Clean up a messy working tree (stash) and push stable commits.

---

## Free plan “hard gatekeeping” (limits + upgrade prompts)
**Limits implemented/verified (via `SubscriptionContext` + screen-level checks):**
- Free users:
  - **Max subjects: 1**
  - **Max cards: 10**
- Premium/Pro: unlimited (or feature-gated separately for Pro).

**Key UX behaviors:**
- Buttons that look disabled still show an **upgrade prompt** rather than being dead.
- Upgrade prompts route immediately to Paywall using a **root-level Paywall modal**, so “View plans” appears instantly.

**Files touched previously (core ones):**
- `src/contexts/SubscriptionContext.tsx` (limits + subject limit off-by-one fix)
- `src/utils/upgradePrompt.ts`
- `src/navigation/RootNavigation.ts` + `src/navigation/AppNavigator.tsx` (root Paywall modal + global nav ref)
- Gating applied across multiple creation flows:
  - `src/screens/onboarding/SubjectSelectionScreen.tsx`
  - `src/screens/onboarding/SubjectSearchScreen.tsx`
  - `src/screens/cards/AIGeneratorScreen.tsx`
  - `src/screens/cards/ImageCardGeneratorScreen.tsx`
  - `src/screens/cards/ManageTopicScreen.tsx`
  - `src/screens/cards/CreateCardScreen.tsx`
  - `src/screens/main/HomeScreen.tsx` (“Add more subjects” prompt)

---

## Study Mode: Difficulty Mode (Pro) reinstated + fixes
**What was restored (Pro only):**
- MCQ **shuffle options** (prevents muscle memory)
- Answer **timer** with **3s grace**
- **XP multipliers** tied to difficulty preset (Safe/Standard/Turbo/Overdrive/Beast)
- Writes richer analytics into `card_reviews`:
  - `answered_in_ms`, `answer_timer_seconds`, `grace_seconds`, `shuffle_mcq_enabled`, `xp_multiplier`, `xp_awarded`

**Important stability decisions:**
- Kept Study layout on the stable base.
- Avoided in-session difficulty switching UI that previously caused freezes.

**Swiping navigation fix:**
- “Swipe to navigate” wasn’t working due to responder conflicts. Fixed by using **PanResponder capture** in `StudyModal`.

**Files:**
- `src/screens/cards/StudyModal.tsx` (timer/grace/analytics + swipe fix)
- `src/components/FlashcardCard.tsx` (shuffleOptions support)

---

## Subject Colors & Gradients
### New palette (source file)
- Reference palette stored at: `assets/flash-color-palettes.jsx`

### Color Picker updates
- `src/screens/settings/ColorPickerScreen.tsx`
  - Uses the palette (28 solids + gradients)
  - **Premium/Pro gate**: gradients locked for Free users
  - Theme gradients (Pulse/Aurora/Singularity) **XP-locked**
  - **3-stop gradients** supported (via `gradient_color_3`)
  - UI fix: gradients displayed in a **4-column grid** and the screen is scrollable so all presets are reachable

### DB: 3-stop gradients
- Added migration:
  - `supabase/migrations/20251228_add_subject_gradient_color_3.sql`
- Column:
  - `user_subjects.gradient_color_3 text null`

### Render updates for 3-stop gradients
- `src/screens/main/HomeScreen.tsx` renders `[c1,c2,c3]` when present
- `src/screens/papers/PastPapersLibraryScreen.tsx` renders `[c1,c2,c3]` when present

---

## Statistics screen
- Added range toggle on Statistics only (Today / 7d / 30d / 90d) and refetches correct range via RPC.
- File:
  - `src/screens/main/StatisticsScreen.tsx`

---

## Gamification + Themes fixes (regressions)
**Issue:** The app temporarily regressed to older “cyber + legend” model, causing:
- Old icons/levels reappearing in Skins Vault.
- `toLocaleString` crashes in Profile/ColorPicker when `themeUnlocks.pulse/aurora/singularity` were undefined.

**Fix:** Restore consistent gamification/theme models:
- `src/services/gamificationService.ts`
  - `themeUnlocks`: pulse=1000, aurora=20000, singularity=200000 (kept cyber=2000 for back-compat)
  - ranks: 7-tier ladder ending at `singularity`
- `src/contexts/ThemeContext.tsx`
  - Added themes: `pulse`, `aurora`, `singularity`
  - Added `setTheme()` (kept `toggleTheme()` for back-compat)
- `src/components/UnlockedAvatarsModal.tsx`
  - Restored System Status icon ladder UI
- `src/components/SystemStatusRankIcon.tsx`
  - Top-tier key corrected to `singularity`
- `src/services/avatarService.ts`
  - Last mapping corrected `legend` → `singularity`

---

## Tooling / Build / Repo health
### Metro unblockers
- Fixed missing `RootNavigation` and Paywall modal wiring
- Fixed accidental duplicate `navigationRef` declaration in `RootNavigation.ts` causing bundling failure

### Repo cleanup
- Repository had many “modified” files due to old local edits + Windows CRLF churn.
- Per user request: ran `git stash -u` to park “local clutter” and pushed only committed, stable changes.

---

## Key commits pushed (high-signal)
- `49e005c` — Stats: add range filter toggle (Today/7d/30d/90d)
- `c5846b8` — Study: restore pro difficulty mode (timer/shuffle/xp) safely
- `f94cdcd` — Subjects: expand palette; gate gradients to Premium+; add XP-locked theme gradients
- `d1a87d2` — Fix: Study card layout + apply new subject color palette
- `e13f537` — Subjects: support 3-stop gradients (db + picker + render)
- `2bbd96b` / `164f32a` — Fix: restore RootNavigation + remove duplicate navigationRef declaration
- `3051749` — Fix: restore new ranks + theme unlocks (Pulse/Aurora/Singularity)
- `b80fc5e` — Fix: enable swipe navigation in StudyModal (PanResponder capture)
- `8d1cb24` — Revert hero-card experiment (returned Study layout to stable)
- `b237ea3` — UI: show all gradients in ColorPicker (4-col grid + scroll)

---

## Outstanding follow-ups (next session)
- Add `.gitattributes` to permanently stop CRLF churn on Windows (`core.autocrlf=true` currently).
- Optional: revisit “hero flashcard” Study UI with a more deliberate design pass (spotlight glow, blur, improved spacing) — was reverted for stability.
- Consider whether the gradient list should be exactly “20” or “24” presets (clarify source-of-truth count in `assets/flash-color-palettes.jsx`).


