import dotenv from "dotenv";
dotenv.config();

import logger from "@crm-platform/logger";
import { connectDB, mongoose } from "@crm-platform/db";
import { SUBSCRIPTION_RECONCILE_INTERVAL_MS } from "@crm-platform/shared-types";
import app from "./app";
import { seedDefaultPlans } from "./controllers/planController";
import { reconcileAllSubscriptions } from "./services/recurringService";

const PORT = process.env.PORT || 8006;

async function start() {
  try {
    await connectDB();
    logger.info("Connected to MongoDB");
    await seedDefaultPlans();
    reconcileAllSubscriptions().catch((error) => logger.error("Initial subscription reconciliation failed", { error }));
    const reconcileTimer = setInterval(() => {
      reconcileAllSubscriptions().catch((error) => logger.error("Subscription reconciliation failed", { error }));
    }, SUBSCRIPTION_RECONCILE_INTERVAL_MS);

    const server = app.listen(PORT, () => {
      logger.info(`Billing service running on port ${PORT}`);
      logger.info(`Swagger docs available at http://localhost:${PORT}/docs`);
    });

    const shutdown = async (signal: string) => {
      logger.info(`${signal} received, starting graceful shutdown`);
      clearInterval(reconcileTimer);
      server.close(async () => {
        logger.info("HTTP server closed");
        try {
          await mongoose.connection.close();
          logger.info("MongoDB connection closed");
        } catch (err) {
          logger.error("Error closing MongoDB connection", { error: err });
        }
        process.exit(0);
      });
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  } catch (error) {
    logger.error("Failed to start billing service", { error });
    process.exit(1);
  }
}

start();
