-- Allow anonymous (unauthenticated) reads on published snapshots.
-- This is the foundation for /m/[slug] — public menu pages.
--
-- Only rows where published_at IS NOT NULL are visible.
-- Owner CRUD policies (from 005_rls_cascade.sql) remain unchanged.

CREATE POLICY "snapshots_anon_select_published" ON menu_public_snapshots
  FOR SELECT TO anon
  USING (published_at IS NOT NULL);
