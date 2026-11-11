import { Router } from "express";
import leadsRoutes from "./leads.routes";
import contactsRoutes from "./contacts.routes";
import dealsRoutes from "./deals.routes";
import pipelinesRoutes from "./pipelines.routes";
import activitiesRoutes from "./activities.routes";
import leadStatusesRoutes from "./leadStatuses.routes";
import tagsRoutes from "./tags.routes";
import appointmentsRoutes from "./appointments.routes";
import invoicesRoutes from "./invoices.routes";
import quotationsRoutes from "./quotations.routes";
import productsRoutes from "./products.routes";

const router = Router();

router.use("/leads", leadsRoutes);
router.use("/contacts", contactsRoutes);
router.use("/deals", dealsRoutes);
router.use("/pipelines", pipelinesRoutes);
router.use("/activities", activitiesRoutes);
router.use("/lead-statuses", leadStatusesRoutes);
router.use("/tags", tagsRoutes);
router.use("/appointments", appointmentsRoutes);
router.use("/invoices", invoicesRoutes);
router.use("/quotations", quotationsRoutes);
router.use("/products", productsRoutes);

export default router;
