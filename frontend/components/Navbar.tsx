"use client";

import Link from "next/link";
import { useAuth } from "@/app/context/AuthContext";

export default function Navbar() {
  const { isAuthenticated, logout } = useAuth();

  return (
    <nav className="flex items-center justify-between border-b p-4">
      <Link href="/" className="font-bold">
        Royal Center
      </Link>

      <div className="flex gap-4">
        {isAuthenticated ? (
          <>
            <Link href="/orders">Orders</Link>
            <button
              onClick={logout}
              className="text-sm underline"
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link href="/login">Login</Link>
            <Link href="/register">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
}
