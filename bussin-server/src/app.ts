import cors from "cors";
import express, {
  type ErrorRequestHandler,
} from "express";
import { accessRouter } from "./auth/access.routes.js";
import { config } from "./config.js";
import { healthRouter } from "./modules/health/health.routes.js";
import { parentPushRouter } from "./modules/notifications/push.routes.js";
import {
  driverTripRouter,
  parentTripRouter,
} from "./modules/trips/trip.routes.js";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: config.FRONTEND_URL,
      methods: ["GET", "POST", "DELETE", "OPTIONS"],
      allowedHeaders: [
        "Content-Type",
        "x-parent-code",
        "x-driver-code",
      ],
    }),
  );

  app.use(express.json({ limit: "1mb" }));

  app.use("/api/health", healthRouter);
  app.use("/api/access", accessRouter);
  app.use("/api/driver/trip", driverTripRouter);
  app.use("/api/parent/trip", parentTripRouter);
  app.use("/api/parent/push", parentPushRouter);

  const errorHandler: ErrorRequestHandler = (
    error,
    _request,
    response,
    next,
  ) => {
    if (response.headersSent) {
      next(error);
      return;
    }

    console.error("Request failed:", error);

    response.status(500).json({
      error: "The server could not complete the request.",
    });
  };

  app.use(errorHandler);

  return app;
}
