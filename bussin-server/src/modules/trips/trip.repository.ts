import type { DriverLocationUpdate } from "@bussin/shared";
import { databasePool } from "../../db/pool.js";

export type ActiveTripRow = {
  trip_id: string;
  started_at: Date;
  driver_message: string | null;
  latitude: number | null;
  longitude: number | null;
  recorded_at: Date | null;
  received_at: Date | null;
};

const activeTripQuery = `
  SELECT
    trip.id AS trip_id,
    trip.started_at,
    trip.driver_message,
    latest_location.latitude,
    latest_location.longitude,
    latest_location.recorded_at,
    latest_location.received_at
  FROM trips AS trip
  LEFT JOIN LATERAL (
    SELECT
      location.latitude,
      location.longitude,
      location.recorded_at,
      location.received_at
    FROM trip_locations AS location
    WHERE location.trip_id = trip.id
    ORDER BY location.received_at DESC
    LIMIT 1
  ) AS latest_location ON true
  WHERE trip.stopped_at IS NULL
  LIMIT 1
`;

export async function findActiveTrip() {
  const result = await databasePool.query<ActiveTripRow>(
    activeTripQuery,
  );

  return result.rows[0] ?? null;
}

export async function startActiveTrip() {
  await databasePool.query(`
    INSERT INTO trips DEFAULT VALUES
    ON CONFLICT DO NOTHING
  `);

  return findActiveTrip();
}

export async function stopActiveTrip() {
  const result = await databasePool.query<{
    trip_id: string;
  }>(`
    UPDATE trips
    SET
      stopped_at = now(),
      updated_at = now()
    WHERE stopped_at IS NULL
    RETURNING id AS trip_id
  `);

  return result.rows[0]?.trip_id ?? null;
}

export async function saveActiveTripLocation(
  location: DriverLocationUpdate,
) {
  const result = await databasePool.query<{
    location_id: string;
  }>(
    `
      INSERT INTO trip_locations (
        trip_id,
        latitude,
        longitude,
        accuracy_meters,
        heading_degrees,
        speed_meters_per_second,
        recorded_at
      )
      SELECT
        trip.id,
        $1,
        $2,
        $3,
        $4,
        $5,
        $6
      FROM trips AS trip
      WHERE trip.stopped_at IS NULL
      ON CONFLICT (trip_id, recorded_at)
      DO UPDATE SET
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        accuracy_meters = EXCLUDED.accuracy_meters,
        heading_degrees = EXCLUDED.heading_degrees,
        speed_meters_per_second =
          EXCLUDED.speed_meters_per_second,
        received_at = now()
      RETURNING id AS location_id
    `,
    [
      location.latitude,
      location.longitude,
      location.accuracyMeters,
      location.headingDegrees,
      location.speedMetersPerSecond,
      location.recordedAt,
    ],
  );

  return result.rows[0]?.location_id ?? null;
}
