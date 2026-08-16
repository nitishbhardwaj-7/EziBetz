import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  setBaseUrl,
  setAuthTokenGetter,
  setUnauthorizedHandler,
  login as apiLogin,
  register as apiRegister,
  getMe as apiGetMe,
  refresh as apiRefresh,
  logout as apiLogout,
} from "@workspace/api-client-react";

// Initialize base URL for the backend API
setBaseUrl("http://localhost:3000");

// Token storage keys
const TOKEN_KEY = "@ezibetz_auth_token";
const REFRESH_TOKEN_KEY = "@ezibetz_refresh_token";

async function storeTokens(token: string, refreshToken: string) {
  await AsyncStorage.multiSet([
    [TOKEN_KEY, token],
    [REFRESH_TOKEN_KEY, refreshToken],
  ]);
}

async function clearTokens() {
  await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_TOKEN_KEY]);
}

// Register bearer token getter for customFetch
setAuthTokenGetter(async () => {
  try {
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
});

// Access tokens are short-lived (15 min). When a request comes back 401,
// this exchanges the stored refresh token for a new pair and lets
// customFetch retry the original request once. Concurrent 401s share a
// single in-flight refresh instead of each racing to use (and invalidate)
// the same refresh token.
let inFlightRefresh: Promise<boolean> | null = null;

setUnauthorizedHandler(async () => {
  if (!inFlightRefresh) {
    inFlightRefresh = (async () => {
      try {
        const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
        if (!refreshToken) return false;
        const response = await apiRefresh({ refreshToken });
        await storeTokens(response.token, response.refreshToken);
        return true;
      } catch {
        await clearTokens();
        return false;
      } finally {
        inFlightRefresh = null;
      }
    })();
  }
  return inFlightRefresh;
});

export interface User {
  id: number;
  username: string;
  email: string;
  displayName?: string;
  balance: number;
  createdAt: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, username: string, displayName?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isLoading: true,
  user: null,
  login: async () => ({ success: false }),
  register: async () => ({ success: false }),
  logout: async () => {},
  updateProfile: () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      if (token) {
        // If the access token has expired, customFetch's unauthorized
        // handler transparently refreshes it and retries this call.
        const userData = await apiGetMe();
        setUser(userData);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
      await clearTokens();
    } finally {
      setIsLoading(false);
    }
  };

  // Load user profile on mount
  useEffect(() => {
    void refreshUser();
  }, []);

  const login = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!email.trim() || !password.trim()) {
      return { success: false, error: "Please fill in all fields" };
    }
    try {
      const response = await apiLogin({ email: email.trim().toLowerCase(), password });
      await storeTokens(response.token, response.refreshToken);
      setUser(response.user);
      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: err.data?.error || err.message || "Failed to log in",
      };
    }
  };

  const register = async (
    email: string,
    password: string,
    username: string,
    displayName?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!email.trim() || !password.trim() || !username.trim()) {
      return { success: false, error: "Please fill in all required fields" };
    }
    try {
      const response = await apiRegister({
        email: email.trim().toLowerCase(),
        password,
        username: username.trim().toLowerCase(),
        displayName: displayName?.trim(),
      });
      await storeTokens(response.token, response.refreshToken);
      setUser(response.user);
      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: err.data?.error || err.message || "Registration failed",
      };
    }
  };

  const logout = async () => {
    try {
      const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
      if (refreshToken) {
        // Best-effort: revoke server-side so the refresh token can't be
        // replayed later. A network failure here shouldn't block logout.
        await apiLogout({ refreshToken }).catch(() => {});
      }
    } finally {
      await clearTokens();
      setUser(null);
    }
  };

  const updateProfile = (data: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...data });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!user,
        isLoading,
        user,
        login,
        register,
        logout,
        updateProfile,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
