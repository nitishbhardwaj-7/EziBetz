import React, { createContext, useContext, useState } from "react";

interface User {
  username: string;
  email: string;
  displayName: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  login: async () => ({ success: false }),
  logout: () => {},
  updateProfile: () => {},
});

const DEMO_USER: User = {
  username: "ezibetz_player",
  email: "player@ezibetz.com",
  displayName: "Ezibetz Player",
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    // Simulate async login
    await new Promise((resolve) => setTimeout(resolve, 800));
    if (!email.trim() || !password.trim()) {
      return { success: false, error: "Please fill in all fields" };
    }
    if (password.length < 4) {
      return { success: false, error: "Password must be at least 4 characters" };
    }
    const newUser: User = {
      username: email.split("@")[0].replace(/[^a-z0-9_]/gi, "_"),
      email: email.trim().toLowerCase(),
      displayName: email.split("@")[0],
    };
    setUser(newUser);
    return { success: true };
  };

  const logout = () => {
    setUser(null);
  };

  const updateProfile = (data: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...data });
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated: !!user, user, login, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
