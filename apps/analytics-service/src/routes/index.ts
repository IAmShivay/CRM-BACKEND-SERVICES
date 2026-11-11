import { Router } from "express";
import { getLeadSources, getTimeseries } from "../controllers/insightsController";
import { z } from "zod";
import { verifyToken, requirePermission } from "@crm-platform/auth-middleware";
import { validateQuery } from "../middleware/validate";
import {
  workspaceIdSchema,
  mongoIdSchema,
} from "@crm-platform/shared-types";
import {
  getDashboardStats,
  getLeadsBySource,
  getTeamPerformance,
} from "../controllers/dashboardController";
import {
  getRevenueForecast,
  getWinRateForecast,
} from "../controllers/forecastController";
import {
  getPipelineAnalytics,
  getConversionRates,
  getDealVelocity,
} from "../controllers/pipelineController";
import {
  getLeadsTimeseries,
  getDealsTimeseries,
  getRevenueTimeseries,
} from "../controllers/timeseriesController";
import {
  getMetrics,
  getActivityMetrics,
} from "../controllers/metricsController";

const workspaceQuery = z.object({
  workspaceId: workspaceIdSchema,
});

const pipelineQuery = z.object({
  workspaceId: workspaceIdSchema,
  pipelineId: mongoIdSchema.optional(),
});

const timeseriesQuery = z.object({
  workspaceId: workspaceIdSchema,
  period: z.string().optional(),
});

const forecastQuery = z.object({
  workspaceId: workspaceIdSchema,
  months: z.coerce.number().min(1).max(24).optional(),
});

const activityMetricsQuery = z.object({
  workspaceId: workspaceIdSchema,
  days: z.coerce.number().min(1).max(365).optional(),
});

const router = Router();

router.get("/analytics/lead-sources", verifyToken, requirePermission("analytics.view"), getLeadSources);
router.get("/analytics/timeseries", verifyToken, requirePermission("analytics.view"), getTimeseries);
router.get("/analytics/dashboard", verifyToken, requirePermission("analytics.view"), validateQuery(workspaceQuery), getDashboardStats);
router.get("/analytics/dashboard/sources", verifyToken, requirePermission("analytics.view"), validateQuery(workspaceQuery), getLeadsBySource);
router.get("/analytics/performance", verifyToken, requirePermission("analytics.view"), validateQuery(workspaceQuery), getTeamPerformance);

router.get("/analytics/forecast/revenue", verifyToken, requirePermission("analytics.view"), validateQuery(forecastQuery), getRevenueForecast);
router.get("/analytics/forecast/win-rate", verifyToken, requirePermission("analytics.view"), validateQuery(workspaceQuery), getWinRateForecast);

router.get("/analytics/pipeline", verifyToken, requirePermission("analytics.view"), validateQuery(pipelineQuery), getPipelineAnalytics);
router.get("/analytics/pipeline/conversion", verifyToken, requirePermission("analytics.view"), validateQuery(workspaceQuery), getConversionRates);
router.get("/analytics/pipeline/velocity", verifyToken, requirePermission("analytics.view"), validateQuery(workspaceQuery), getDealVelocity);

router.get("/analytics/timeseries/leads", verifyToken, requirePermission("analytics.view"), validateQuery(timeseriesQuery), getLeadsTimeseries);
router.get("/analytics/timeseries/deals", verifyToken, requirePermission("analytics.view"), validateQuery(timeseriesQuery), getDealsTimeseries);
router.get("/analytics/timeseries/revenue", verifyToken, requirePermission("analytics.view"), validateQuery(timeseriesQuery), getRevenueTimeseries);

router.get("/metrics", verifyToken, requirePermission("analytics.view"), validateQuery(workspaceQuery), getMetrics);
router.get("/metrics/activities", verifyToken, requirePermission("analytics.view"), validateQuery(activityMetricsQuery), getActivityMetrics);

export default router;
