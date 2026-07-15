import {
  arrivalEstimateSchema,
  type ArrivalEstimate,
  type Coordinate,
} from "@bussin/shared";
import { getDrivingEstimate } from "./openrouteservice.js";

const ETA_CACHE_MILLISECONDS = 30_000;

let cachedEstimate: ArrivalEstimate | null = null;
let cacheExpiresAt = 0;
let pendingEstimate: Promise<ArrivalEstimate> | null = null;

export async function getArrivalEstimate(
  origin: Coordinate,
): Promise<ArrivalEstimate> {
  const now = Date.now();

  if (cachedEstimate && now < cacheExpiresAt) {
    return cachedEstimate;
  }

  if (pendingEstimate) {
    return pendingEstimate;
  }

  pendingEstimate = getDrivingEstimate(origin).then(
    (estimate) => {
      const arrivalEstimate = arrivalEstimateSchema.parse({
        durationSeconds: estimate.durationSeconds,
        distanceMeters: estimate.distanceMeters,
        calculatedAt: new Date().toISOString(),
        destination: estimate.destination,
      });

      cachedEstimate = arrivalEstimate;
      cacheExpiresAt =
        Date.now() + ETA_CACHE_MILLISECONDS;

      return arrivalEstimate;
    },
  );

  try {
    return await pendingEstimate;
  } finally {
    pendingEstimate = null;
  }
}
