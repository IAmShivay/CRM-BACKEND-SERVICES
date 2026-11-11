import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import crypto from "crypto";
import swaggerUi from "swagger-ui-express";
import { requestLogger } from "@crm-platform/logger";
import { mongoose } from "@crm-platform/db";
import { errorHandler } from "./middleware/errorHandler";
import { swaggerSpec } from "./swagger";
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import roleRoutes from "./routes/role.routes";
import workspaceRoutes from "./routes/workspace.routes";
import inviteRoutes from "./routes/invite.routes";
import onboardingRoutes from "./routes/onboarding.routes";
import referralRoutes from "./routes/referral.routes";

const app = express();

app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));

app.use((req, _res, next) => {
  req.headers["x-correlation-id"] =
    (req.headers["x-correlation-id"] as string) || crypto.randomUUID();
  next();
});

app.use(requestLogger);

app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get("/api/health", (_req, res) => {
  const dbState = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
  res.json({ status: "ok", service: "auth-service", uptime: process.uptime(), db: dbState });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/workspaces", workspaceRoutes);
app.use("/api/invites", inviteRoutes);
app.use("/api/onboarding", onboardingRoutes);
app.use("/api/referrals", referralRoutes);

app.use(errorHandler);

export default app;
