import cors from "cors";
import express from "express";
import { config } from "./config.js";
import { healthRouter } from "./modules/health/health.routes.js";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: config.FRONTEND_URL,
      methods: ["GET", "POST", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "x-parent-code", "x-driver-code"],
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use("/api/health", healthRouter);

  return app;
}

