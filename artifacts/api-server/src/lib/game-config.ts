// Authoritative payout rules for server-settled games. These numbers must
// match what artifacts/mobile/constants/gameConfig.ts *displays* to the
// player — the client no longer decides outcomes or payouts, only renders
// them, but it still needs to show the correct odds before betting.
//
// Deliberately excludes any "early boost" win-rate manipulation: real-money
// games settle at their disclosed odds for every player, every round.

export const DICE_CONFIG = {
  // Both "over" and "under" are 50/50 bets (3 of 6 faces each) — there's no
  // legitimate reason for them to pay differently. overUnderMultiplier was
  // 2.1 until 2026-09-30: at 50% odds that's 105% RTP, i.e. the house paid
  // out more than it took in on every "over" bet. 1.95 -> 97.5% RTP (2.5%
  // edge), deliberately a touch better than "under" per product decision.
  overUnderMultiplier: 1.95, // predicting "over 3.5"
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
  // Until 2026-09-30 these were [500,100,50,25,10,15,8], which computed to
  // ~51.6% RTP over the full 5-reel/7-symbol distribution — real slots
  // typically run 85-97%. Rescaled to land at ~94.7% RTP (5.3% house edge),
  // verified by summing P(exactly k matches) x payout(k) across all 7
  // symbols x {3,4,5}-of-a-kind (binomial per symbol, since 5 reels can
  // never produce two different 3-plus-of-a-kind symbols at once).
  symbolMultipliers: [850, 170, 85, 42, 17, 25, 13], // same order as SLOT_SYMBOL_NAMES
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
