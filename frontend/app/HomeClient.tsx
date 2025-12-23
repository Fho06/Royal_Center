"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { useCart } from "@/context/CartContext";
import { isLoggedIn } from "@/lib/auth";
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
  const [message, setMessage] = useState("");

  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [sortOrder, setSortOrder] = useState<"none" | "asc" | "desc">(
    (searchParams.get("sort") as any) || "none"
  );
  const [inStockOnly, setInStockOnly] =
    useState(searchParams.get("in_stock") === "1");

  const [selectedCategory, setSelectedCategory] =
    useState(searchParams.get("category") || "all");
  const [selectedSubcategory, setSelectedSubcategory] =
    useState(searchParams.get("subcategory") || "all");

  /* ---------- PAGINATION ---------- */
  const ITEMS_PER_PAGE = 20;
  const [currentPage, setCurrentPage] =
    useState(Number(searchParams.get("page")) || 1);
  const [totalItems, setTotalItems] = useState(0);

  /* ---------- DATA FETCH ---------- */

  async function fetchItems() {
    try {
      const params = new URLSearchParams({
        limit: ITEMS_PER_PAGE.toString(),
        offset: ((currentPage - 1) * ITEMS_PER_PAGE).toString(),
      });

      if (search) params.append("search", search);
      if (inStockOnly) params.append("in_stock", "1");
      if (selectedCategory !== "all")
        params.append("category_id", selectedCategory);
      if (selectedSubcategory !== "all")
        params.append("subcategory_id", selectedSubcategory);
      if (sortOrder !== "none") params.append("sort", sortOrder);

      const data = await apiRequest(`/items?${params.toString()}`);

      setItems(Array.isArray(data.items) ? data.items : []);
      setTotalItems(Number(data.total) || 0);
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function fetchCategories() {
    try {
      const data = await apiRequest("/categories");
      setCategories(Array.isArray(data.categories) ? data.categories : []);
    } catch {
      console.error("Failed to load categories");
      setCategories([]);
    }
  }

  /* ---------- URL SYNC ---------- */

  function syncUrl(params: Record<string, string | null>) {
    const url = new URL(window.location.href);

    Object.entries(params).forEach(([key, value]) => {
      if (!value || value === "all" || value === "none") {
        url.searchParams.delete(key);
      } else {
        url.searchParams.set(key, value);
      }
    });

    router.replace(url.pathname + "?" + url.searchParams.toString(), {
      scroll: false,
    });
  }

  /* ---------- EFFECTS ---------- */

  useEffect(() => {
    syncUrl({
      search,
      sort: sortOrder,
      in_stock: inStockOnly ? "1" : null,
      category: selectedCategory,
      subcategory: selectedSubcategory,
      page: currentPage.toString(),
    });
  }, [
    search,
    sortOrder,
    inStockOnly,
    selectedCategory,
    selectedSubcategory,
    currentPage,
  ]);

  useEffect(() => {
    fetchItems();
  }, [
    search,
    sortOrder,
    inStockOnly,
    selectedCategory,
    selectedSubcategory,
    currentPage,
  ]);

  useEffect(() => {
    fetchCategories();
  }, []);

  /* ---------- CART HELPERS ---------- */

  function cartQuantity(itemId: string) {
    return cart.find(c => c.item_id === itemId)?.quantity || 0;
  }

  function remainingStock(item: Item) {
    return item.stock - cartQuantity(item.id);
  }

  function addToCart(item: Item) {
    setCart(prev => {
      const existing = prev.find(c => c.item_id === item.id);

      if (existing) {
        if (existing.quantity >= item.stock) return prev;
        return prev.map(c =>
          c.item_id === item.id
            ? { ...c, quantity: c.quantity + 1 }
            : c
        );
      }

      if (item.stock === 0) return prev;

      return [
        ...prev,
        {
          item_id: item.id,
          name: item.name,
          price: item.price_usd,
          quantity: 1,
        },
      ];
    });
  }

  async function placeOrder() {
    setError("");
    setMessage("");

    if (!isLoggedIn()) {
      router.push("/login");
      return;
    }

    try {
      await apiRequest("/orders", {
        method: "POST",
        body: JSON.stringify({
          items: cart.map(c => ({
            item_id: c.item_id,
            quantity: c.quantity,
          })),
        }),
      });

      setCart([]);
      await fetchItems();
      setMessage("Order placed successfully!");
    } catch (err: any) {
      setError(err.message);
    }
  }

  const total = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  /* ---------- RENDER ---------- */

  return (
    <main className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* PRODUCTS */}
      <section className="md:col-span-2 space-y-4">
        {items.length === 0 && (
          <p className="text-gray-500">No products found.</p>
        )}

        {items.map(item => (
          <div
            key={item.id}
            className="border rounded p-4 flex justify-between items-center"
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
      </section>

      {/* CART */}
      <aside className="border rounded p-4 space-y-4">
        <h2 className="font-semibold text-lg">Cart</h2>

        {cart.length === 0 && (
          <p className="text-gray-500">Cart is empty</p>
        )}

        {cart.map(item => (
          <div key={item.item_id} className="flex justify-between text-sm">
            <span>{item.name}</span>
            <span>
              {item.quantity} × ${item.price.toFixed(2)}
            </span>
          </div>
        ))}

        <hr />

        <p className="font-semibold">Total: ${total.toFixed(2)}</p>

        <button
          onClick={placeOrder}
          className="w-full bg-black text-white py-2 rounded"
        >
          Place Order
        </button>

        {error && <p className="text-red-600">{error}</p>}
        {message && <p className="text-green-600">{message}</p>}
      </aside>
    </main>
  );
}
