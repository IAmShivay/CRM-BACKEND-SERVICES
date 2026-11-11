import dotenv from "dotenv";
dotenv.config();

import http from "http";
import logger from "@crm-platform/logger";
import { connectDB, mongoose } from "@crm-platform/db";
import app from "./app";
import { SOCKET_PATH } from "@crm-platform/shared-types";
import { initSocketServer, closeSocketServer } from "./socket";

const PORT = process.env.PORT || 8008;

async function start() {
  try {
    await connectDB();
    logger.info("Connected to MongoDB");

    const server = http.createServer(app);
    initSocketServer(server);

    server.listen(PORT, () => {
      logger.info(`Collaboration service running on port ${PORT}`);
      logger.info(`Swagger docs available at http://localhost:${PORT}/docs`);
      logger.info(`Socket.io listening on path ${SOCKET_PATH}`);
    });

    const shutdown = async (signal: string) => {
      logger.info(`${signal} received, starting graceful shutdown`);
      await closeSocketServer();
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
    logger.error("Failed to start collaboration service", { error });
    process.exit(1);
  }
}

start();
