import { z } from "zod";
import {
  coordinateSchema,
  driverLocationUpdateSchema,
} from "@bussin/shared";
import {
  Router,
  type RequestHandler,
} from "express";
import {
  requireDriverAccess,
  requireParentAccess,
} from "../../auth/access.js";
import { getDrivingEstimate } from "../routing/openrouteservice.js";
import {
  getDriverTrip,
  getParentTrip,
  recordDriverLocation,
  setDriverMessage,
  startTrip,
  stopTrip,
} from "./trip.service.js";

function sendResult(
  operation: () => Promise<unknown>,
): RequestHandler {
  return (_request, response, next) => {
    operation()
      .then((result) => response.json(result))
      .catch(next);
  };
}

export const driverTripRouter = Router();

driverTripRouter.use(requireDriverAccess);
driverTripRouter.get("/", sendResult(getDriverTrip));
driverTripRouter.post("/start", sendResult(startTrip));
driverTripRouter.post("/stop", sendResult(stopTrip));

driverTripRouter.post(
  "/location",
  async (request, response, next) => {
    try {
      const parsedLocation =
        driverLocationUpdateSchema.safeParse(request.body);

      if (!parsedLocation.success) {
        response.status(400).json({
          error: "The location update is invalid.",
          issues: parsedLocation.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        });
        return;
      }

      const trip = await recordDriverLocation(
        parsedLocation.data,
      );

      if (!trip) {
        response.status(409).json({
          error:
            "Location cannot be recorded because no trip is active.",
        });
        return;
      }

      response.json(trip);
    } catch (error) {
      next(error);
    }
  },
);


const driverMessageSchema = z.object({
  message: z.string().trim().max(160).nullable(),
});

driverTripRouter.post(
  "/message",
  async (request, response, next) => {
    try {
      const parsedMessage =
        driverMessageSchema.safeParse(request.body);

      if (!parsedMessage.success) {
        response.status(400).json({
          error: "The driver message is invalid.",
        });
        return;
      }

      const normalizedMessage =
        parsedMessage.data.message?.trim() || null;

      const trip = await setDriverMessage(normalizedMessage);

      if (!trip) {
        response.status(409).json({
          error:
            "A message cannot be sent because no trip is active.",
        });
        return;
      }

      response.json(trip);
    } catch (error) {
      next(error);
    }
  },
);

export const parentTripRouter = Router();

parentTripRouter.get(
  "/",
  requireParentAccess,
  sendResult(getParentTrip),
);

parentTripRouter.post(
  "/travel-estimate",
  requireParentAccess,
  async (request, response, next) => {
    try {
      const location = coordinateSchema.safeParse(request.body);

      if (!location.success) {
        response.status(400).json({
          error: "The parent location is invalid.",
        });
        return;
      }

      const estimate = await getDrivingEstimate(location.data);

      response.json({
        durationSeconds: estimate.durationSeconds,
        distanceMeters: estimate.distanceMeters,
        calculatedAt: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  },
);
