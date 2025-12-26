"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { useCart } from "@/context/CartContext";
import { useSearchParams, useRouter } from "next/navigation";

/* ---------- TYPES ---------- */

type Item = {
  id: string;
  name: string;
  price_usd: number;
  stock: number;
  category_id: number;
};

type Category = {
  id: number;
  name: string;
  level: number;
  parent_id: number | null;
};

/* ---------- COMPONENT ---------- */

export default function HomeClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { cart, setCart } = useCart();

  /* ---------- STATE ---------- */
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState("");

  // hydration guard
  const [hydrated, setHydrated] = useState(false);

  // filters
  const [search, setSearch] = useState("");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedSubcategory, setSelectedSubcategory] = useState("all");

  // price filters
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  /* ---------- PAGINATION ---------- */
  const ITEMS_PER_PAGE = 20;
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));

  /* ---------- HYDRATION ---------- */

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    setSearch(searchParams.get("search") || "");
    setInStockOnly(searchParams.get("in_stock") === "1");
    setSelectedCategory(searchParams.get("category") || "all");
    setSelectedSubcategory(searchParams.get("subcategory") || "all");
    setMinPrice(searchParams.get("min_price") || "");
    setMaxPrice(searchParams.get("max_price") || "");
    setCurrentPage(Number(searchParams.get("page")) || 1);
  }, [hydrated, searchParams]);

  /* ---------- DATA FETCH ---------- */

  async function fetchItems() {
    try {
      const params = new URLSearchParams({
        limit: ITEMS_PER_PAGE.toString(),
        offset: ((currentPage - 1) * ITEMS_PER_PAGE).toString(),
      });

      if (search) params.append("search", search);
      if (inStockOnly) params.append("in_stock", "1");
      if (minPrice) params.append("min_price", minPrice);
      if (maxPrice) params.append("max_price", maxPrice);

      if (selectedSubcategory !== "all") {
        params.append("subcategory_id", selectedSubcategory);
      } else if (selectedCategory !== "all") {
        params.append("category_id", selectedCategory);
      }

      const data = await apiRequest(`/items?${params.toString()}`);
      setItems(Array.isArray(data.items) ? data.items : []);
      setTotalItems(Number(data.total) || 0);
    } catch (err: any) {
      setError(err.message || "Failed to fetch items");
    }
  }

  async function fetchCategories() {
    try {
      const data = await apiRequest("/categories");
      setCategories(Array.isArray(data.categories) ? data.categories : []);
    } catch {
      setCategories([]);
    }
  }

  /* ---------- URL SYNC ---------- */

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
    set("min_price", minPrice);
    set("max_price", maxPrice);
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
    minPrice,
    maxPrice,
    currentPage,
    router,
  ]);

  /* ---------- EFFECTS ---------- */

  useEffect(() => {
    if (!hydrated) return;
    fetchItems();
  }, [
    hydrated,
    search,
    selectedCategory,
    selectedSubcategory,
    inStockOnly,
    minPrice,
    maxPrice,
    currentPage,
  ]);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    setCurrentPage(1);
  }, [
    hydrated,
    search,
    selectedCategory,
    selectedSubcategory,
    inStockOnly,
    minPrice,
    maxPrice,
  ]);

  /* ---------- DERIVED ---------- */

  const mainCategories = categories.filter(c => c.level === 1);
  const subCategories =
    selectedCategory === "all"
      ? []
      : categories.filter(
          c => c.level === 2 && c.parent_id === Number(selectedCategory)
        );

  /* ---------- CART ---------- */

  function cartQuantity(itemId: string) {
    return cart.find(c => c.item_id === itemId)?.quantity || 0;
  }

  function remainingStock(item: Item) {
    return item.stock - cartQuantity(item.id);
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
          stock : item.stock,
        },
      ];
    });
  }

  function increaseQty(itemId: string) {
    setCart(prev => {
      const current = prev.find(i => i.item_id === itemId);
      if (!current) return prev;

      const remaining = getRemainingStock(itemId);
      if (remaining <= 0) return prev; // ⛔ block

      return prev.map(item =>
        item.item_id === itemId
          ? { ...item, quantity: item.quantity + 1 }
          : item
      );
    });
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

  function getRemainingStock(itemId: string) {
    const product = items.find(p => p.id === itemId);
    const inCart = cart.find(c => c.item_id === itemId)?.quantity || 0;
    return product ? product.stock - inCart : 0;
  }

  const total = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  /* ---------- RENDER ---------- */

  return (
    <main className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
      <section className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* FILTERS */}
        <div className="md:col-span-2 space-y-3">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search products…"
            className="w-full rounded border px-4 py-2"
          />

          <div className="flex flex-wrap gap-3">
            <input
              type="number"
              placeholder="Min $"
              value={minPrice}
              onChange={e => setMinPrice(e.target.value)}
              className="w-24 rounded border px-3 py-2"
            />

            <input
              type="number"
              placeholder="Max $"
              value={maxPrice}
              onChange={e => setMaxPrice(e.target.value)}
              className="w-24 rounded border px-3 py-2"
            />

            <select
              value={selectedCategory}
              onChange={e => {
                setSelectedCategory(e.target.value);
                setSelectedSubcategory("all");
              }}
              className="rounded border px-3 py-2"
            >
              <option value="all">All categories</option>
              {mainCategories.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {subCategories.length > 0 && (
              <select
                value={selectedSubcategory}
                onChange={e => setSelectedSubcategory(e.target.value)}
                className="rounded border px-3 py-2"
              >
                <option value="all">All subcategories</option>
                {subCategories.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={e => setInStockOnly(e.target.checked)}
            />
            In stock only
          </label>
        </div>

        {/* CART */}
        <aside className="border rounded p-4">
          <h2 className="text-xl font-semibold mb-2">Cart</h2>

          {cart.length === 0 && (
            <p className="text-gray-500 text-sm">Cart is empty</p>
          )}

          {cart.map(item => (
            <div
              key={item.item_id}
              className="flex items-center justify-between mb-2 text-sm"
            >
              <span className="flex-1">{item.name}</span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => decreaseQty(item.item_id)}
                  className="px-2 border rounded"
                >
                  −
                </button>

                <span>{item.quantity}</span>

                <button
                  onClick={() => increaseQty(item.item_id)}
                  disabled={getRemainingStock(item.item_id) <= 0}
                  className="px-2 border rounded disabled:opacity-40"
                >
                  +
                </button>
                <button
                  onClick={() => removeFromCart(item.item_id)}
                  className="text-red-600 text-xs"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}

          <p className="font-bold mt-3">
            Total: ${total.toFixed(2)}
          </p>

          <button
            onClick={() => router.push("/checkout")}
            className="mt-3 w-full bg-black text-white py-2 rounded"
          >
            Proceed to Checkout
          </button>

          {error && <p className="text-red-600 mt-2">{error}</p>}
        </aside>
      </section>

      {/* PRODUCTS */}
      <section className="md:col-span-2 space-y-4">
        {items
          .filter(item => item.price_usd > 0)
          .map(item => (
            <div
              key={item.id}
              className="border rounded p-4 flex justify-between"
            >
              <div>
                <h3 className="font-semibold">{item.name}</h3>
                <p>${item.price_usd.toFixed(2)}</p>
                <p className="text-sm text-gray-500">
                  Stock: {remainingStock(item)}
                </p>
              </div>

              <button
                onClick={() => addToCart(item)}
                disabled={remainingStock(item) <= 0}
                className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
              >
                Add
              </button>
            </div>
          ))}

        {totalPages > 1 && (
          <div className="flex justify-center gap-4">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
            >
              Previous
            </button>
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
            >
              Next
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
