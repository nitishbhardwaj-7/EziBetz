// ─── Centralised payout / probability settings ───────────────────────────────
// All game probabilities and payouts live here. Tune freely without touching
// game logic.

// ─── Slot Machine ─────────────────────────────────────────────────────────────
export const SLOT_CONFIG = {
  // Draw weights for [Diamond, Lightning, Star, Rocket, Clover, Crown, Cards]
  // Higher = more common
  symbolWeights: [2, 5, 10, 14, 22, 24, 23] as const,
  matchMultipliers: { 3: 0.12, 4: 0.38, 5: 1.0 } as const,
  symbolMultipliers: {
    Diamond: 500, Lightning: 100, Star: 50,
    Rocket: 25,   Clover: 10,    Crown: 15, Cards: 8,
  } as const,
  spinDurationBase: 1800,  // ms before first reel stops
  reelStopInterval: 320,   // ms between consecutive reel stops
  // Early boost: first N spins favour 3-of-a-kind
  earlyBoostRounds: 10,
  earlyBoostWinChance: 0.55, // 55% chance of at least 3-of-a-kind for new players
};

// ─── Russian Roulette ─────────────────────────────────────────────────────────
export const ROULETTE_CONFIG = {
  multiplier: 5.84,
  totalSpinRotations: { min: 5, max: 8 },
  spinDuration: 2800, // ms
};

// ─── Dice ─────────────────────────────────────────────────────────────────────
export const DICE_CONFIG = {
  overUnderMultiplier: 2.1,   // over/under 3.5
  underMultiplier: 1.8,       // under 3.5 (slightly worse)
  exactMultiplier: 6.0,       // exact number
  // Early boost: first N rolls bias toward the player's prediction
  earlyBoostRounds: 8,
  earlyBoostWinChance: 0.62,  // 62 % win rate for first earlyBoostRounds rolls
};

// ─── Blackjack ────────────────────────────────────────────────────────────────
export const BLACKJACK_CONFIG = {
  blackjackPayout: 1.5,   // 3:2
  dealerStandsOn: 17,
};

// ─── Lucky Pick (ex-Matka) ────────────────────────────────────────────────────
export const LUCKY_PICK_CONFIG = {
  singleMultiplier: 9,
  jodiMultiplier: 90,
  pattiMultiplier: 150,
};
