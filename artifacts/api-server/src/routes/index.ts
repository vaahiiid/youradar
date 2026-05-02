import { Router, type IRouter } from "express";
import healthRouter from "./health";
import instagramRouter from "./instagram";
import authRouter from "./auth";
import sourcesRouter from "./sources";
import notificationsRouter from "./notifications";
import privacyRouter from "./privacy";
import oauthRouter from "./oauth";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/instagram", instagramRouter);
router.use("/auth", authRouter);
router.use("/sources", sourcesRouter);
router.use("/notifications", notificationsRouter);
router.use("/privacy", privacyRouter);
router.use("/oauth", oauthRouter);

export default router;
