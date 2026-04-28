import React, { createContext, useContext, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface BalanceContextType {
  balance: number;
  updateBalance: (delta: number) => void;
  formatBalance: (amount: number) => string;
}

const BalanceContext = createContext<BalanceContextType>({
  balance: 12450,
  updateBalance: () => {},
  formatBalance: (n) => `$${n.toFixed(2)}`,
});

export function BalanceProvider({ children }: { children: React.ReactNode }) {
  const [balance, setBalance] = useState(12450);

  const updateBalance = (delta: number) => {
    setBalance((prev) => Math.max(0, prev + delta));
  };

  const formatBalance = (amount: number) => {
    return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <BalanceContext.Provider value={{ balance, updateBalance, formatBalance }}>
      {children}
    </BalanceContext.Provider>
  );
}

export function useBalance() {
  return useContext(BalanceContext);
}
