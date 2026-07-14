import { once } from "node:events";
import { createApp } from "./app.js";
import { config } from "./config.js";
import {
  databasePool,
  verifyDatabaseConnection,
} from "./db/pool.js";

async function startServer() {
  const database = await verifyDatabaseConnection();
  const server = createApp().listen(config.PORT);

  await once(server, "listening");

  console.log(
    `Bussin server listening on port ${config.PORT}; connected to ${database.database}`,
  );

  async function stopServer(signal: string) {
    console.log(`${signal} received; stopping Bussin server.`);

    server.close(async () => {
      await databasePool.end();
      process.exit(0);
    });
  }

  process.on("SIGTERM", () => void stopServer("SIGTERM"));
  process.on("SIGINT", () => void stopServer("SIGINT"));
}

startServer().catch(async (error) => {
  console.error("Bussin server failed to start:", error);
  await databasePool.end();
  process.exit(1);
});
