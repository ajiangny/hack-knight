// Admin authentication. A Supabase access token proves only that someone
// signed in with Google — anyone with a Google account can obtain one. The
// ADMIN_EMAILS allowlist below is what actually restricts the dashboard, so
// it is not optional.

import { Request, Response, NextFunction } from "express";
import { supabaseAuth } from "../db/supabase.js";

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      adminUser?: AdminUser;
    }
  }
}

/** ADMIN_EMAILS as a lowercase, trimmed set. */
function adminEmails(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export const authenticateAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const authHeader = req.headers.authorization;

  // Note the trailing space: "Bearer" alone would accept "Bearertoken".
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const allowed = adminEmails();
  if (allowed.size === 0) {
    // Failing closed beats treating an empty allowlist as "allow everyone".
    console.error("ADMIN_EMAILS is empty — refusing all admin requests");
    res.status(500).json({ message: "Server misconfiguration" });
    return;
  }

  const { data, error } = await supabaseAuth.auth.getUser(token);
  const user = data?.user;

  if (error || !user?.email) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  // 403, not 401: the token is valid, the account just is not an admin. A 401
  // tells the frontend to clear the session and sign in again, which for a
  // signed-in-but-unauthorized user loops forever.
  if (!allowed.has(user.email.toLowerCase())) {
    res.status(403).json({ message: "This account is not authorized" });
    return;
  }

  const metadata = user.user_metadata ?? {};
  req.adminUser = {
    id: user.id,
    email: user.email,
    name: (metadata.full_name as string | undefined) ?? null,
    avatar_url: (metadata.avatar_url as string | undefined) ?? null,
  };

  next();
};
