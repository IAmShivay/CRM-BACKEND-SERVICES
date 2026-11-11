import dotenv from "dotenv";
dotenv.config();

import logger from "@crm-platform/logger";
import { connectDB, mongoose } from "@crm-platform/db";
import app from "./app";

const PORT = process.env.PORT || 8005;

async function start() {
  try {
    await connectDB();
    logger.info("Connected to MongoDB");

    const server = app.listen(PORT, () => {
      logger.info(`Social service running on port ${PORT}`);
      logger.info(`Swagger docs available at http://localhost:${PORT}/docs`);
    });

    const shutdown = async (signal: string) => {
      logger.info(`${signal} received, starting graceful shutdown`);
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
    logger.error("Failed to start social service", { error });
    process.exit(1);
  }
}

start();
