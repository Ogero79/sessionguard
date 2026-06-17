import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env";
import { errorHandler } from "./middleware/errorHandler";
import authRoutes from "./routes/auth.routes";
import sessionRoutes from "./routes/session.routes";
import riskRoutes from "./routes/risk.routes";
import experimentRoutes from "./routes/experiment.routes";
import userRoutes from "./routes/user.routes";

const app = express();

app.use(helmet());
const allowedOrigins = env.CORS_ORIGIN ? env.CORS_ORIGIN.split(",").map(o => o.trim()) : [];
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like curl, postman, or server-to-server)
      if (!origin) return callback(null, true);

      const isAllowed =
        allowedOrigins.includes(origin) ||
        allowedOrigins.includes(origin.replace(/\/$/, "")) ||
        /^http:\/\/localhost(:\d+)?$/.test(origin) ||
        /^http:\/\/127\.0\.0\.1(:\d+)?$/.test(origin);

      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(morgan("short"));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/api/session", sessionRoutes);
app.use("/api/risk", riskRoutes);
app.use("/api/experiment", experimentRoutes);
app.use("/api/user", userRoutes);

app.use(errorHandler);

export default app;
