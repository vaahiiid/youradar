import { Router, type IRouter } from "express";
import { requireUser } from "../middlewares/auth";

const router: IRouter = Router();

// Returns the authenticated user's id. Used by clients to confirm session
// validity and for diagnostic purposes. The actual session is established by
// Clerk on the client (Authorization: Bearer <token> for mobile, __session
// cookie for web).
router.get("/me", requireUser, (req, res): void => {
  res.json({ userId: req.userId });
});

export default router;
