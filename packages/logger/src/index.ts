import winston from "winston";
import { Request, Response, NextFunction } from "express";
import { NODE_ENVS } from "@crm-platform/shared-types";

const SERVICE_NAME = process.env.SERVICE_NAME || "crm-service";
const LOG_LEVEL = process.env.LOG_LEVEL || "info";
const NODE_ENV = process.env.NODE_ENV || NODE_ENVS.DEVELOPMENT;

const transports: winston.transport[] = [
  new winston.transports.Console({
    format:
      NODE_ENV === NODE_ENVS.DEVELOPMENT
        ? winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        : winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          ),
  }),
];

if (NODE_ENV === NODE_ENVS.PRODUCTION) {
  transports.push(
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: "logs/combined.log",
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
    })
  );
}

export const logger = winston.createLogger({
  level: LOG_LEVEL,
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: SERVICE_NAME },
  transports,
});

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.info("HTTP Request", {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.headers["x-forwarded-for"] || "unknown",
      userAgent: req.get("user-agent"),
    });
  });

  next();
}

export default logger;
