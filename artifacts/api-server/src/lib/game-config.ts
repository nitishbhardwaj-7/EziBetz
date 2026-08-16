// Authoritative payout rules for server-settled games. These numbers must
// match what artifacts/mobile/constants/gameConfig.ts *displays* to the
// player — the client no longer decides outcomes or payouts, only renders
// them, but it still needs to show the correct odds before betting.
//
// Deliberately excludes any "early boost" win-rate manipulation: real-money
// games settle at their disclosed odds for every player, every round.

export const DICE_CONFIG = {
  overUnderMultiplier: 2.1, // predicting "over 3.5"
  underMultiplier: 1.8, // predicting "under 3.5"
  exactMultiplier: 6.0, // predicting the exact face
};

export const ROULETTE_MULTIPLIERS = {
  straight: 36, // single number, 35:1
  color: 2, // red/black, 1:1
  parity: 2, // even/odd, 1:1
  range: 2, // 1-18 / 19-36, 1:1
  dozen: 3, // 1st/2nd/3rd 12, 2:1
} as const;

export const SLOT_SYMBOL_NAMES = ["Diamond", "Lightning", "Star", "Rocket", "Clover", "Crown", "Cards"];

export const SLOT_CONFIG = {
  // Draw weights, same order as SLOT_SYMBOL_NAMES
  symbolWeights: [2, 5, 10, 14, 22, 24, 23],
  matchMultipliers: { 3: 0.12, 4: 0.38, 5: 1.0 } as Record<number, number>,
  symbolMultipliers: [500, 100, 50, 25, 10, 15, 8], // same order as SLOT_SYMBOL_NAMES
};

export const LUCKY_PICK_CONFIG = {
  singleMultiplier: 9,
  jodiMultiplier: 90,
  pattiMultiplier: 150,
};

export const BLACKJACK_CONFIG = {
  blackjackPayout: 1.5, // 3:2, on top of the returned stake
  dealerStandsOn: 17,
};
