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
  localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(items.slice(0, 8)));
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
  const {
    cart,
    cartCount,
    increaseQty,
    decreaseQty,
    clearCart
  } = useCart();

  const [location, setLocation] = useState(
    searchParams.get("location") || "29"
  );
  const [showLocations, setShowLocations] = useState(false);


  /* mounted guard */
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  /* search state */
  const [search, setSearch] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);

  const isTouch =
    typeof window !== "undefined" &&
    ("ontouchstart" in window || navigator.maxTouchPoints > 0);


  useEffect(() => {
    setSearch(searchParams.get("search") || "");
  }, [searchParams]);

  useEffect(() => {
    setLocation(searchParams.get("location") || "29");
  }, [searchParams]);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.location.pathname === "/" &&
      !searchParams.get("location")
    ) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("location", "29");
      router.replace(`/?${params.toString()}`);
    }
  }, [searchParams, router]);



  /* load history */
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

      if (res.ok) setHistory(await res.json());
    }

    if (mounted) load();
  }, [mounted, isAuthenticated]);

  /* submit search */
  async function submitSearch(value: string) {
    const q = value.trim();
    if (!q) return router.push("/");

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
        ...history.filter((h) => h.toLowerCase() !== q.toLowerCase()),
      ];
      saveLocalHistory(next);
      setHistory(next.slice(0, 8));
    }

    setShowHistory(false);
    setActiveIndex(-1);
    router.push(`/?search=${encodeURIComponent(q)}&location=${encodeURIComponent(location)}`
    );
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showHistory) {
      if (e.key === "Enter") submitSearch(search);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, history.length - 1));
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    }

    if (e.key === "Enter") {
      e.preventDefault();
      submitSearch(activeIndex >= 0 ? history[activeIndex] : search);
    }

    if (e.key === "Escape") {
      setShowHistory(false);
      setActiveIndex(-1);
    }
  }

  async function deleteHistoryItem(item: string) {
    const token = getToken();

    if (token) {
      await fetch(`/api/search-history/${encodeURIComponent(item)}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${token}` },
      });
    }

    const next = history.filter((h) => h !== item);
    saveLocalHistory(next);
    setHistory(next);
  }

  /* cart preview */
  const [cartOpen, setCartOpen] = useState(false);
  const cartTimer = useRef<NodeJS.Timeout | null>(null);

  function openCart() {
    if (cartTimer.current) clearTimeout(cartTimer.current);
    setCartOpen(true);
  }

  function closeCart() {
    cartTimer.current = setTimeout(() => setCartOpen(false), 150);
  }

  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);

  /* profile dropdown */
  const [profileOpen, setProfileOpen] = useState(false);
  const profileTimer = useRef<NodeJS.Timeout | null>(null);

  function openProfile() {
    if (profileTimer.current) clearTimeout(profileTimer.current);
    setProfileOpen(true);
  }

  function closeProfile() {
    profileTimer.current = setTimeout(() => setProfileOpen(false), 150);
  }

  /* close dropdowns on scroll (mobile) */
  useEffect(() => {
    function handleScroll() {
      setCartOpen(false);
      setProfileOpen(false);
    }

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  if (!mounted) return null;

  return (
    <nav className="navbar sticky top-0 z-50 bg-white/70 backdrop-blur-sm border-b navbar-border">
      {/* FULL WIDTH BAR */}
      <div className="w-full">
        {/* RESPONSIVE INNER CONTAINER */}
        <div className="px-2 sm:px-4 lg:px-8 xl:px-12">
          <div className="flex flex-wrap lg:flex-nowrap items-center gap-6 py-3">

            {/* BRAND */}
            <Link
              href="/"
              className="navbar-brand !text-black sm: text-2xl lg:text-4xl font-serif whitespace-nowrap order-1"
            >
              Royal Center
            </Link>

            {/* SEARCH */}
            <div className="relative w-full order-3 mt-2 lg:mt-0 lg:order-2 lg:flex-1 lg:max-w-5xl">
              <div className="flex relative h-12 sm:h-11">
                {/* LOCATION BUTTON */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowLocations((v) => !v)}
                    className="
                      navbar-btn
                      h-full
                      px-4
                      rounded-l-lg
                      border
                      flex items-center justify-center
                    "
                  >
                    <Image src="/location.png" alt="Location" width={18} height={18} />
                  </button>

                  {showLocations && (
                    <div
                      className="absolute left-0 top-full mt-1 w-28 bg-white border rounded-lg shadow-lg z-50"
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      {["29"].map((loc) => (
                        <button
                          key={loc}
                          onClick={() => {
                            setLocation(loc);
                            setShowLocations(false);

                            const params = new URLSearchParams(searchParams.toString());
                            params.set("location", loc);
                            router.push(`/?${params.toString()}`);
                          }}
                          className={`block w-full text-left px-3 py-2 hover:bg-black/5 ${
                            location === loc ? "font-semibold" : ""
                          }`}
                        >
                          {`Ubicación ${loc}`}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* SEARCH INPUT */}
                <input
                  ref={inputRef}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onFocus={() => setShowHistory(true)}
                  onBlur={() => setTimeout(() => setShowHistory(false), 150)}
                  onKeyDown={handleKeyDown}
                  placeholder="Buscar productos..."
                  className="navbar-input w-full px-4 py-2 bg-white/60 border border-r-0 focus:outline-none"
                />

                {/* SEARCH BUTTON */}
                <button
                  onClick={() => submitSearch(search)}
                  className="navbar-btn px-4 rounded-r-lg border"
                >
                  <Image src="/search.png" alt="Search" width={18} height={15} />
                </button>
              </div>


              {showHistory && history.length > 0 && (
                <div className="navbar-dropdown navbar-history absolute left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-50">
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
                        className="opacity-60 hover:opacity-100"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* RIGHT */}
            <div className="flex items-center gap-6 sm:text-md lg:text-xl ml-auto order-2 lg:order-3">
              {isAuthenticated ? (
                <>
                  {isAdmin && (
                    <>
                      <Link href="/admin/orders">Admin Ordenes</Link>
                      <Link href="/admin/payments">Admin Pagos</Link>
                    </>
                  )}

                  <div
                    className="relative"
                    onMouseEnter={openProfile}
                    onMouseLeave={closeProfile}
                  >
                    <button className="hover:underline">Perfil</button>

                    {profileOpen && (
                      <div className="navbar-dropdown absolute right-0 mt-2 w-48 bg-white rounded-xl elevation-xl">
                        <Link href="/account" className="block px-4 py-2 hover:bg-black/5">
                          Cuenta de Perfil
                        </Link>
                        <Link href="/orders" className="block px-4 py-2 hover:bg-black/5">
                          Ordenes
                        </Link>
                        <button
                          onClick={logout}
                          className="w-full text-left px-4 py-2 hover:bg-black/5"
                        >
                          Salir de Sesión
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <Link href="/login">Iniciar Sesión</Link>
              )}

              {/* CART */}
              <div
                className="relative"
                onMouseEnter={!isTouch ? openCart : undefined}
                onMouseLeave={!isTouch ? closeCart : undefined}
              >
                <button
                  onClick={() => {
                    if (isTouch) {
                      router.push("/checkout");
                    }
                  }}
                  className="relative flex items-center pr-1"
                >
                  <Image
                    src="/cart6.png"
                    alt="Cart"
                    width={30}
                    height={30}
                    className="align-middle"
                  />

                  {cart.length > 0 && (
                    <span className="navbar-badge absolute -top-2 -right-1 text-xs rounded-full px-1">
                      {cartCount}
                    </span>
                  )}
                </button>

                {/* DESKTOP ONLY CART PREVIEW */}
                {!isTouch && cartOpen && (
                  <div className="absolute right-0 top-full mt-2 w-80">
                    <CartSidebar
                      cart={cart}
                      total={total}
                      increase={increaseQty}
                      decrease={decreaseQty}
                      remove={clearCart}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
