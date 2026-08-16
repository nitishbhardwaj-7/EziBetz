import { Router, type IRouter } from "express";
import { db, users, bets, gameSeeds, transactions, type GameSeed } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { RollDiceBody, SpinRouletteBody, RotateGameSeedBody, SpinSlotsBody, DrawLuckyPickBody } from "@workspace/api-zod";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth";
import { generateServerSeed, hashServerSeed, generateClientSeed, outcomeInt, outcomeIntAt, weightedIndexAt } from "../lib/provably-fair";
import { DICE_CONFIG, ROULETTE_MULTIPLIERS, SLOT_CONFIG, SLOT_SYMBOL_NAMES, LUCKY_PICK_CONFIG } from "../lib/game-config";
import { gameRateLimit } from "../middlewares/rate-limit";

const router: IRouter = Router();

class InsufficientBalanceError extends Error {}

type BetOutcome = { outcome: Record<string, unknown>; won: boolean; payout: number };
type OutcomeFn = (serverSeed: string, clientSeed: string, nonce: number) => BetOutcome;

/**
 * Runs one bet end-to-end in a single DB transaction: claims the next
 * nonce for the player's active seed (creating one if this is their first
 * bet), computes the outcome from that seed, and atomically debits the
 * stake / credits the payout — all or nothing.
 */
async function placeBet(userId: number, game: string, betAmount: number, params: Record<string, unknown>, computeOutcome: OutcomeFn) {
  return db.transaction(async (tx) => {
    let [seed] = await tx
      .select()
      .from(gameSeeds)
      .where(and(eq(gameSeeds.userId, userId), eq(gameSeeds.active, true)))
      .limit(1);

    if (!seed) {
      const serverSeed = generateServerSeed();
      [seed] = await tx
        .insert(gameSeeds)
        .values({
          userId,
          serverSeed,
          serverSeedHash: hashServerSeed(serverSeed),
          clientSeed: generateClientSeed(),
        })
        .returning();
    }

    // Atomically claim this bet's nonce so concurrent bets from the same
    // player can never reuse (and thus never predict) each other's outcome.
    const [claimed] = await tx
      .update(gameSeeds)
      .set({ nonce: sql`${gameSeeds.nonce} + 1` })
      .where(eq(gameSeeds.id, (seed as GameSeed).id))
      .returning();

    const { outcome, won, payout } = computeOutcome(claimed.serverSeed, claimed.clientSeed, claimed.nonce);
    const netChange = payout - betAmount;

    // Single conditional UPDATE: debits the stake and credits the payout
    // together, and only succeeds if the balance actually covers the
    // stake — same race-free pattern as the payments endpoints.
    const [updatedUser] = await tx
      .update(users)
      .set({ balance: sql`${users.balance} + ${netChange}` })
      .where(sql`${users.id} = ${userId} AND ${users.balance} >= ${betAmount}`)
      .returning();

    if (!updatedUser) {
      throw new InsufficientBalanceError();
    }

    await tx.insert(bets).values({
      userId,
      game,
      betAmount,
      params,
      outcome,
      won,
      payout,
      seedId: claimed.id,
      nonce: claimed.nonce,
    });

    await tx.insert(transactions).values({
      userId,
      amount: won ? payout - betAmount : -betAmount,
      type: won ? "win" : "bet",
      status: "completed",
    });

    return {
      outcome,
      won,
      payout,
      balanceAfter: updatedUser.balance,
      serverSeedHash: claimed.serverSeedHash,
      clientSeed: claimed.clientSeed,
      nonce: claimed.nonce,
    };
  });
}

router.get("/games/seed", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    let [seed] = await db
      .select()
      .from(gameSeeds)
      .where(and(eq(gameSeeds.userId, userId), eq(gameSeeds.active, true)))
      .limit(1);

    if (!seed) {
      const serverSeed = generateServerSeed();
      [seed] = await db
        .insert(gameSeeds)
        .values({
          userId,
          serverSeed,
          serverSeedHash: hashServerSeed(serverSeed),
          clientSeed: generateClientSeed(),
        })
        .returning();
    }

    res.json({ serverSeedHash: seed.serverSeedHash, clientSeed: seed.clientSeed, nonce: seed.nonce });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to load seed", details: err.message });
  }
});

router.post("/games/seed/rotate", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const parseResult = RotateGameSeedBody.safeParse(req.body ?? {});
    if (!parseResult.success) {
      res.status(400).json({ error: "Invalid request body", details: parseResult.error.format() });
      return;
    }

    const userId = req.user!.id;
    const [result] = await db.transaction(async (tx) => {
      const [current] = await tx
        .select()
        .from(gameSeeds)
        .where(and(eq(gameSeeds.userId, userId), eq(gameSeeds.active, true)))
        .limit(1);

      if (current) {
        await tx.update(gameSeeds).set({ active: false, revealedAt: new Date() }).where(eq(gameSeeds.id, current.id));
      }

      const serverSeed = generateServerSeed();
      const [created] = await tx
        .insert(gameSeeds)
        .values({
          userId,
          serverSeed,
          serverSeedHash: hashServerSeed(serverSeed),
          clientSeed: parseResult.data.clientSeed?.trim() || generateClientSeed(),
        })
        .returning();

      return [{ previous: current ?? null, next: created }];
    });

    res.json({
      revealedServerSeed: result.previous?.serverSeed ?? null,
      revealedServerSeedHash: result.previous?.serverSeedHash ?? null,
      newServerSeedHash: result.next.serverSeedHash,
      clientSeed: result.next.clientSeed,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to rotate seed", details: err.message });
  }
});

router.post("/games/dice/roll", gameRateLimit, requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const parseResult = RollDiceBody.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: "Invalid request body", details: parseResult.error.format() });
      return;
    }

    const { betAmount, predictionType, predictionValue } = parseResult.data;
    if (!Number.isInteger(betAmount) || betAmount <= 0) {
      res.status(400).json({ error: "Bet amount must be a positive whole number of cents" });
      return;
    }
    if (predictionType === "exact" && (predictionValue === undefined || !Number.isInteger(predictionValue) || predictionValue < 1 || predictionValue > 6)) {
      res.status(400).json({ error: "predictionValue must be an integer 1-6 when predictionType is 'exact'" });
      return;
    }

    const computeOutcome: OutcomeFn = (serverSeed, clientSeed, nonce) => {
      const roll = outcomeInt(serverSeed, clientSeed, nonce, 6) + 1; // 1-6

      let won: boolean;
      let multiplier: number;
      if (predictionType === "over") {
        won = roll > 3.5;
        multiplier = DICE_CONFIG.overUnderMultiplier;
      } else if (predictionType === "under") {
        won = roll < 3.5;
        multiplier = DICE_CONFIG.underMultiplier;
      } else {
        won = roll === predictionValue;
        multiplier = DICE_CONFIG.exactMultiplier;
      }

      const payout = won ? Math.round(betAmount * multiplier) : 0;
      return { outcome: { roll }, won, payout };
    };

    const result = await placeBet(req.user!.id, "dice", betAmount, { predictionType, predictionValue }, computeOutcome);

    res.json({
      roll: (result.outcome as { roll: number }).roll,
      won: result.won,
      payout: result.payout,
      balanceAfter: result.balanceAfter,
      serverSeedHash: result.serverSeedHash,
      clientSeed: result.clientSeed,
      nonce: result.nonce,
    });
  } catch (err: any) {
    if (err instanceof InsufficientBalanceError) {
      res.status(400).json({ error: "Insufficient balance" });
      return;
    }
    res.status(500).json({ error: "Dice roll failed", details: err.message });
  }
});

const STRAIGHT_VALUE_PATTERN = /^(?:[0-9]|[12][0-9]|3[0-6])$/;

function isValidRouletteBet(betType: string, betValue: string): boolean {
  switch (betType) {
    case "straight":
      return STRAIGHT_VALUE_PATTERN.test(betValue);
    case "color":
      return betValue === "red" || betValue === "black";
    case "parity":
      return betValue === "even" || betValue === "odd";
    case "range":
      return betValue === "low" || betValue === "high";
    case "dozen":
      return betValue === "1st" || betValue === "2nd" || betValue === "3rd";
    default:
      return false;
  }
}

const RED_NUMS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
function rouletteColor(n: number): "red" | "black" | "green" {
  if (n === 0) return "green";
  return RED_NUMS.has(n) ? "red" : "black";
}

function evaluateRouletteBet(betType: string, betValue: string, n: number): { won: boolean; multiplier: number } {
  switch (betType) {
    case "straight":
      return { won: n === Number(betValue), multiplier: ROULETTE_MULTIPLIERS.straight };
    case "color":
      return { won: n !== 0 && rouletteColor(n) === betValue, multiplier: ROULETTE_MULTIPLIERS.color };
    case "parity":
      if (n === 0) return { won: false, multiplier: 0 };
      return { won: (n % 2 === 0) === (betValue === "even"), multiplier: ROULETTE_MULTIPLIERS.parity };
    case "range":
      if (n === 0) return { won: false, multiplier: 0 };
      return { won: betValue === "low" ? n <= 18 : n >= 19, multiplier: ROULETTE_MULTIPLIERS.range };
    case "dozen": {
      if (n === 0) return { won: false, multiplier: 0 };
      const dz = n <= 12 ? "1st" : n <= 24 ? "2nd" : "3rd";
      return { won: dz === betValue, multiplier: ROULETTE_MULTIPLIERS.dozen };
    }
    default:
      return { won: false, multiplier: 0 };
  }
}

router.post("/games/roulette/spin", gameRateLimit, requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const parseResult = SpinRouletteBody.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: "Invalid request body", details: parseResult.error.format() });
      return;
    }

    const { betAmount, betType, betValue } = parseResult.data;
    if (!Number.isInteger(betAmount) || betAmount <= 0) {
      res.status(400).json({ error: "Bet amount must be a positive whole number of cents" });
      return;
    }
    if (!isValidRouletteBet(betType, betValue)) {
      res.status(400).json({ error: `Invalid betValue "${betValue}" for betType "${betType}"` });
      return;
    }

    const computeOutcome: OutcomeFn = (serverSeed, clientSeed, nonce) => {
      const number = outcomeInt(serverSeed, clientSeed, nonce, 37); // 0-36
      const { won, multiplier } = evaluateRouletteBet(betType, betValue, number);
      const payout = won ? betAmount * multiplier : 0;
      return { outcome: { number }, won, payout };
    };

    const result = await placeBet(req.user!.id, "roulette", betAmount, { betType, betValue }, computeOutcome);

    res.json({
      number: (result.outcome as { number: number }).number,
      won: result.won,
      payout: result.payout,
      balanceAfter: result.balanceAfter,
      serverSeedHash: result.serverSeedHash,
      clientSeed: result.clientSeed,
      nonce: result.nonce,
    });
  } catch (err: any) {
    if (err instanceof InsufficientBalanceError) {
      res.status(400).json({ error: "Insufficient balance" });
      return;
    }
    res.status(500).json({ error: "Roulette spin failed", details: err.message });
  }
});

router.post("/games/slots/spin", gameRateLimit, requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const parseResult = SpinSlotsBody.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: "Invalid request body", details: parseResult.error.format() });
      return;
    }

    const { betAmount } = parseResult.data;
    if (!Number.isInteger(betAmount) || betAmount <= 0) {
      res.status(400).json({ error: "Bet amount must be a positive whole number of cents" });
      return;
    }

    const computeOutcome: OutcomeFn = (serverSeed, clientSeed, nonce) => {
      const symbolIndices = Array.from({ length: 5 }, (_, reel) =>
        weightedIndexAt(serverSeed, clientSeed, nonce, reel, SLOT_CONFIG.symbolWeights)
      );
      const symbols = symbolIndices.map((i) => SLOT_SYMBOL_NAMES[i]);

      const counts = new Map<number, number>();
      for (const i of symbolIndices) counts.set(i, (counts.get(i) ?? 0) + 1);
      let bestIndex = -1;
      let bestCount = 0;
      for (const [i, count] of counts) {
        if (count > bestCount) {
          bestCount = count;
          bestIndex = i;
        }
      }

      let won = false;
      let multiplier = 0;
      if (bestCount >= 3) {
        const matchMult = SLOT_CONFIG.matchMultipliers[bestCount] ?? 1;
        // Math.floor alone can round a genuine 3-of-a-kind down to a 0x
        // payout for the lowest-tier symbol (e.g. floor(8 * 0.12) = 0) —
        // a declared win that pays nothing. A win always pays at least 1x.
        multiplier = Math.max(1, Math.floor(SLOT_CONFIG.symbolMultipliers[bestIndex] * matchMult));
        won = true;
      }

      const payout = won ? Math.round(betAmount * multiplier) : 0;
      return { outcome: { symbols, multiplier }, won, payout };
    };

    const result = await placeBet(req.user!.id, "slots", betAmount, {}, computeOutcome);
    const outcome = result.outcome as { symbols: string[]; multiplier: number };

    res.json({
      symbols: outcome.symbols,
      won: result.won,
      multiplier: outcome.multiplier,
      payout: result.payout,
      balanceAfter: result.balanceAfter,
      serverSeedHash: result.serverSeedHash,
      clientSeed: result.clientSeed,
      nonce: result.nonce,
    });
  } catch (err: any) {
    if (err instanceof InsufficientBalanceError) {
      res.status(400).json({ error: "Insufficient balance" });
      return;
    }
    res.status(500).json({ error: "Slots spin failed", details: err.message });
  }
});

function drawLuckyPickSet(serverSeed: string, clientSeed: string, nonce: number, baseCursor: number) {
  const digits = [0, 1, 2].map((i) => outcomeIntAt(serverSeed, clientSeed, nonce, baseCursor + i, 10));
  const sum = digits[0] + digits[1] + digits[2];
  const ank = sum % 10;
  const patti = [...digits].sort((a, b) => a - b).join("");
  return { digits, ank, patti };
}

const PATTI_PATTERN = /^[0-9]{3}$/;
function isValidPatti(pick: string): boolean {
  if (!PATTI_PATTERN.test(pick)) return false;
  return pick[0] <= pick[1] && pick[1] <= pick[2];
}

router.post("/games/lucky-pick/draw", gameRateLimit, requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const parseResult = DrawLuckyPickBody.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: "Invalid request body", details: parseResult.error.format() });
      return;
    }

    const { betAmount, betType, betSide, pick } = parseResult.data;
    if (!Number.isInteger(betAmount) || betAmount <= 0) {
      res.status(400).json({ error: "Bet amount must be a positive whole number of cents" });
      return;
    }
    if ((betType === "single" || betType === "patti") && betSide !== "open" && betSide !== "close") {
      res.status(400).json({ error: `betSide is required for betType "${betType}"` });
      return;
    }
    if (betType === "single" && !/^[0-9]$/.test(pick)) {
      res.status(400).json({ error: 'For "single", pick must be a single digit 0-9' });
      return;
    }
    if (betType === "jodi" && !/^[0-9]{2}$/.test(pick)) {
      res.status(400).json({ error: 'For "jodi", pick must be a 2-digit string "00".."99"' });
      return;
    }
    if (betType === "patti" && !isValidPatti(pick)) {
      res.status(400).json({ error: 'For "patti", pick must be a 3-digit non-decreasing string, e.g. "025"' });
      return;
    }

    const computeOutcome: OutcomeFn = (serverSeed, clientSeed, nonce) => {
      const open = drawLuckyPickSet(serverSeed, clientSeed, nonce, 0);
      const close = drawLuckyPickSet(serverSeed, clientSeed, nonce, 3);
      const jodi = `${open.ank}${close.ank}`;

      let won = false;
      let multiplier = 0;
      if (betType === "single") {
        won = (betSide === "open" ? open.ank : close.ank) === Number(pick);
        multiplier = LUCKY_PICK_CONFIG.singleMultiplier;
      } else if (betType === "jodi") {
        won = jodi === pick.padStart(2, "0");
        multiplier = LUCKY_PICK_CONFIG.jodiMultiplier;
      } else {
        won = (betSide === "open" ? open.patti : close.patti) === pick;
        multiplier = LUCKY_PICK_CONFIG.pattiMultiplier;
      }

      const payout = won ? betAmount * multiplier : 0;
      return {
        outcome: {
          openDigits: open.digits,
          openAnk: open.ank,
          openPatti: open.patti,
          closeDigits: close.digits,
          closeAnk: close.ank,
          closePatti: close.patti,
          jodi,
        },
        won,
        payout,
      };
    };

    const result = await placeBet(req.user!.id, "lucky-pick", betAmount, { betType, betSide, pick }, computeOutcome);
    const outcome = result.outcome as {
      openDigits: number[]; openAnk: number; openPatti: string;
      closeDigits: number[]; closeAnk: number; closePatti: string; jodi: string;
    };

    res.json({
      ...outcome,
      won: result.won,
      payout: result.payout,
      balanceAfter: result.balanceAfter,
      serverSeedHash: result.serverSeedHash,
      clientSeed: result.clientSeed,
      nonce: result.nonce,
    });
  } catch (err: any) {
    if (err instanceof InsufficientBalanceError) {
      res.status(400).json({ error: "Insufficient balance" });
      return;
    }
    res.status(500).json({ error: "Lucky-pick draw failed", details: err.message });
  }
});

export default router;
