import { z } from "zod";

export const tripStatusSchema = z.enum([
  "NOT_SHARING",
  "SHARING",
  "STALE",
]);

export const tripLocationViewSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  recordedAt: z.iso.datetime(),
  ageSeconds: z.number().nonnegative(),
});

export const routeCoordinateSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const arrivalEstimateSchema = z.object({
  durationSeconds: z.number().nonnegative(),
  distanceMeters: z.number().nonnegative(),
  calculatedAt: z.iso.datetime(),
  destination: z.object({
    address: z.string(),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }),
  route: z.array(routeCoordinateSchema).default([]),
});

export const parentTripViewSchema = z.object({
  status: tripStatusSchema,
  location: tripLocationViewSchema.nullable(),
  driverMessage: z.string().nullable(),
  arrivalEstimate: arrivalEstimateSchema.nullable().default(null),
});

export const driverTripViewSchema = z.object({
  status: tripStatusSchema,
  tripId: z.uuid().nullable(),
  startedAt: z.iso.datetime().nullable(),
  location: tripLocationViewSchema.nullable(),
  driverMessage: z.string().nullable(),
});

export type TripStatus = z.infer<typeof tripStatusSchema>;
export type TripLocationView = z.infer<
  typeof tripLocationViewSchema
>;
export type ArrivalEstimate = z.infer<
  typeof arrivalEstimateSchema
>;
export type ParentTripView = z.infer<
  typeof parentTripViewSchema
>;
export type DriverTripView = z.infer<
  typeof driverTripViewSchema
>;
