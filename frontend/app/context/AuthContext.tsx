"use client";

import { createContext, useContext, useEffect, useState } from "react";

type User = {
  userId: number;
  role: "admin" | "user";
};

type AuthContextType = {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  login: (token: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const isAuthenticated = !!user;

  /* ---------- LOAD TOKEN ON START ---------- */
  useEffect(() => {
    const token = localStorage.getItem("token");
      if (!token) {
        setLoading(false);
        return;
      }
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      setUser({
        userId: payload.userId,
        role: payload.role,
      });
    } catch {
      localStorage.removeItem("token");
    } finally {
      setLoading(false);
    }
  }, []);

  /* ---------- LOGIN ---------- */
  function login(token: string) {
    localStorage.setItem("token", token);

    const payload = JSON.parse(atob(token.split(".")[1]));
    setUser({
      userId: payload.userId,
      role: payload.role,
    });
  }

  /* ---------- LOGOUT ---------- */
  function logout() {
    localStorage.removeItem("token");
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, user, loading, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
