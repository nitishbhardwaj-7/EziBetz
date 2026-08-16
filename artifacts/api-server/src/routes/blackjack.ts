import { Router, type IRouter, type Response } from "express";
import { db, users, transactions, gameSeeds, blackjackHands, type GameSeed, type BlackjackHand } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { DealBlackjackBody, HitBlackjackBody, StandBlackjackBody, DoubleBlackjackBody } from "@workspace/api-zod";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth";
import { generateServerSeed, hashServerSeed, generateClientSeed, shuffledDeck } from "../lib/provably-fair";
import { BLACKJACK_CONFIG } from "../lib/game-config";
import { gameRateLimit } from "../middlewares/rate-limit";

const router: IRouter = Router();

class InsufficientBalanceError extends Error {}
class HandNotFoundError extends Error {}
class HandNotPlayingError extends Error {}

// ---------------------------------------------------------------------------
// Card / hand-value helpers — must stay numerically identical to
// artifacts/mobile/components/PlayingCard.tsx's createDeck/handValue.
// ---------------------------------------------------------------------------

const SUITS = ["♠", "♥", "♦", "♣"] as const;
const VALUES = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

function cardFromIndex(index: number, hidden: boolean) {
  if (hidden) {
    // Never leak the dealer's hole card to the client before it's revealed —
    // suit/value here are placeholders the client never renders (it early-
    // returns to a card-back on `hidden: true`), not the real card.
    return { suit: "♠" as const, value: "?", numericValue: 0, hidden: true };
  }
  const suit = SUITS[Math.floor(index / 13)];
  const value = VALUES[index % 13];
  const numericValue = value === "A" ? 11 : Number.isNaN(parseInt(value, 10)) ? 10 : parseInt(value, 10);
  return { suit, value, numericValue, hidden: false };
}

function handValue(indices: number[]): number {
  let total = 0;
  let aces = 0;
  for (const idx of indices) {
    const value = VALUES[idx % 13];
    if (value === "A") {
      aces++;
      total += 11;
    } else {
      total += Number.isNaN(parseInt(value, 10)) ? 10 : parseInt(value, 10);
    }
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return total;
}

function dealerPlayOut(deck: number[], dealerCards: number[], cursor: number): { dealerCards: number[]; cursor: number } {
  let cards = dealerCards;
  let c = cursor;
  while (handValue(cards) < BLACKJACK_CONFIG.dealerStandsOn) {
    cards = [...cards, deck[c]];
    c += 1;
  }
  return { dealerCards: cards, cursor: c };
}

function serializeHand(hand: BlackjackHand, balanceAfter: number, seed: Pick<GameSeed, "serverSeedHash" | "clientSeed">) {
  const revealAll = hand.status === "settled";
  return {
    handId: hand.id,
    status: hand.status,
    playerCards: hand.playerCards.map((i) => cardFromIndex(i, false)),
    dealerCards: hand.dealerCards.map((i, pos) => cardFromIndex(i, !revealAll && pos === 1)),
    playerValue: handValue(hand.playerCards),
    dealerValue: revealAll ? handValue(hand.dealerCards) : handValue(hand.dealerCards.slice(0, 1)),
    betAmount: hand.betAmount,
    result: hand.result,
    payout: hand.payout,
    balanceAfter,
    serverSeedHash: seed.serverSeedHash,
    clientSeed: seed.clientSeed,
    nonce: hand.nonce,
  };
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function loadOwnedPlayingHand(tx: Tx, userId: number, handId: number) {
  const [hand] = await tx.select().from(blackjackHands).where(and(eq(blackjackHands.id, handId), eq(blackjackHands.userId, userId))).limit(1);
  if (!hand) throw new HandNotFoundError();
  if (hand.status !== "playing") throw new HandNotPlayingError();
  const [seed] = await tx.select().from(gameSeeds).where(eq(gameSeeds.id, hand.seedId)).limit(1);
  return { hand, seed };
}

function handleGameError(err: unknown, res: Response, action: string) {
  if (err instanceof InsufficientBalanceError) {
    res.status(400).json({ error: "Insufficient balance" });
    return;
  }
  if (err instanceof HandNotFoundError) {
    res.status(404).json({ error: "Hand not found" });
    return;
  }
  if (err instanceof HandNotPlayingError) {
    res.status(400).json({ error: "This hand is already settled" });
    return;
  }
  const message = err instanceof Error ? err.message : String(err);
  res.status(500).json({ error: `Blackjack ${action} failed`, details: message });
}

router.post("/games/blackjack/deal", gameRateLimit, requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const parseResult = DealBlackjackBody.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: "Invalid request body", details: parseResult.error.format() });
      return;
    }
    const { betAmount } = parseResult.data;
    if (!Number.isInteger(betAmount) || betAmount <= 0) {
      res.status(400).json({ error: "Bet amount must be a positive whole number of cents" });
      return;
    }

    const userId = req.user!.id;

    const outcome = await db.transaction(async (tx) => {
      let [seed] = await tx.select().from(gameSeeds).where(and(eq(gameSeeds.userId, userId), eq(gameSeeds.active, true))).limit(1);
      if (!seed) {
        const serverSeed = generateServerSeed();
        [seed] = await tx
          .insert(gameSeeds)
          .values({ userId, serverSeed, serverSeedHash: hashServerSeed(serverSeed), clientSeed: generateClientSeed() })
          .returning();
      }
      const [claimed] = await tx
        .update(gameSeeds)
        .set({ nonce: sql`${gameSeeds.nonce} + 1` })
        .where(eq(gameSeeds.id, (seed as GameSeed).id))
        .returning();

      const [debited] = await tx
        .update(users)
        .set({ balance: sql`${users.balance} - ${betAmount}` })
        .where(sql`${users.id} = ${userId} AND ${users.balance} >= ${betAmount}`)
        .returning();
      if (!debited) throw new InsufficientBalanceError();

      await tx.insert(transactions).values({ userId, amount: -betAmount, type: "bet", status: "completed" });

      const deck = shuffledDeck(claimed.serverSeed, claimed.clientSeed, claimed.nonce);
      const playerCards = [deck[0], deck[2]];
      const dealerCards = [deck[1], deck[3]];
      const cursor = 4;

      let status: "playing" | "settled" = "playing";
      let result: string | null = null;
      let payout: number | null = null;
      let balanceAfter = debited.balance;

      // Natural blackjack settles immediately, exactly like the original client did.
      if (handValue(playerCards) === 21) {
        status = "settled";
        const dealerHasBlackjack = handValue(dealerCards) === 21;
        if (dealerHasBlackjack) {
          result = "push";
          payout = betAmount;
        } else {
          result = "blackjack";
          payout = betAmount + Math.floor(betAmount * BLACKJACK_CONFIG.blackjackPayout);
        }
        const [credited] = await tx
          .update(users)
          .set({ balance: sql`${users.balance} + ${payout}` })
          .where(eq(users.id, userId))
          .returning();
        balanceAfter = credited.balance;
        await tx.insert(transactions).values({ userId, amount: payout, type: "win", status: "completed" });
      }

      const [hand] = await tx
        .insert(blackjackHands)
        .values({
          userId,
          seedId: claimed.id,
          nonce: claimed.nonce,
          cursor,
          betAmount,
          playerCards,
          dealerCards,
          status,
          result,
          payout,
          settledAt: status === "settled" ? new Date() : null,
        })
        .returning();

      return { hand, balanceAfter, seed: claimed };
    });

    res.json(serializeHand(outcome.hand, outcome.balanceAfter, outcome.seed));
  } catch (err) {
    handleGameError(err, res, "deal");
  }
});

router.post("/games/blackjack/hit", gameRateLimit, requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const parseResult = HitBlackjackBody.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: "Invalid request body", details: parseResult.error.format() });
      return;
    }
    const userId = req.user!.id;

    const outcome = await db.transaction(async (tx) => {
      const { hand, seed } = await loadOwnedPlayingHand(tx, userId, parseResult.data.handId);
      const deck = shuffledDeck(seed.serverSeed, seed.clientSeed, hand.nonce);

      const playerCards = [...hand.playerCards, deck[hand.cursor]];
      const cursor = hand.cursor + 1;
      const pv = handValue(playerCards);

      let status: "playing" | "settled" = "playing";
      let result: string | null = null;
      let payout: number | null = null;

      if (pv > 21) {
        status = "settled";
        result = "player_bust";
        payout = 0;
      }

      const [updated] = await tx
        .update(blackjackHands)
        .set({ playerCards, cursor, status, result, payout, settledAt: status === "settled" ? new Date() : null })
        .where(eq(blackjackHands.id, hand.id))
        .returning();

      const [current] = await tx.select({ balance: users.balance }).from(users).where(eq(users.id, userId)).limit(1);

      return { hand: updated, balanceAfter: current.balance, seed };
    });

    res.json(serializeHand(outcome.hand, outcome.balanceAfter, outcome.seed));
  } catch (err) {
    handleGameError(err, res, "hit");
  }
});

router.post("/games/blackjack/stand", gameRateLimit, requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const parseResult = StandBlackjackBody.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: "Invalid request body", details: parseResult.error.format() });
      return;
    }
    const userId = req.user!.id;

    const outcome = await db.transaction(async (tx) => {
      const { hand, seed } = await loadOwnedPlayingHand(tx, userId, parseResult.data.handId);
      const deck = shuffledDeck(seed.serverSeed, seed.clientSeed, hand.nonce);

      const { dealerCards, cursor } = dealerPlayOut(deck, hand.dealerCards, hand.cursor);
      const pv = handValue(hand.playerCards);
      const dv = handValue(dealerCards);

      let result: string;
      let payout: number;
      if (dv > 21) {
        result = "dealer_bust";
        payout = hand.betAmount * 2;
      } else if (pv > dv) {
        result = "player_win";
        payout = hand.betAmount * 2;
      } else if (pv === dv) {
        result = "push";
        payout = hand.betAmount;
      } else {
        result = "dealer_win";
        payout = 0;
      }

      let balanceAfter: number;
      if (payout > 0) {
        const [credited] = await tx
          .update(users)
          .set({ balance: sql`${users.balance} + ${payout}` })
          .where(eq(users.id, userId))
          .returning();
        balanceAfter = credited.balance;
        await tx.insert(transactions).values({ userId, amount: payout, type: "win", status: "completed" });
      } else {
        const [current] = await tx.select({ balance: users.balance }).from(users).where(eq(users.id, userId)).limit(1);
        balanceAfter = current.balance;
      }

      const [updated] = await tx
        .update(blackjackHands)
        .set({ dealerCards, cursor, status: "settled", result, payout, settledAt: new Date() })
        .where(eq(blackjackHands.id, hand.id))
        .returning();

      return { hand: updated, balanceAfter, seed };
    });

    res.json(serializeHand(outcome.hand, outcome.balanceAfter, outcome.seed));
  } catch (err) {
    handleGameError(err, res, "stand");
  }
});

router.post("/games/blackjack/double", gameRateLimit, requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const parseResult = DoubleBlackjackBody.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: "Invalid request body", details: parseResult.error.format() });
      return;
    }
    const userId = req.user!.id;

    const outcome = await db.transaction(async (tx) => {
      const { hand, seed } = await loadOwnedPlayingHand(tx, userId, parseResult.data.handId);
      if (hand.playerCards.length !== 2) {
        throw new HandNotPlayingError(); // double-down only allowed on the initial two cards
      }

      const [debited] = await tx
        .update(users)
        .set({ balance: sql`${users.balance} - ${hand.betAmount}` })
        .where(sql`${users.id} = ${userId} AND ${users.balance} >= ${hand.betAmount}`)
        .returning();
      if (!debited) throw new InsufficientBalanceError();
      await tx.insert(transactions).values({ userId, amount: -hand.betAmount, type: "bet", status: "completed" });

      const betAmount = hand.betAmount * 2;
      const deck = shuffledDeck(seed.serverSeed, seed.clientSeed, hand.nonce);
      const playerCards = [...hand.playerCards, deck[hand.cursor]];
      let cursor = hand.cursor + 1;
      const pv = handValue(playerCards);

      let dealerCards = hand.dealerCards;
      let result: string;
      let payout: number;

      if (pv > 21) {
        result = "player_bust";
        payout = 0;
      } else {
        const played = dealerPlayOut(deck, hand.dealerCards, cursor);
        dealerCards = played.dealerCards;
        cursor = played.cursor;
        const dv = handValue(dealerCards);
        if (dv > 21) {
          result = "dealer_bust";
          payout = betAmount * 2;
        } else if (pv > dv) {
          result = "player_win";
          payout = betAmount * 2;
        } else if (pv === dv) {
          result = "push";
          payout = betAmount;
        } else {
          result = "dealer_win";
          payout = 0;
        }
      }

      let balanceAfter = debited.balance;
      if (payout > 0) {
        const [credited] = await tx
          .update(users)
          .set({ balance: sql`${users.balance} + ${payout}` })
          .where(eq(users.id, userId))
          .returning();
        balanceAfter = credited.balance;
        await tx.insert(transactions).values({ userId, amount: payout, type: "win", status: "completed" });
      }

      const [updated] = await tx
        .update(blackjackHands)
        .set({ playerCards, dealerCards, cursor, betAmount, status: "settled", result, payout, settledAt: new Date() })
        .where(eq(blackjackHands.id, hand.id))
        .returning();

      return { hand: updated, balanceAfter, seed };
    });

    res.json(serializeHand(outcome.hand, outcome.balanceAfter, outcome.seed));
  } catch (err) {
    handleGameError(err, res, "double");
  }
});

export default router;
