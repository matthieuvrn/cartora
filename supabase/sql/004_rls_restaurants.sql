-- Enable RLS on restaurants table
-- Users can only access their own restaurant (owner_user_id = auth.uid())

ALTER TABLE "restaurants" ENABLE ROW LEVEL SECURITY;

-- SELECT: owner can read their own restaurant
CREATE POLICY "restaurants_select_own"
  ON "restaurants"
  FOR SELECT
  USING (owner_user_id = auth.uid());

-- INSERT: owner can only create a restaurant for themselves
CREATE POLICY "restaurants_insert_own"
  ON "restaurants"
  FOR INSERT
  WITH CHECK (owner_user_id = auth.uid());

-- UPDATE: owner can only update their own restaurant
CREATE POLICY "restaurants_update_own"
  ON "restaurants"
  FOR UPDATE
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

-- DELETE: owner can only delete their own restaurant
CREATE POLICY "restaurants_delete_own"
  ON "restaurants"
  FOR DELETE
  USING (owner_user_id = auth.uid());
