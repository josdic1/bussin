import "dotenv/config";
import { z } from "zod";

const environmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3001),
  FRONTEND_URL: z.string().url().default("http://localhost:5173"),
  DATABASE_URL: z.string().min(1),
  PARENT_ACCESS_CODE: z.string().min(6).optional(),
  DRIVER_ACCESS_CODE: z.string().min(6).optional(),
});

export const config = environmentSchema.parse(process.env);
