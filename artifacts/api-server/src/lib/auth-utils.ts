import crypto from "node:crypto";
import bcrypt from "bcryptjs";

if (!process.env.JWT_SECRET) {
  throw new Error(
    "JWT_SECRET must be set. Refusing to start with no secret (or a guessable default) " +
      "would let anyone forge login tokens for real-money accounts."
  );
}

// Narrowed to `string` explicitly: TS control-flow analysis above doesn't
// carry into the functions defined further down this module.
const JWT_SECRET: string = process.env.JWT_SECRET;

// Access tokens are short-lived; the client exchanges a refresh token for a
// new one via POST /auth/refresh instead of holding one long-lived token.
export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60; // 15 minutes
export const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 3600; // 30 days

const BCRYPT_ROUNDS = 12;
const LEGACY_PBKDF2_PATTERN = /^[0-9a-f]{32}:[0-9a-f]{128}$/i;

/**
 * Hash a new password with bcrypt. Always used for new/updated passwords.
 */
export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, BCRYPT_ROUNDS);
}

/**
 * Verify a password against a stored hash. Supports bcrypt hashes (current
 * format) and, for accounts created before the bcrypt migration, the legacy
 * PBKDF2 "salt:hash" format. Callers should check `needsRehash` afterward
 * and, on a successful legacy verify, re-hash the password with bcrypt.
 */
export function verifyPassword(password: string, stored: string): boolean {
  if (stored.startsWith("$2a$") || stored.startsWith("$2b$") || stored.startsWith("$2y$")) {
    return bcrypt.compareSync(password, stored);
  }
  return verifyLegacyPbkdf2Password(password, stored);
}

export function needsRehash(stored: string): boolean {
  return !(stored.startsWith("$2a$") || stored.startsWith("$2b$") || stored.startsWith("$2y$"));
}

function verifyLegacyPbkdf2Password(password: string, stored: string): boolean {
  if (!LEGACY_PBKDF2_PATTERN.test(stored)) return false;
  const [salt, hash] = stored.split(":");
  const candidate = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return timingSafeEqualHex(candidate, hash);
}

function timingSafeEqualHex(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function generateAccessToken(payload: { userId: number }): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(
    JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + ACCESS_TOKEN_TTL_SECONDS })
  ).toString("base64url");
  const signature = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${signature}`;
}

export function verifyToken(token: string): { userId: number } | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;

  const expectedSig = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url");
  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (payload.exp && Date.now() / 1000 > payload.exp) return null;
    if (typeof payload.userId !== "number") return null;
    return { userId: payload.userId };
  } catch {
    return null;
  }
}

/**
 * Generate an opaque refresh token. Returns both the raw token (sent to the
 * client, never stored) and its SHA-256 hash (stored in the database, so a
 * leaked database doesn't hand out usable refresh tokens).
 */
export function generateRefreshToken(): { token: string; tokenHash: string } {
  const token = crypto.randomBytes(32).toString("base64url");
  return { token, tokenHash: hashRefreshToken(token) };
}

export function hashRefreshToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
