-- Prepare menu_public_snapshots for anonymous public reads (/m/[slug]).
--
-- Changes:
--   1. Add slug column (unique) — direct lookup without joining restaurants
--   2. Add published_at column — controls anon visibility via RLS
--   3. Make restaurant_id unique — 1 active snapshot per restaurant (MVP)
--   4. Drop the now-redundant restaurant_id index (unique constraint covers it)

-- 1) slug — TEXT, UNIQUE, NOT NULL
ALTER TABLE "menu_public_snapshots"
  ADD COLUMN "slug" TEXT NOT NULL;

CREATE UNIQUE INDEX "menu_public_snapshots_slug_key"
  ON "menu_public_snapshots"("slug");

-- 2) published_at — nullable timestamp (NULL = not yet published / draft)
ALTER TABLE "menu_public_snapshots"
  ADD COLUMN "published_at" TIMESTAMP(3);

-- 3) restaurant_id → UNIQUE (1 snapshot per restaurant)
DROP INDEX IF EXISTS "menu_public_snapshots_restaurant_id_idx";

CREATE UNIQUE INDEX "menu_public_snapshots_restaurant_id_key"
  ON "menu_public_snapshots"("restaurant_id");
