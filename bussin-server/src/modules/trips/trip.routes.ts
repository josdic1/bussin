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

export const parentTripRouter = Router();

parentTripRouter.get(
  "/",
  requireParentAccess,
  sendResult(getParentTrip),
);
