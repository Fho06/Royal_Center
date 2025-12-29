"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCart } from "@/app/context/CartContext";
import { useItems } from "./(shop)/hooks/UseItems";
import { useCategories } from "./(shop)/hooks/UseCategories";
import { Filters } from "./(shop)/components/Filters";
import { ProductList } from "./(shop)/components/ProductList";
import { CartSidebar } from "./(shop)/components/CartSidebar";
import { Pagination } from "./(shop)/components/Pagination";
import { useAuth } from "@/app/context/AuthContext";
import { Item } from "./(shop)/types";

/* ---------- CONSTANTS ---------- */

const ITEMS_PER_PAGE = 20;

/* ---------- COMPONENT ---------- */

export default function HomeClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { cart, setCart } = useCart();
  const user = useAuth().user;
  const isAdmin = user?.role === "admin";

  /* ---------- HYDRATION ---------- */

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  /* ---------- FILTER STATE ---------- */

  const [search, setSearch] = useState("");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedSubcategory, setSelectedSubcategory] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  /* ---------- URL → STATE ---------- */

  useEffect(() => {
    if (!hydrated) return;

    setSearch(searchParams.get("search") || "");
    setInStockOnly(searchParams.get("in_stock") === "1");
    setSelectedCategory(searchParams.get("category") || "all");
    setSelectedSubcategory(searchParams.get("subcategory") || "all");
    setCurrentPage(Number(searchParams.get("page")) || 1);
  }, [hydrated, searchParams]);

  /* ---------- STATE → URL ---------- */

  useEffect(() => {
    if (!hydrated) return;

    const url = new URL(window.location.href);
    const set = (k: string, v: string | null) => {
      if (!v || v === "all") url.searchParams.delete(k);
      else url.searchParams.set(k, v);
    };

    set("search", search);
    set("category", selectedCategory);
    set("subcategory", selectedSubcategory);
    set("in_stock", inStockOnly ? "1" : null);
    set("page", currentPage.toString());

    router.replace(url.pathname + "?" + url.searchParams.toString(), {
      scroll: false,
    });
  }, [
    hydrated,
    search,
    selectedCategory,
    selectedSubcategory,
    inStockOnly,
    currentPage,
    router,
  ]);

  /* ---------- RESET PAGE ON FILTER CHANGE ---------- */

  useEffect(() => {
    if (!hydrated) return;
    setCurrentPage(1);
  }, [hydrated, search, selectedCategory, selectedSubcategory, inStockOnly]);

  /* ---------- DATA ---------- */

  const categories = useCategories();

  const { items, total, error } = useItems({
    search,
    category: selectedCategory,
    subcategory: selectedSubcategory,
    inStockOnly,
    page: currentPage,
    limit: ITEMS_PER_PAGE,
  });

  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));

  /* ---------- CART HELPERS ---------- */

  function cartQty(itemId: string) {
    return cart.find(c => c.item_id === itemId)?.quantity || 0;
  }

  function remainingStock(item: Item) {
    return item.stock - cartQty(item.id);
  }

  function getRemainingStock(itemId: string) {
    const product = items.find(p => p.id === itemId);
    return product ? product.stock - cartQty(itemId) : 0;
  }

  function addToCart(item: Item) {
    if (remainingStock(item) <= 0) return;

    setCart(prev => {
      const existing = prev.find(c => c.item_id === item.id);
      if (existing) {
        return prev.map(c =>
          c.item_id === item.id
            ? { ...c, quantity: c.quantity + 1 }
            : c
        );
      }

      return [
        ...prev,
        {
          item_id: item.id,
          name: item.name,
          price: item.price_usd,
          quantity: 1,
          stock: item.stock,
        },
      ];
    });
  }

  function increaseQty(itemId: string) {
    if (getRemainingStock(itemId) <= 0) return;

    setCart(prev =>
      prev.map(item =>
        item.item_id === itemId
          ? { ...item, quantity: item.quantity + 1 }
          : item
      )
    );
  }

  function decreaseQty(itemId: string) {
    setCart(prev =>
      prev
        .map(item =>
          item.item_id === itemId
            ? { ...item, quantity: item.quantity - 1 }
            : item
        )
        .filter(item => item.quantity > 0)
    );
  }

  function removeFromCart(itemId: string) {
    setCart(prev => prev.filter(item => item.item_id !== itemId));
  }

  const totalPrice = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  /* ---------- RENDER ---------- */

  return (
    <main className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
      <section className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* FILTERS */}
        <div className="md:col-span-2 space-y-3">
          <Filters
            search={search}
            setSearch={setSearch}
            inStockOnly={inStockOnly}
            setInStockOnly={setInStockOnly}
            categories={categories}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            selectedSubcategory={selectedSubcategory}
            setSelectedSubcategory={setSelectedSubcategory}
            isAdmin={isAdmin}
          />
        </div>

        {/* CART */}
        <CartSidebar
          cart={cart}
          total={totalPrice}
          increase={increaseQty}
          decrease={decreaseQty}
          remove={removeFromCart}
          canIncrease={id => getRemainingStock(id) > 0}
        />
      </section>

      {/* PRODUCTS */}
      <section className="md:col-span-2 space-y-4">
        <ProductList
          items={items}
          remainingStock={remainingStock}
          addToCart={addToCart}
        />

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPrev={() => setCurrentPage(p => Math.max(1, p - 1))}
          onNext={() =>
            setCurrentPage(p => Math.min(totalPages, p + 1))
          }
        />

        {error && (
          <p className="text-red-600 text-sm mt-2">{error}</p>
        )}
      </section>
    </main>
  );
}
