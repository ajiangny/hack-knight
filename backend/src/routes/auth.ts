// Admin identity. Sign-in itself happens in the browser against Supabase
// Auth (Google provider); the backend only verifies the resulting token and
// reports who it belongs to.

import { Router, Request, Response } from "express";
import { authenticateAdmin } from "../middleware/auth.js";

const authRouter: Router = Router();

// GET /api/auth/me  (admin) — identity for the dashboard header. Reaching
// this route at all means the token verified and the email is allowlisted.
authRouter.get("/me", authenticateAdmin, (req: Request, res: Response) => {
  const { email, name, avatar_url } = req.adminUser!;
  res.json({ email, name, avatar_url });
});

export default authRouter;
