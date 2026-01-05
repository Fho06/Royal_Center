"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { NavbarSearch } from "./NavbarSearch";
import { NavbarCart } from "./NavbarCart";
import { NavbarProfile } from "./NavbarProfile";
import { useAuth } from "@/app/context/AuthContext";

export default function Navbar() {
  /* =====================
     ALL HOOKS FIRST
     ===================== */

  const { isAuthenticated, user } = useAuth();
  const isAdmin = user?.role === "admin";

  const router = useRouter();

  const [mounted, setMounted] = useState(false);

  const isTouch =
    typeof window !== "undefined" &&
    ("ontouchstart" in window || navigator.maxTouchPoints > 0);

  // cart open state
  const [cartOpen, setCartOpen] = useState(false);
  const cartTimer = useRef<NodeJS.Timeout | null>(null);

  /* =====================
     EFFECTS
     ===================== */

  useEffect(() => {
    setMounted(true);
  }, []);

  function openCart() {
    if (cartTimer.current) clearTimeout(cartTimer.current);
    setCartOpen(true);
  }

  function closeCart() {
    cartTimer.current = setTimeout(() => setCartOpen(false), 150);
  }

  // close on scroll (matches original)
  useEffect(() => {
    function handleScroll() {
      setCartOpen(false);
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // close on click outside
  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const nav = document.querySelector("nav.navbar");
      if (nav && nav.contains(target)) return;

      setCartOpen(false);
    }

    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  /* =====================
     HYDRATION GUARD
     ===================== */

  if (!mounted) return null;

  /* =====================
     RENDER
     ===================== */

  return (
    <nav className="navbar sticky top-0 z-50 bg-white/70 backdrop-blur-sm border-b navbar-border">
      <div className="w-full">
        <div className="px-2 sm:px-4 lg:px-8 xl:px-12">
          <div className="flex flex-wrap lg:flex-nowrap items-center gap-6 py-3">
            {/* BRAND */}
            <Link
              href="/"
              className="navbar-brand !text-black text-2xl sm:text-2xl lg:text-4xl font-serif whitespace-nowrap order-1"
            >
              Royal Center
            </Link>

            {/* SEARCH */}
            <div className="w-full order-3 mr-2 mt-2 px-1 sm:px-0 lg:mt-0 lg:order-2 lg:flex-1 lg:max-w-5xl">
              <NavbarSearch />
            </div>

            {/* RIGHT */}
            <div className="flex items-center gap-6 sm:text-md lg:text-xl ml-auto order-2 lg:order-3 flex-shrink-0">
              {isAuthenticated ? (
                <>
                  {isAdmin && (
                    <>
                      <Link href="/admin/orders">Admin Ordenes</Link>
                      <Link href="/admin/payments">Admin Pagos</Link>
                    </>
                  )}
                  <NavbarProfile />
                </>
              ) : (
                <Link href="/login">Iniciar Sesión</Link>
              )}

              <NavbarCart
                isTouch={isTouch}
                open={cartOpen}
                openCart={openCart}
                closeCart={closeCart}
                onMobileClick={() => router.push("/checkout")}
              />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
