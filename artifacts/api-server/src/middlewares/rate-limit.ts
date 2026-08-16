import rateLimit from "express-rate-limit";

// Applied to login/register: enough headroom for a real user mistyping their
// password a few times, tight enough to make brute force / credential
// stuffing impractical. Keyed by IP (express-rate-limit's default).
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please try again in a few minutes." },
});

// Applied to bet-placing endpoints: generous enough for fast real play,
// tight enough to stop scripted bet-spam from hammering the DB or
// statistically probing the RNG.
export const gameRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Slow down — too many bets in a short time." },
});
