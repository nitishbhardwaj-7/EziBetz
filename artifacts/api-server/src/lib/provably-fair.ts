import crypto from "node:crypto";

/**
 * Provably-fair RNG (commit-reveal).
 *
 * 1. The server generates a random `serverSeed` and shows the player only
 *    its SHA-256 hash before any bet is placed (the "commit"). The raw
 *    seed stays secret, so the server can't be accused of picking it to
 *    suit a bet it's already seen.
 * 2. Every bet's outcome is `HMAC_SHA256(serverSeed, clientSeed:nonce)`,
 *    with the nonce incrementing once per bet. Same inputs always produce
 *    the same output.
 * 3. When the seed is rotated, the raw `serverSeed` is revealed. Anyone can
 *    then hash it, confirm it matches the hash shown beforehand, and
 *    recompute every bet made under it to confirm the recorded outcome.
 */

export function generateServerSeed(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hashServerSeed(serverSeed: string): string {
  return crypto.createHash("sha256").update(serverSeed).digest("hex");
}

export function generateClientSeed(): string {
  return crypto.randomBytes(8).toString("hex");
}

/**
 * Uniform-ish integer in [0, max) at a given cursor position within a bet.
 * A single bet/hand (one nonce) can need more than one random value — e.g.
 * slots' 5 reels, lucky-pick's 6 digits, blackjack's whole card sequence —
 * so `cursor` distinguishes "the Nth random draw for this nonce" and keeps
 * every draw independently reproducible from (serverSeed, clientSeed, nonce, cursor).
 * The modulo introduces a bias on the order of max/2^32, negligible for the
 * ranges used here — the standard tradeoff every provably-fair casino makes.
 */
export function outcomeIntAt(serverSeed: string, clientSeed: string, nonce: number, cursor: number, max: number): number {
  const digest = crypto.createHmac("sha256", serverSeed).update(`${clientSeed}:${nonce}:${cursor}`).digest();
  return digest.readUInt32BE(0) % max;
}

/** outcomeIntAt at cursor 0 — the common case for single-draw games (dice, roulette). */
export function outcomeInt(serverSeed: string, clientSeed: string, nonce: number, max: number): number {
  return outcomeIntAt(serverSeed, clientSeed, nonce, 0, max);
}

/** Weighted pick among `weights`, using the same cursor mechanism as outcomeIntAt. */
export function weightedIndexAt(serverSeed: string, clientSeed: string, nonce: number, cursor: number, weights: number[]): number {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = outcomeIntAt(serverSeed, clientSeed, nonce, cursor, total);
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r < 0) return i;
  }
  return weights.length - 1;
}

/**
 * Deterministic Fisher-Yates shuffle of a 52-card deck (indices 0-51),
 * driven entirely by (serverSeed, clientSeed, nonce) — recomputing it after
 * the seed is revealed reproduces the exact same card order for every hand
 * dealt under that nonce. Index i maps to suit = floor(i/13), rank = i%13.
 */
export function shuffledDeck(serverSeed: string, clientSeed: string, nonce: number): number[] {
  const deck = Array.from({ length: 52 }, (_, i) => i);
  for (let i = 51; i > 0; i--) {
    const j = outcomeIntAt(serverSeed, clientSeed, nonce, i, i + 1);
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}
