import { z } from "zod";

export const coordinateSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const driverLocationUpdateSchema = coordinateSchema.extend({
  accuracyMeters: z.number().nonnegative().nullable(),
  headingDegrees: z.number().min(0).max(360).nullable(),
  speedMetersPerSecond: z.number().nonnegative().nullable(),
  recordedAt: z.iso.datetime(),
});

export type Coordinate = z.infer<typeof coordinateSchema>;
export type DriverLocationUpdate = z.infer<typeof driverLocationUpdateSchema>;

