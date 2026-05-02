import { Router, type IRouter } from "express";
import { createNewUser } from "../lib/users";

const router: IRouter = Router();

router.post("/session", async (req, res): Promise<void> => {
  const userId = await createNewUser();
  req.log.info({ userId }, "session_created");
  res.status(201).json({ userId });
});

export default router;
