BEGIN;

CREATE TABLE IF NOT EXISTS parent_push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth_secret text NOT NULL,
  travel_minutes smallint NOT NULL
    CHECK (travel_minutes BETWEEN 1 AND 180),
  cushion_minutes smallint NOT NULL DEFAULT 5
    CHECK (cushion_minutes BETWEEN 0 AND 60),
  enabled boolean NOT NULL DEFAULT true,
  last_notified_trip_id uuid
    REFERENCES trips(id)
    ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS
  parent_push_subscriptions_enabled
  ON parent_push_subscriptions (enabled)
  WHERE enabled = true;

COMMIT;
