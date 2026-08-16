import { Router, type IRouter } from "express";
import { db, users, refreshTokens } from "@workspace/db";
import { eq, and, isNull } from "drizzle-orm";
import { RegisterBody, LoginBody, RefreshBody } from "@workspace/api-zod";
import {
  hashPassword,
  verifyPassword,
  needsRehash,
  generateAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  REFRESH_TOKEN_TTL_SECONDS,
} from "../lib/auth-utils";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth";
import { authRateLimit } from "../middlewares/rate-limit";

const router: IRouter = Router();

function serializeUser(user: typeof users.$inferSelect) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    displayName: user.displayName,
    balance: user.balance,
    createdAt: user.createdAt.toISOString(),
  };
}

async function issueTokenPair(userId: number) {
  const accessToken = generateAccessToken({ userId });
  const { token: refreshToken, tokenHash } = generateRefreshToken();

  await db.insert(refreshTokens).values({
    userId,
    tokenHash,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000),
  });

  return { accessToken, refreshToken };
}

router.post("/auth/register", authRateLimit, async (req, res) => {
  try {
    const parseResult = RegisterBody.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: "Invalid request body", details: parseResult.error.format() });
      return;
    }

    const { email, password, username, displayName } = parseResult.data;

    // Check if email already exists
    const [existingEmail] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existingEmail) {
      res.status(400).json({ error: "Email is already registered" });
      return;
    }

    // Check and generate a unique username if the target username is taken
    let finalUsername = username;
    let isTaken = true;
    let attempts = 0;
    while (isTaken && attempts < 10) {
      const [existing] = await db.select().from(users).where(eq(users.username, finalUsername)).limit(1);
      if (!existing) {
        isTaken = false;
      } else {
        finalUsername = `${username}_${Math.floor(1000 + Math.random() * 9000)}`;
        attempts++;
      }
    }

    if (isTaken) {
      res.status(400).json({ error: "Failed to generate a unique username" });
      return;
    }

    const passwordHash = hashPassword(password);

    const [user] = await db
      .insert(users)
      .values({
        email,
        passwordHash,
        username: finalUsername,
        displayName: displayName || finalUsername,
        balance: 100000, // $1,000.00 welcome bonus balance
      })
      .returning();

    const { accessToken, refreshToken } = await issueTokenPair(user.id);

    res.json({ token: accessToken, refreshToken, user: serializeUser(user) });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to register user", details: err.message });
  }
});

router.post("/auth/login", authRateLimit, async (req, res) => {
  try {
    const parseResult = LoginBody.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: "Invalid credentials", details: parseResult.error.format() });
      return;
    }

    const { email, password } = parseResult.data;

    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    // Lazily migrate accounts still on the legacy PBKDF2 hash to bcrypt.
    if (needsRehash(user.passwordHash)) {
      await db.update(users).set({ passwordHash: hashPassword(password) }).where(eq(users.id, user.id));
    }

    const { accessToken, refreshToken } = await issueTokenPair(user.id);

    res.json({ token: accessToken, refreshToken, user: serializeUser(user) });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to log in", details: err.message });
  }
});

router.post("/auth/refresh", async (req, res) => {
  try {
    const parseResult = RefreshBody.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: "Invalid request body", details: parseResult.error.format() });
      return;
    }

    const tokenHash = hashRefreshToken(parseResult.data.refreshToken);
    const [stored] = await db
      .select()
      .from(refreshTokens)
      .where(and(eq(refreshTokens.tokenHash, tokenHash), isNull(refreshTokens.revokedAt)))
      .limit(1);

    if (!stored || stored.expiresAt.getTime() < Date.now()) {
      res.status(401).json({ error: "Unauthorized: Invalid or expired refresh token" });
      return;
    }

    const [user] = await db.select().from(users).where(eq(users.id, stored.userId)).limit(1);
    if (!user) {
      res.status(401).json({ error: "Unauthorized: User not found" });
      return;
    }

    // Rotate: revoke the token that was just used and issue a fresh pair.
    // If it's ever presented again, that's a strong signal of token theft.
    await db.update(refreshTokens).set({ revokedAt: new Date() }).where(eq(refreshTokens.id, stored.id));
    const { accessToken, refreshToken } = await issueTokenPair(user.id);

    res.json({ token: accessToken, refreshToken, user: serializeUser(user) });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to refresh session", details: err.message });
  }
});

router.post("/auth/logout", async (req, res) => {
  try {
    const parseResult = RefreshBody.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: "Invalid request body", details: parseResult.error.format() });
      return;
    }

    const tokenHash = hashRefreshToken(parseResult.data.refreshToken);
    await db.update(refreshTokens).set({ revokedAt: new Date() }).where(eq(refreshTokens.tokenHash, tokenHash));

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to log out", details: err.message });
  }
});

router.get("/auth/me", requireAuth, (req: AuthenticatedRequest, res) => {
  res.json(serializeUser(req.user!));
});

export default router;
