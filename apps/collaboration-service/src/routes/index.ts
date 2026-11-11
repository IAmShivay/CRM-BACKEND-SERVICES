import { Router } from "express";
import chatRoutes from "./chat.routes";
import messagesRoutes from "./messages.routes";
import projectsRoutes from "./projects.routes";
import tasksRoutes from "./tasks.routes";
import sprintsRoutes from "./sprints.routes";
import columnsRoutes from "./columns.routes";
import meetingsRoutes from "./meetings.routes";
import documentsRoutes from "./documents.routes";
import notificationsRoutes from "./notifications.routes";
import calendarRoutes from "./calendar.routes";
import commentsRoutes from "./comments.routes";
import callsRoutes from "./calls.routes";
import pushRoutes from "./push.routes";

const router = Router();

router.use("/chat", chatRoutes);
router.use("/chat/messages", messagesRoutes);
router.use("/projects", projectsRoutes);
router.use("/tasks", tasksRoutes);
router.use("/sprints", sprintsRoutes);
router.use("/columns", columnsRoutes);
router.use("/meetings", meetingsRoutes);
router.use("/documents", documentsRoutes);
router.use("/notifications", notificationsRoutes);
router.use("/calendar", calendarRoutes);
router.use("/comments", commentsRoutes);
router.use("/calls", callsRoutes);
router.use("/push", pushRoutes);

export default router;
