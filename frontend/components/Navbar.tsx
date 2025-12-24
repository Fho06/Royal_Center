"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { isLoggedIn, logout } from "@/lib/auth";

export default function Navbar() {
  const router = useRouter();
  const loggedIn = isLoggedIn();

  function handleLogout() {
    logout();
    router.push("/login");
  }

  return (
    <nav className="flex items-center justify-between border-b px-6 py-4">
      <Link href="/" className="text-lg font-bold">
        RoyalCenter
      </Link>

      <div className="flex gap-4 items-center">
        {loggedIn ? (
          <>
            <Link href="/orders" className="hover:underline">
              Orders
            </Link>

            <button
              onClick={handleLogout}
              className="rounded border px-3 py-1"
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link href="/login" className="hover:underline">
              Login
            </Link>
            <Link href="/register" className="hover:underline">
              Register
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
