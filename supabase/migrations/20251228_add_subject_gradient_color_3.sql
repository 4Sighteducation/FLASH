-- Add optional 3rd gradient stop for subject gradients
-- Note: app must be updated to read/write this column (and to render 3-stop gradients).

ALTER TABLE public.user_subjects
ADD COLUMN IF NOT EXISTS gradient_color_3 text;


