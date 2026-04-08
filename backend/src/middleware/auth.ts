import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export const authenticateAdmin = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const authHeader = req.headers.authorization;
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    res.status(500).json({ message: "Server misconfiguration" });
    return;
  }

  if (!authHeader || !authHeader.startsWith("Bearer")) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    jwt.verify(token, secret);
    next();
  } catch {
    res.status(401).json({ message: "Unauthorized" });
  }
};
