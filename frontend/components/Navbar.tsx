"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { useCart } from "@/app/context/CartContext";
import { CartSidebar } from "@/app/(shop)/components/CartSidebar";

export default function Navbar() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { isAuthenticated, user, logout } = useAuth();
  const isAdmin = user?.role === "admin";

  const { cart, setCart } = useCart();

  /* =========================
     SEARCH STATE (URL-DRIVEN)
     ========================= */
  const [search, setSearch] = useState("");

  useEffect(() => {
    setSearch(searchParams.get("search") || "");
  }, [searchParams]);

  const inputRef = useRef<HTMLInputElement>(null);
  const justFocused = useRef(false);

  function submitSearch(value: string) {
    const q = value.trim();
    router.push(q ? `/?search=${encodeURIComponent(q)}` : "/");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") submitSearch(search);
    if (e.key === "Escape") submitSearch("");
  }

  /* =========================
     CART STATE (hover preview)
     ========================= */
  const [cartOpen, setCartOpen] = useState(false);
  const cartRef = useRef<HTMLDivElement>(null);

  // Close cart preview when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        cartRef.current &&
        !cartRef.current.contains(e.target as Node)
      ) {
        setCartOpen(false);
      }
    }

    if (cartOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [cartOpen]);

  /* =========================
     CART HELPERS (preview only)
     ========================= */
  const total = cart.reduce(
    (sum, it) => sum + it.price * it.quantity,
    0
  );

  const canIncrease = () => true;

  function handleLogout() {
    logout();
  }

  return (
    <nav
      className="
        sticky top-0 z-50
        relative overflow-visible
        flex items-center justify-between gap-6
        px-6 py-4
        bg-white/70 backdrop-blur-xl
      "
    >
      {/* LEFT */}
      <Link href="/" className="font-bold whitespace-nowrap ml-5 mr-20 text-[30px] font-['Times_New_Roman',Times,serif]">
        Royal Center
      </Link>

      {/* CENTER SEARCH */}
      <input
        ref={inputRef}
        type="text"
        placeholder="Buscar productos..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          justFocused.current = true;
          requestAnimationFrame(() => inputRef.current?.select());
        }}
        onMouseDown={(e) => {
          if (justFocused.current) e.preventDefault();
        }}
        onMouseUp={() => {
          justFocused.current = false;
        }}
        onKeyUp={() => {
          justFocused.current = false;
        }}
        className="
          w-full max-w
          px-4 py-2
          rounded-lg
          bg-white/60 backdrop-blur-md
          border
          focus:outline-none
        "
      />

      {/* RIGHT */}
      <div className="flex items-center gap-6 whitespace-nowrap">
        {isAuthenticated ? (
          <>
            <Link href="/orders" className="font-semibold">
              Ordenes
            </Link>

            {isAdmin && (
              <>
                <Link href="/admin/orders">Admin Orders</Link>
                <Link href="/admin/payments">Admin Payments</Link>
              </>
            )}

            <button
              onClick={handleLogout}
              className="font-semibold"
            >
              Salir Sesión
            </button>
          </>
        ) : (
          <Link href="/login" className="font-semibold">
            Iniciar Sesión
          </Link>
        )}

        {/* CART — hover preview, click = go to checkout */}
        <div
          ref={cartRef}
          className="relative"
          onMouseEnter={() => setCartOpen(true)}
          onMouseLeave={() => setCartOpen(false)}
        >
          <button
            className="relative w-10 h-10"
            onClick={() => {
              setCartOpen(false);
              router.push("/checkout");
            }}
          >
            <Image
              src="/cart.webp"
              alt="Cart"
              fill
              className="object-contain"
              priority
            />

            {cart.length > 0 && (
              <span className="absolute -top-2 -right-2 text-xs bg-black text-white rounded-full px-1">
                {cart.length}
              </span>
            )}
          </button>

          {cartOpen && (
            <div
              className="
                absolute right-0 top-full mt-1
                w-80
                bg-white
                rounded-xl
                shadow-xl
                border
              "
            >
              <CartSidebar
                cart={cart}
                total={total}
                increase={() => {}}
                decrease={(id) =>
                  setCart((prev) =>
                    prev
                      .map((it) =>
                        it.item_id === id
                          ? { ...it, quantity: it.quantity - 1 }
                          : it
                      )
                      .filter((it) => it.quantity > 0)
                  )
                }
                remove={(id) =>
                  setCart((prev) =>
                    prev.filter((it) => it.item_id !== id)
                  )
                }
                canIncrease={canIncrease}
              />
            </div>
          )}
        </div>
      </div>

      {/* bottom divider */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-black/10" />
    </nav>
  );
}
