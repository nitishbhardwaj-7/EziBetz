// ─── Centralised payout / probability settings ───────────────────────────────
// All game probabilities and payouts live here. Tune freely without touching
// game logic.

// ─── Slot Machine ─────────────────────────────────────────────────────────────
// The reels no longer decide the outcome locally — the server settles every
// spin (see artifacts/api-server/src/lib/game-config.ts). symbolWeights and
// symbolMultipliers below are display-only and must stay numerically
// identical to the server's copy; spinDurationBase/reelStopInterval are
// purely cosmetic (how the reel-stop animation is paced).
export const SLOT_CONFIG = {
  // Draw weights for [Diamond, Lightning, Star, Rocket, Clover, Crown, Cards]
  // Higher = more common
  symbolWeights: [2, 5, 10, 14, 22, 24, 23] as const,
  matchMultipliers: { 3: 0.12, 4: 0.38, 5: 1.0 } as const,
  symbolMultipliers: {
    Diamond: 850, Lightning: 170, Star: 85,
    Rocket: 42,   Clover: 17,    Crown: 25, Cards: 13,
  } as const,
  spinDurationBase: 1800,  // ms before first reel stops
  reelStopInterval: 320,   // ms between consecutive reel stops
};

// ─── Russian Roulette ─────────────────────────────────────────────────────────
export const ROULETTE_CONFIG = {
  multiplier: 5.84,
  totalSpinRotations: { min: 5, max: 8 },
  spinDuration: 2800, // ms
};

// ─── Dice ─────────────────────────────────────────────────────────────────────
// The dice screen no longer decides outcomes locally — the server settles
// every bet (see artifacts/api-server/src/lib/game-config.ts) and these
// values are display-only. Keep them numerically identical to the server's
// copy, or the odds shown here will lie about what actually gets paid.
export const DICE_CONFIG = {
  overUnderMultiplier: 1.95,  // over 3.5
  underMultiplier: 1.8,       // under 3.5 (slightly worse)
  exactMultiplier: 6.0,       // exact number
};

// ─── Blackjack ────────────────────────────────────────────────────────────────
// Hands are dealt and settled server-side (artifacts/api-server/src/routes/blackjack.ts).
// Kept here as the documented source for the odds printed on the felt table.
export const BLACKJACK_CONFIG = {
  blackjackPayout: 1.5,   // 3:2
  dealerStandsOn: 17,
};

// ─── Lucky Pick (ex-Matka) ────────────────────────────────────────────────────
// Draws are settled server-side (artifacts/api-server/src/routes/games.ts).
// Kept here as the documented source for the payout labels shown in the UI.
export const LUCKY_PICK_CONFIG = {
  singleMultiplier: 9,
  jodiMultiplier: 90,
  pattiMultiplier: 150,
};
