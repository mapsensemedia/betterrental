-- P2: Add unique constraint on stripe_webhook_events.event_id for race-safe idempotency
ALTER TABLE public.stripe_webhook_events
  ADD CONSTRAINT stripe_webhook_events_event_id_unique UNIQUE (event_id);
