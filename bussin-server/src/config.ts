import "dotenv/config";
import { z } from "zod";

const environmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3001),
  FRONTEND_URL: z.string().url().default("http://localhost:5173"),
  DATABASE_URL: z.string().min(1),
  PARENT_ACCESS_CODE: z.string().min(6).optional(),
  DRIVER_ACCESS_CODE: z.string().min(6).optional(),
  OPENROUTESERVICE_API_KEY: z.string().min(1),
  JCC_ADDRESS: z.string().min(1),
  VAPID_PUBLIC_KEY: z.string().min(1),
  VAPID_PRIVATE_KEY: z.string().min(1),
  VAPID_SUBJECT: z.string().min(1),
});

export const config = environmentSchema.parse(process.env);
