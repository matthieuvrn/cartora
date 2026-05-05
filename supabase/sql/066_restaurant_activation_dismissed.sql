-- 066: Track when the onboarding activation checklist was dismissed
-- Nullable; null = checklist still relevant (default for all existing rows).

ALTER TABLE restaurants
  ADD COLUMN activation_dismissed_at TIMESTAMPTZ;
