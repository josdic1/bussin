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

export const parentTripViewSchema = z.object({
  status: tripStatusSchema,
  location: tripLocationViewSchema.nullable(),
  driverMessage: z.string().nullable(),
});

export const driverTripViewSchema = z.object({
  status: tripStatusSchema,
  tripId: z.uuid().nullable(),
  startedAt: z.iso.datetime().nullable(),
  location: tripLocationViewSchema.nullable(),
  driverMessage: z.string().nullable(),
});

export type TripStatus = z.infer<typeof tripStatusSchema>;
export type TripLocationView = z.infer<typeof tripLocationViewSchema>;
export type ParentTripView = z.infer<typeof parentTripViewSchema>;
export type DriverTripView = z.infer<typeof driverTripViewSchema>;
