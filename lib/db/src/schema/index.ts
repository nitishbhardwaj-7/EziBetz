import { pgTable, serial, text, integer, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  username: text("username").notNull().unique(),
  displayName: text("display_name"),
  balance: integer("balance").notNull().default(100000), // balance in cents, e.g. $1,000.00
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  amount: integer("amount").notNull(), // positive for deposits/wins, negative for withdrawals/bets
  type: text("type").notNull(), // 'deposit', 'withdrawal', 'bet', 'win'
  status: text("status").notNull(), // 'completed', 'pending', 'failed'
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Opaque, rotating refresh tokens used to mint new short-lived access
// tokens. Only a hash of the token is stored, so a database leak alone
// doesn't hand out usable sessions.
export const refreshTokens = pgTable("refresh_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  revokedAt: timestamp("revoked_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Provably-fair seed pairs. `serverSeed` is generated server-side and kept
// secret while `active`; only its SHA-256 hash is ever shown to the player
// before betting, so they can later confirm the seed wasn't changed after
// the fact. Rotating (or `revealedAt` being set) exposes the raw seed so
// every past bet made under it becomes independently verifiable.
export const gameSeeds = pgTable("game_seeds", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  serverSeed: text("server_seed").notNull(),
  serverSeedHash: text("server_seed_hash").notNull(),
  clientSeed: text("client_seed").notNull(),
  nonce: integer("nonce").notNull().default(0),
  active: boolean("active").notNull().default(true),
  revealedAt: timestamp("revealed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// One row per settled bet. `outcome` and `params` are game-specific
// (dice: { roll } / { predictionType, predictionValue }; roulette:
// { number } / { betType, betValue }). `seedId` + `nonce` together pin down
// exactly how the outcome was derived, for later verification.
export const bets = pgTable("bets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  game: text("game").notNull(), // 'dice' | 'roulette'
  betAmount: integer("bet_amount").notNull(), // cents
  params: jsonb("params").notNull(),
  outcome: jsonb("outcome").notNull(),
  won: boolean("won").notNull(),
  payout: integer("payout").notNull(), // cents credited back; 0 on a loss
  seedId: integer("seed_id").notNull().references(() => gameSeeds.id),
  nonce: integer("nonce").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// A blackjack hand spans multiple requests (deal, then hit/stand/double),
// unlike the single-shot games above, so its state has to live somewhere
// between them. `seedId` + `nonce` pin down one deterministic shuffled
// 52-card deck (see lib/provably-fair.ts:shuffledDeck); `cursor` is how
// many cards have been dealt from it so far. Cards are stored as 0-51
// indices, not full card objects, so the deck stays reconstructible and
// verifiable from the seed alone.
export const blackjackHands = pgTable("blackjack_hands", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  seedId: integer("seed_id").notNull().references(() => gameSeeds.id),
  nonce: integer("nonce").notNull(),
  cursor: integer("cursor").notNull(), // next undealt position in the shuffled deck
  betAmount: integer("bet_amount").notNull(), // cents; doubles on double-down
  playerCards: jsonb("player_cards").notNull().$type<number[]>(), // 0-51 deck indices
  dealerCards: jsonb("dealer_cards").notNull().$type<number[]>(), // 0-51 deck indices
  status: text("status").notNull(), // 'playing' | 'settled'
  result: text("result"), // 'blackjack' | 'player_bust' | 'dealer_bust' | 'player_win' | 'push' | 'dealer_win'
  payout: integer("payout"), // cents credited back on settlement; null until settled
  createdAt: timestamp("created_at").notNull().defaultNow(),
  settledAt: timestamp("settled_at"),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;
export type RefreshToken = typeof refreshTokens.$inferSelect;
export type InsertRefreshToken = typeof refreshTokens.$inferInsert;
export type GameSeed = typeof gameSeeds.$inferSelect;
export type InsertGameSeed = typeof gameSeeds.$inferInsert;
export type Bet = typeof bets.$inferSelect;
export type InsertBet = typeof bets.$inferInsert;
export type BlackjackHand = typeof blackjackHands.$inferSelect;
export type InsertBlackjackHand = typeof blackjackHands.$inferInsert;