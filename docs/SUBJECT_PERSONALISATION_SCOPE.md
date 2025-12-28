# Subject personalisation (Premium/Pro) — scope

## Goal
Let Premium/Pro users personalise each subject with an **emoji or image** in addition to the existing **color/gradient**.

## Proposed UX
- **Where**
  - Subject “card” on `HomeScreen` (tile header area)
  - Subject rows in libraries (e.g. `PastPapersLibraryScreen`) where subject color/gradient is already used
  - Optional: subject header areas (Topic lists, Study entry points)

- **How it looks**
  - **Emoji mode** (lowest effort):
    - A single emoji (e.g. 🧪 / 🧠) rendered in a small circular badge (24–32px) on the subject tile.
    - Uses the existing color/gradient background; emoji badge has a subtle dark surface behind it for legibility.
  - **Image mode** (more powerful):
    - A small square/circle image (e.g. 32–44px) clipped with rounded corners.
    - Always drawn with a thin neon border matching the subject color, so it feels native to the theme.

- **Gating**
  - **Free**: can view icons if already set, but cannot edit; tapping shows upgrade prompt.
  - **Premium/Pro**: can set emoji or image.

## Data model options
### Option A (recommended): extend `user_subjects`
Add columns:
- `icon_type text` — enum-ish: `none | emoji | image`
- `icon_emoji text` — stores the emoji string
- `icon_image_url text` — stores a public (or signed) URL to the uploaded image
- `icon_updated_at timestamptz`

Pros:
- Per-user personalisation fits `user_subjects` perfectly.
- No new table needed.

### Option B: new `user_subject_icons` table
If you want to keep `user_subjects` minimal:
- `user_id uuid`, `subject_id text`, `icon_type`, `emoji`, `image_url`, `updated_at`

Pros:
- Clean separation, easier to evolve.
Cons:
- More joins everywhere you render subjects.

## Storage / upload flow (image mode)
- Use Supabase Storage bucket: `subject-icons`
- Path format: `user_id/subject_id/{timestamp}.jpg`
- Store the resulting URL in `user_subjects.icon_image_url`

Notes:
- Prefer resizing client-side before upload (e.g. 256x256 WEBP/JPEG).
- Keep file size small (<200KB) for fast Home load.

## UI work (suggested)
- Add a new **“Icon”** section inside `ColorPickerScreen` (or rename to “Appearance” screen):
  - Emoji picker (simple text input + quick list of common icons)
  - “Upload image” button (Expo Image Picker)
  - Preview row
  - Save writes to `user_subjects`

## Estimated effort
- **Emoji only**: ~0.5–1 day (UI + DB migration + render on Home).
- **Emoji + Image**: ~1–2 days (storage, permissions, upload, caching, edge cases).

## Open questions
- Should the icon be **per subject globally**, or **per user per subject**? (This doc assumes per-user.)
- Do we want to allow **both** emoji + image, or enforce one?
- Should images be **public** or **signed URLs** (more secure but extra complexity/caching)?


