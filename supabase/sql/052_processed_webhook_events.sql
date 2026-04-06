-- Idempotency table for Stripe webhook events.
-- Prevents duplicate processing of the same Stripe event.
-- No restaurant_id FK: this is infrastructure-level, not tenant-scoped.

CREATE TABLE processed_webhook_events (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    stripe_event_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    processed_at TIMESTAMP(3),
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT processed_webhook_events_pkey PRIMARY KEY (id)
);

CREATE UNIQUE INDEX processed_webhook_events_stripe_event_id_key
  ON processed_webhook_events(stripe_event_id);

-- RLS activé sans policies = deny all pour anon/authenticated.
-- Le service role (Prisma) bypass RLS.
ALTER TABLE processed_webhook_events ENABLE ROW LEVEL SECURITY;
