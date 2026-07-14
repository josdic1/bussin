import { Router } from "express";
import { verifyDatabaseConnection } from "../../db/pool.js";

export const healthRouter = Router();

healthRouter.get("/", async (_request, response) => {
  try {
    const database = await verifyDatabaseConnection();

    response.json({
      ok: true,
      service: "bussin-server",
      database: database.database,
      databaseUser: database.user_name,
    });
  } catch (error) {
    console.error("Health check failed:", error);

    response.status(503).json({
      ok: false,
      service: "bussin-server",
      database: "unavailable",
    });
  }
});
