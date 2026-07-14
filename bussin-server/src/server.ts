import { createApp } from "./app.js";
import { config } from "./config.js";

createApp().listen(config.PORT, () => {
  console.log(`Bussin server listening on port ${config.PORT}`);
});

