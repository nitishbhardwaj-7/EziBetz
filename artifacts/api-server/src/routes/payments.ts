import { Router, type IRouter } from "express";
import { db, users, transactions } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import { DepositBody, WithdrawBody } from "@workspace/api-zod";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth";

const router: IRouter = Router();

router.post("/payments/deposit", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const parseResult = DepositBody.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: "Invalid body", details: parseResult.error.format() });
      return;
    }

    const { amount } = parseResult.data; // in cents
    if (amount <= 0) {
      res.status(400).json({ error: "Deposit amount must be greater than zero" });
      return;
    }

    const user = req.user!;

    // Balance is updated with a single conditional SQL expression (balance
    // = balance + amount) rather than read-then-write, so concurrent
    // requests for the same user can't race and lose an update.
    const [txn] = await db.transaction(async (tx) => {
      const [updatedUser] = await tx
        .update(users)
        .set({ balance: sql`${users.balance} + ${amount}` })
        .where(eq(users.id, user.id))
        .returning();

      if (!updatedUser) {
        throw new Error("User not found during deposit");
      }

      const [transactionRecord] = await tx
        .insert(transactions)
        .values({
          userId: user.id,
          amount: amount,
          type: "deposit",
          status: "completed",
        })
        .returning();

      return [transactionRecord];
    });

    res.json({
      id: txn.id,
      userId: txn.userId,
      amount: txn.amount,
      type: txn.type,
      status: txn.status,
      createdAt: txn.createdAt.toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: "Deposit failed", details: err.message });
  }
});

router.post("/payments/withdraw", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const parseResult = WithdrawBody.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: "Invalid body", details: parseResult.error.format() });
      return;
    }

    const { amount } = parseResult.data; // in cents
    if (amount <= 0) {
      res.status(400).json({ error: "Withdrawal amount must be greater than zero" });
      return;
    }

    const user = req.user!;

    // The WHERE clause re-checks the balance at the database level, in the
    // same statement as the debit, so a burst of concurrent withdrawals
    // can't each read a stale balance and collectively overdraw the account.
    const [txn] = await db.transaction(async (tx) => {
      const [updatedUser] = await tx
        .update(users)
        .set({ balance: sql`${users.balance} - ${amount}` })
        .where(sql`${users.id} = ${user.id} AND ${users.balance} >= ${amount}`)
        .returning();

      if (!updatedUser) {
        return [null];
      }

      const [transactionRecord] = await tx
        .insert(transactions)
        .values({
          userId: user.id,
          amount: -amount, // negative for withdrawal
          type: "withdrawal",
          status: "completed",
        })
        .returning();

      return [transactionRecord];
    });

    if (!txn) {
      res.status(400).json({ error: "Insufficient balance" });
      return;
    }

    res.json({
      id: txn.id,
      userId: txn.userId,
      amount: txn.amount,
      type: txn.type,
      status: txn.status,
      createdAt: txn.createdAt.toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: "Withdrawal failed", details: err.message });
  }
});

router.get("/payments/history", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const user = req.user!;
    const history = await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, user.id))
      .orderBy(desc(transactions.createdAt));

    res.json(
      history.map((txn) => ({
        id: txn.id,
        userId: txn.userId,
        amount: txn.amount,
        type: txn.type,
        status: txn.status,
        createdAt: txn.createdAt.toISOString(),
      }))
    );
  } catch (err: any) {
    res.status(500).json({ error: "Failed to retrieve transaction history", details: err.message });
  }
});

export default router;
