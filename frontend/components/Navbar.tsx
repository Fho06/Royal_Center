"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { useCart } from "@/app/context/CartContext";
import { CartSidebar } from "@/app/(shop)/components/CartSidebar";

/* =========================
   SEARCH HISTORY HELPERS
   ========================= */

const LOCAL_HISTORY_KEY = "royal_center_search_history";

function loadLocalHistory(): string[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveLocalHistory(items: string[]) {
  localStorage.setItem(
    LOCAL_HISTORY_KEY,
    JSON.stringify(items.slice(0, 8))
  );
}

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

/* =========================
   COMPONENT
   ========================= */

export default function Navbar() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { isAuthenticated, user, logout } = useAuth();
  const isAdmin = user?.role === "admin";
  const { cart, setCart } = useCart();

  /* =========================
     SEARCH STATE
     ========================= */
  const [search, setSearch] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSearch(searchParams.get("search") || "");
  }, [searchParams]);

  /* =========================
     LOAD SEARCH HISTORY
     ========================= */
  useEffect(() => {
    async function load() {
      const token = getToken();
      if (!token) {
        setHistory(loadLocalHistory());
        return;
      }

      const res = await fetch("/api/search-history", {
        headers: { authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setHistory(await res.json());
      }
    }

    load();
  }, [isAuthenticated]);

  /* =========================
     SUBMIT SEARCH
     ========================= */
  async function submitSearch(value: string) {
    const q = value.trim();
    if (!q) {
      router.push("/");
      return;
    }

    const token = getToken();

    if (token) {
      await fetch("/api/search-history", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ query: q }),
      });
    } else {
      const next = [
        q,
        ...history.filter(
          (h) => h.toLowerCase() !== q.toLowerCase()
        ),
      ];
      saveLocalHistory(next);
      setHistory(next.slice(0, 8));
    }

    setShowHistory(false);
    setActiveIndex(-1);
    router.push(`/?search=${encodeURIComponent(q)}`);
  }

  /* =========================
     SEARCH KEYBOARD NAV
     ========================= */
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showHistory) {
      if (e.key === "Enter") submitSearch(search);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) =>
        Math.min(i + 1, history.length - 1)
      );
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    }

    if (e.key === "Enter") {
      e.preventDefault();
      submitSearch(
        activeIndex >= 0 ? history[activeIndex] : search
      );
    }

    if (e.key === "Escape") {
      setShowHistory(false);
      setActiveIndex(-1);
    }
  }

  async function deleteHistoryItem(item: string) {
    const token = getToken();

    if (token) {
      await fetch(
        `/api/search-history/${encodeURIComponent(item)}`,
        {
          method: "DELETE",
          headers: { authorization: `Bearer ${token}` },
        }
      );
    }

    const next = history.filter((h) => h !== item);
    saveLocalHistory(next);
    setHistory(next);
  }

  /* =========================
     CART PREVIEW
     ========================= */
  const [cartOpen, setCartOpen] = useState(false);
  const closeTimer = useRef<NodeJS.Timeout | null>(null);

  function openCart() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setCartOpen(true);
  }

  function closeCart() {
    closeTimer.current = setTimeout(() => {
      setCartOpen(false);
    }, 150);
  }

  const total = cart.reduce(
    (sum, it) => sum + it.price * it.quantity,
    0
  );

  function handleLogout() {
    logout();
  }

  /* =========================
     RENDER
     ========================= */

  return (
    <nav className="sticky top-0 z-50 bg-white/70 backdrop-blur-xl border-b">
      <div className="flex flex-wrap lg:flex-nowrap items-center gap-6 px-6 py-4">
        {/* LEFT */}
        <Link
          href="/"
          className="text-2xl font-serif whitespace-nowrap order-1"
        >
          Royal Center
        </Link>

        {/* SEARCH */}
        <div className="relative w-full order-3 lg:order-2 lg:flex-1 lg:max-w-5xl">
          <div className="flex">
            <input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => setShowHistory(true)}
              onBlur={() =>
                setTimeout(() => setShowHistory(false), 150)
              }
              onKeyDown={handleKeyDown}
              placeholder="Buscar productos..."
              className="w-full px-4 py-2 rounded-l-lg bg-white/60 border border-r-0 focus:outline-none"
            />

            <button
              onClick={() => submitSearch(search)}
              className="px-4 rounded-r-lg bg-[#A9A9A9] hover:bg-[#808080] border"
            >
              <Image
                src="/search.png"
                alt="Search"
                width={18}
                height={18}
              />
            </button>
          </div>

          {/* SEARCH HISTORY */}
          {showHistory && history.length > 0 && (
            <div className="absolute left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-50">
              {history.map((item, i) => (
                <div
                  key={item}
                  className={`flex justify-between px-3 py-2 cursor-pointer ${
                    i === activeIndex ? "bg-black/5" : ""
                  }`}
                  onMouseDown={() => submitSearch(item)}
                >
                  <span className="truncate">{item}</span>
                  <button
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      deleteHistoryItem(item);
                    }}
                    className="text-gray-400 hover:text-black"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-6 ml-auto order-2 lg:order-3">
          {isAuthenticated ? (
            <>
              <Link href="/orders">Ordenes</Link>
              {isAdmin && (
                <>
                  <Link href="/admin/orders">Admin Orders</Link>
                  <Link href="/admin/payments">
                    Admin Payments
                  </Link>
                </>
              )}
              <button onClick={handleLogout}>Salir</button>
            </>
          ) : (
            <Link href="/login">Iniciar Sesión</Link>
          )}

          {/* CART */}
          <div
            className="relative"
            onMouseEnter={openCart}
            onMouseLeave={closeCart}
          >
            <button
              onClick={() => router.push("/checkout")}
              className="relative w-10 h-10"
            >
              <Image src="/cart.webp" alt="Cart" fill />
              {cart.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-black text-white text-xs rounded-full px-1">
                  {cart.length}
                </span>
              )}
            </button>

            {cartOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border">
                <CartSidebar
                  cart={cart}
                  total={total}
                  increase={() => {}}
                  decrease={(id) =>
                    setCart((prev) =>
                      prev
                        .map((it) =>
                          it.item_id === id
                            ? {
                                ...it,
                                quantity: it.quantity - 1,
                              }
                            : it
                        )
                        .filter((it) => it.quantity > 0)
                    )
                  }
                  remove={(id) =>
                    setCart((prev) =>
                      prev.filter(
                        (it) => it.item_id !== id
                      )
                    )
                  }
                  canIncrease={() => true}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
