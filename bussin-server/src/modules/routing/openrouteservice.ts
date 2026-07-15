import { z } from "zod";
import { config } from "../../config.js";

const destinationSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  address: z.string(),
});

const geocodingResponseSchema = z.object({
  features: z
    .array(
      z.object({
        geometry: z.object({
          coordinates: z.tuple([
            z.number(),
            z.number(),
          ]),
        }),
      }),
    )
    .min(1),
});

const directionsResponseSchema = z.object({
  features: z
    .array(
      z.object({
        geometry: z.object({
          type: z.literal("LineString"),
          coordinates: z
            .array(z.tuple([z.number(), z.number()]))
            .min(2),
        }),
        properties: z.object({
          summary: z.object({
            distance: z.number().nonnegative(),
            duration: z.number().nonnegative(),
          }),
        }),
      }),
    )
    .min(1),
});

export type Destination = z.infer<typeof destinationSchema>;

export type DrivingEstimate = {
  durationSeconds: number;
  distanceMeters: number;
  destination: Destination;
  route: Array<{
    latitude: number;
    longitude: number;
  }>;
};

let destinationPromise: Promise<Destination> | null = null;

async function geocodeJccDestination() {
  const url = new URL(
    "https://api.openrouteservice.org/geocode/search",
  );

  url.searchParams.set(
    "api_key",
    config.OPENROUTESERVICE_API_KEY,
  );
  url.searchParams.set("text", config.JCC_ADDRESS);
  url.searchParams.set("size", "1");

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `JCC geocoding failed with HTTP ${response.status}.`,
    );
  }

  const body = geocodingResponseSchema.parse(
    await response.json(),
  );

  const [longitude, latitude] =
    body.features[0].geometry.coordinates;

  return destinationSchema.parse({
    latitude,
    longitude,
    address: config.JCC_ADDRESS,
  });
}

export function getJccDestination() {
  destinationPromise ??= geocodeJccDestination();
  return destinationPromise;
}

export async function getDrivingEstimate(
  origin: {
    latitude: number;
    longitude: number;
  },
): Promise<DrivingEstimate> {
  const destination = await getJccDestination();

  const response = await fetch(
    "https://api.openrouteservice.org/v2/directions/driving-car/geojson",
    {
      method: "POST",
      headers: {
        Authorization: config.OPENROUTESERVICE_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        coordinates: [
          [origin.longitude, origin.latitude],
          [
            destination.longitude,
            destination.latitude,
          ],
        ],
      }),
    },
  );

  if (!response.ok) {
    throw new Error(
      `Driving ETA request failed with HTTP ${response.status}.`,
    );
  }

  const body = directionsResponseSchema.parse(
    await response.json(),
  );

  const feature = body.features[0];
  const summary = feature.properties.summary;

  const route = feature.geometry.coordinates.map(
    ([longitude, latitude]) => ({
      latitude,
      longitude,
    }),
  );

  return {
    durationSeconds: summary.duration,
    distanceMeters: summary.distance,
    destination,
    route,
  };
}
