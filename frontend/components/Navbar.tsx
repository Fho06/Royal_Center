"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { logout, getToken } from "@/lib/auth";
import { useRouter, usePathname } from "next/navigation";

export default function Navbar() {
  const [loggedIn, setLoggedIn] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Re-check auth whenever the route changes
  useEffect(() => {
    setLoggedIn(!!getToken());
  }, [pathname]);

  function handleLogout() {
    logout();
    setLoggedIn(false);
    router.push("/login");
  }

  return (
    <nav className="flex items-center justify-between border-b px-6 py-4">
      <Link href="/" className="text-xl font-bold">
        Royal Center
      </Link>

      <div className="flex items-center gap-6">
        {loggedIn && (
          <Link href="/orders" className="hover:underline">
            Orders
          </Link>
        )}

        {loggedIn ? (
          <button
            onClick={handleLogout}
            className="rounded bg-black px-3 py-1 text-white"
          >
            Logout
          </button>
        ) : (
          <Link href="/login" className="hover:underline">
            Login
          </Link>
        )}
      </div>
    </nav>
  );
}
