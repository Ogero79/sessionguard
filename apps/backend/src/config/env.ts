import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export const env = {
  PORT: parseInt(process.env.PORT || "4000", 10),
  DATABASE_URL: process.env.DATABASE_URL || "",
  JWT_SECRET: process.env.JWT_SECRET || "dev-secret-change-me",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "1h",
  CORS_ORIGIN: process.env.CORS_ORIGIN || "http://localhost:3000",
  ML_SERVICE_URL: process.env.ML_SERVICE_URL || "http://localhost:8000",
  NODE_ENV: process.env.NODE_ENV || "development",
} as const;
