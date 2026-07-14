import { z } from "zod";

export const tripStatusSchema = z.enum([
  "NOT_SHARING",
  "SHARING",
  "STALE",
]);

export const parentTripViewSchema = z.object({
  status: tripStatusSchema,
  location: z
    .object({
      latitude: z.number(),
      longitude: z.number(),
      recordedAt: z.iso.datetime(),
      ageSeconds: z.number().nonnegative(),
    })
    .nullable(),
  driverMessage: z.string().nullable(),
});

export type TripStatus = z.infer<typeof tripStatusSchema>;
export type ParentTripView = z.infer<typeof parentTripViewSchema>;

