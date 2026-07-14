import { driverLocationUpdateSchema } from "@bussin/shared";
import {
  Router,
  type RequestHandler,
} from "express";
import {
  requireDriverAccess,
  requireParentAccess,
} from "../../auth/access.js";
import {
  getDriverTrip,
  getParentTrip,
  recordDriverLocation,
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

export const parentTripRouter = Router();

parentTripRouter.get(
  "/",
  requireParentAccess,
  sendResult(getParentTrip),
);
