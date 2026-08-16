import { type Request, type Response, type NextFunction } from "express";
import { db, users } from "@workspace/db";
import { eq } from "drizzle-orm";
import { verifyToken } from "../lib/auth-utils";

export interface AuthenticatedRequest extends Request {
  user?: typeof users.$inferSelect;
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;

  if (!token) {
    res.status(401).json({ error: "Unauthorized: Token missing" });
    return;
  }

  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "Unauthorized: Invalid or expired token" });
    return;
  }

  try {
    const [user] = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
    if (!user) {
      res.status(401).json({ error: "Unauthorized: User not found" });
      return;
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(500).json({ error: "Internal server error during auth verification" });
  }
}
