// Centralised payout / probability settings — easy to tune without touching game logic.

export const SLOT_CONFIG = {
  // Symbol draw weights (higher = more common)
  symbolWeights: [2, 5, 10, 14, 22, 24, 23] as const, // diamond…cards
  // Multipliers per match count (index = count - 3)
  matchMultipliers: {
    3: 0.12,
    4: 0.38,
    5: 1.0,
  } as const,
  // Base symbol multipliers (copied from SYMBOLS for clarity)
  symbolMultipliers: {
    Diamond: 500,
    Lightning: 100,
    Star: 50,
    Rocket: 25,
    Clover: 10,
    Crown: 15,
    Cards: 8,
  } as const,
  spinDurationBase: 1800,   // ms before first reel stops
  reelStopInterval: 320,    // ms between reel stops
};

export const ROULETTE_CONFIG = {
  multiplier: 5.84,
  totalSpinRotations: { min: 5, max: 8 },
  spinDuration: 2800, // ms
};

export const DICE_CONFIG = {
  overUnderMultiplier: 2.1,
  exactMultiplier: 6.0,
};

export const LUCKY_PICK_CONFIG = {
  singleMultiplier: 9,
  jodiMultiplier: 90,
  pattiMultiplier: 150,
};
