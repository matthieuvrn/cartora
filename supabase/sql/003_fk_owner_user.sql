-- Link restaurants.owner_user_id to auth.users with cascade delete
-- When a Supabase Auth user is deleted, their restaurant (and all child data) is removed automatically.

ALTER TABLE "restaurants"
  ADD CONSTRAINT "restaurants_owner_user_id_fkey"
  FOREIGN KEY ("owner_user_id")
  REFERENCES auth.users("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;