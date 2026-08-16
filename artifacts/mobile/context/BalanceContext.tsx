import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { deposit as apiDeposit, withdraw as apiWithdraw } from "@workspace/api-client-react";

interface BalanceContextType {
  balance: number;
  updateBalance: (delta: number) => Promise<void>;
  /**
   * Sync local balance directly from a server-reported value (in cents),
   * e.g. `balanceAfter` from a settled bet. Used instead of `updateBalance`
   * for games, where the server already computed the new balance as part
   * of settling the bet — there's nothing left to "sync to the backend".
   */
  setBalanceFromCents: (cents: number) => void;
  formatBalance: (amount: number) => string;
}

const BalanceContext = createContext<BalanceContextType>({
  balance: 12450,
  updateBalance: async () => {},
  setBalanceFromCents: () => {},
  formatBalance: (n) => `$${n.toFixed(2)}`,
});

export function BalanceProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, refreshUser } = useAuth();
  const [balance, setBalance] = useState(12450);

  // Sync with user balance from backend when user/auth state changes
  useEffect(() => {
    if (isAuthenticated && user) {
      setBalance(user.balance / 100);
    } else {
      setBalance(12450); // reset to default demo balance on logout
    }
  }, [user, isAuthenticated]);

  const updateBalance = async (delta: number) => {
    // Optimistic update for fast UI
    setBalance((prev) => Math.max(0, prev + delta));

    if (isAuthenticated && user) {
      try {
        const amountCents = Math.round(Math.abs(delta) * 100);
        if (amountCents > 0) {
          if (delta > 0) {
            // Positive change -> Deposit (or Game Win)
            await apiDeposit({ amount: amountCents });
          } else {
            // Negative change -> Withdrawal (or Game Bet/Loss)
            await apiWithdraw({ amount: amountCents });
          }
          // Fetch fresh user profile & balance from server
          await refreshUser();
        }
      } catch (err) {
        console.error("Failed to sync balance change with backend database:", err);
      }
    }
  };

  const setBalanceFromCents = (cents: number) => {
    setBalance(cents / 100);
    // Keep AuthContext's `user.balance` eventually consistent too, without
    // blocking on it — the UI already has the authoritative new balance.
    if (isAuthenticated) void refreshUser();
  };

  const formatBalance = (amount: number) => {
    return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <BalanceContext.Provider value={{ balance, updateBalance, setBalanceFromCents, formatBalance }}>
      {children}
    </BalanceContext.Provider>
  );
}

export function useBalance() {
  return useContext(BalanceContext);
}
