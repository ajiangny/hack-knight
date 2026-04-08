import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

interface LoginRequestBody {
  password: string;
}

const authRouter: Router = Router();

// Login
authRouter.post(
  "/login",
  async (req: Request<{}, {}, LoginRequestBody>, res: Response) => {
    if (!req.body.password) {
      res.status(400).json({ message: "Password is required" });
      return;
    }

    const hash = process.env.ADMIN_PASSWORD_HASH;
    const secret = process.env.JWT_SECRET;

    if (!hash || !secret) {
      res.status(500).json({ message: "Server misconfiguration" });
      return;
    }

    const isCorrectPassword = await bcrypt.compare(req.body.password, hash);

    if (!isCorrectPassword) {
      res.status(401).json({ message: "Incorrect password" });
      return;
    }

    const token = jwt.sign({ role: "admin" }, secret, { expiresIn: "8h" });

    return res.json({ token });
  },
);

export default authRouter;
