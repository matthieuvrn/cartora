-- 067: Add plan_tier enum + column on restaurants
-- Sépare le tier acheté (FREE/STARTER/PRO) de l'état de facturation Stripe (plan_status).
-- Permet d'introduire le palier Starter 9,90 € en gardant plan_status pour l'idempotence webhook.

-- 1. Enum
CREATE TYPE plan_tier AS ENUM ('FREE', 'STARTER', 'PRO');

-- 2. Colonne sur restaurants (NOT NULL avec default — backfill ensuite)
ALTER TABLE restaurants
  ADD COLUMN plan_tier plan_tier NOT NULL DEFAULT 'FREE';

-- 3. Backfill — règles :
--    plan_status = ACTIVE   → PRO (seul tier qui existait avant l'introduction de Starter)
--    plan_status = PAST_DUE → PRO (était Pro, problème de paiement)
--    plan_status = CANCELED → FREE (subscription terminée, retombé en gratuit)
--    plan_status = FREE     → FREE (par défaut)
UPDATE restaurants SET plan_tier = 'PRO'
  WHERE plan_status IN ('ACTIVE', 'PAST_DUE');

UPDATE restaurants SET plan_tier = 'FREE'
  WHERE plan_status IN ('FREE', 'CANCELED');

-- 4. Index pour filtrage analytics éventuel
CREATE INDEX idx_restaurants_plan_tier ON restaurants(plan_tier);
