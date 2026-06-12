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

const app = express();

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("short"));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/api/session", sessionRoutes);
app.use("/api/risk", riskRoutes);
app.use("/api/experiment", experimentRoutes);

app.use(errorHandler);

export default app;
