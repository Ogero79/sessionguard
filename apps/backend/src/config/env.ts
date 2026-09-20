import dotenv from "dotenv";
import path from "path";
import { z } from "zod";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().default(""),
  JWT_SECRET: z.string().default("dev-secret-change-me"),
  JWT_EXPIRES_IN: z.string().default("1h"),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  ML_SERVICE_URL: z.string().url().default("http://localhost:8000"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:", JSON.stringify(parsed.error.format(), null, 2));
  process.exit(1);
}

const rawEnv = parsed.data;

// Production security guardrails
if (rawEnv.NODE_ENV === "production") {
  if (!rawEnv.DATABASE_URL) {
    console.error("❌ [FATAL] DATABASE_URL is required in production environment.");
    process.exit(1);
  }
  if (rawEnv.JWT_SECRET === "dev-secret-change-me" || rawEnv.JWT_SECRET.length < 16) {
    console.error("❌ [FATAL] Insecure JWT_SECRET detected. Production deployments must specify a strong secret (min 16 characters).");
    process.exit(1);
  }
}

export const env = rawEnv;
