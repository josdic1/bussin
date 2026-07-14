BEGIN;

DROP TABLE IF EXISTS trip_locations;
DROP TABLE IF EXISTS trips;

CREATE TABLE trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz NOT NULL DEFAULT now(),
  stopped_at timestamptz,
  driver_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT trips_stopped_after_started
    CHECK (stopped_at IS NULL OR stopped_at >= started_at),

  CONSTRAINT trips_driver_message_length
    CHECK (driver_message IS NULL OR char_length(driver_message) <= 500)
);

CREATE UNIQUE INDEX trips_one_active_trip
  ON trips ((stopped_at IS NULL))
  WHERE stopped_at IS NULL;

CREATE TABLE trip_locations (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  latitude double precision NOT NULL
    CHECK (latitude BETWEEN -90 AND 90),
  longitude double precision NOT NULL
    CHECK (longitude BETWEEN -180 AND 180),
  accuracy_meters double precision
    CHECK (accuracy_meters IS NULL OR accuracy_meters >= 0),
  heading_degrees double precision
    CHECK (
      heading_degrees IS NULL
      OR heading_degrees BETWEEN 0 AND 360
    ),
  speed_meters_per_second double precision
    CHECK (
      speed_meters_per_second IS NULL
      OR speed_meters_per_second >= 0
    ),
  recorded_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT trip_locations_one_recording_per_trip
    UNIQUE (trip_id, recorded_at)
);

CREATE INDEX trip_locations_latest_for_trip
  ON trip_locations (trip_id, recorded_at DESC);

COMMIT;
