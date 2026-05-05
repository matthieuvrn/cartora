-- Add per-item photo columns.
-- image_path stores the path inside the item-images bucket (e.g. "<restaurantId>/<itemId>.webp").
-- alt_text_fr / alt_text_en are accessibility descriptions (WCAG 2.2 / EAA 2025).
-- All three are nullable: the photo is optional per item.

ALTER TABLE items
  ADD COLUMN image_path  TEXT,
  ADD COLUMN alt_text_fr TEXT,
  ADD COLUMN alt_text_en TEXT;
