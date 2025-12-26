"use client";

import { createContext, useContext, useEffect, useState } from "react";

type User = {
  userId: number;
  role: "admin" | "user";
};

type AuthContextType = {
  isAuthenticated: boolean;
  user: User | null;
  login: (token: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const isAuthenticated = !!user;

  /* ---------- LOAD TOKEN ON START ---------- */
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      setUser({
        userId: payload.userId,
        role: payload.role,
      });
    } catch {
      localStorage.removeItem("token");
      setUser(null);
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
      value={{ isAuthenticated, user, login, logout }}
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
