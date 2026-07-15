import {
  driverTripViewSchema,
  parentTripViewSchema,
  type ArrivalEstimate,
  type DriverLocationUpdate,
  type DriverTripView,
  type ParentTripView,
  type TripLocationView,
  type TripStatus,
} from "@bussin/shared";
import { getArrivalEstimate } from "../routing/eta.service.js";
import {
  findActiveTrip,
  saveActiveTripLocation,
  startActiveTrip,
  stopActiveTrip,
  type ActiveTripRow,
} from "./trip.repository.js";

const LOCATION_STALE_AFTER_SECONDS = 30;

function getLocation(
  row: ActiveTripRow,
): TripLocationView | null {
  if (
    row.latitude === null ||
    row.longitude === null ||
    row.recorded_at === null ||
    row.received_at === null
  ) {
    return null;
  }

  const ageSeconds = Math.max(
    0,
    (Date.now() - row.received_at.getTime()) / 1000,
  );

  return {
    latitude: row.latitude,
    longitude: row.longitude,
    recordedAt: row.recorded_at.toISOString(),
    ageSeconds,
  };
}

function getSharingStatus(
  location: TripLocationView | null,
): TripStatus {
  if (
    location &&
    location.ageSeconds > LOCATION_STALE_AFTER_SECONDS
  ) {
    return "STALE";
  }

  return "SHARING";
}

function toDriverTripView(
  row: ActiveTripRow | null,
): DriverTripView {
  if (!row) {
    return driverTripViewSchema.parse({
      status: "NOT_SHARING",
      tripId: null,
      startedAt: null,
      location: null,
      driverMessage: null,
    });
  }

  const location = getLocation(row);

  return driverTripViewSchema.parse({
    status: getSharingStatus(location),
    tripId: row.trip_id,
    startedAt: row.started_at.toISOString(),
    location,
    driverMessage: row.driver_message,
  });
}

function toParentTripView(
  row: ActiveTripRow | null,
  arrivalEstimate: ArrivalEstimate | null,
): ParentTripView {
  if (!row) {
    return parentTripViewSchema.parse({
      status: "NOT_SHARING",
      location: null,
      driverMessage: null,
      arrivalEstimate: null,
    });
  }

  const location = getLocation(row);

  return parentTripViewSchema.parse({
    status: getSharingStatus(location),
    location,
    driverMessage: row.driver_message,
    arrivalEstimate,
  });
}

export async function getDriverTrip() {
  return toDriverTripView(await findActiveTrip());
}

export async function getParentTrip() {
  const row = await findActiveTrip();

  if (!row) {
    return toParentTripView(null, null);
  }

  const location = getLocation(row);

  if (
    !location ||
    getSharingStatus(location) !== "SHARING"
  ) {
    return toParentTripView(row, null);
  }

  try {
    const arrivalEstimate =
      await getArrivalEstimate(location);

    return toParentTripView(row, arrivalEstimate);
  } catch (error) {
    console.error("Bus ETA calculation failed:", error);
    return toParentTripView(row, null);
  }
}

export async function startTrip() {
  return toDriverTripView(await startActiveTrip());
}

export async function stopTrip() {
  await stopActiveTrip();
  return getDriverTrip();
}

export async function recordDriverLocation(
  location: DriverLocationUpdate,
) {
  const locationId = await saveActiveTripLocation(location);

  if (!locationId) {
    return null;
  }

  return getDriverTrip();
}
