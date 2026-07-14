import { databasePool } from "../../db/pool.js";

export type ActiveTripRow = {
  trip_id: string;
  started_at: Date;
  driver_message: string | null;
  latitude: number | null;
  longitude: number | null;
  recorded_at: Date | null;
};

const activeTripQuery = `
  SELECT
    trip.id AS trip_id,
    trip.started_at,
    trip.driver_message,
    latest_location.latitude,
    latest_location.longitude,
    latest_location.recorded_at
  FROM trips AS trip
  LEFT JOIN LATERAL (
    SELECT
      location.latitude,
      location.longitude,
      location.recorded_at
    FROM trip_locations AS location
    WHERE location.trip_id = trip.id
    ORDER BY location.recorded_at DESC
    LIMIT 1
  ) AS latest_location ON true
  WHERE trip.stopped_at IS NULL
  LIMIT 1
`;

export async function findActiveTrip() {
  const result = await databasePool.query<ActiveTripRow>(activeTripQuery);
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
