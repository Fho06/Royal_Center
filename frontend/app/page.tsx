"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { useCart } from "@/context/CartContext";
import { isLoggedIn } from "@/lib/auth";
import { useRouter } from "next/navigation";

/* ---------- TYPES ---------- */

type Item = {
  id: number;
  name: string;
  price: number;
  stock: number;
  category_id: number;
  parent_id: number;
};

type Category = {
  id: number;
  name: string;
  level: number;
  parent_id: number | null;
};

type CartItem = {
  item_id: number;
  name: string;
  price: number;
  quantity: number;
};

/* ---------- COMPONENT ---------- */

export default function HomePage() {
  const router = useRouter();
  const { cart, setCart } = useCart();

  /* ---------- STATE ---------- */
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<"none" | "asc" | "desc">("none");
  const [inStockOnly, setInStockOnly] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedSubcategory, setSelectedSubcategory] = useState("all");

  /* ---------- PAGINATION ---------- */
  const ITEMS_PER_PAGE = 20;
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, sortOrder, inStockOnly, selectedCategory, selectedSubcategory]);

  /* ---------- DATA FETCH ---------- */

  async function fetchItems() {
    try {
      const data = await apiRequest("/items");
      setItems(data);
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function fetchCategories() {
    try {
      const data = await apiRequest("/categories");
      setCategories(data);
    } catch {
      console.error("Failed to load categories");
    }
  }

  useEffect(() => {
    fetchItems();
    fetchCategories();
  }, []);

  /* ---------- DERIVED DATA ---------- */

  const mainCategories = categories.filter(c => c.level === 1);

  const subCategories = categories.filter(
    c => c.level === 2 && c.parent_id === Number(selectedCategory)
  );

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name
      .toLowerCase()
      .includes(search.toLowerCase());

    const hasStock = !inStockOnly || item.stock > 0;

    const matchesCategory =
      selectedCategory === "all" ||
      item.parent_id === Number(selectedCategory);

    const matchesSubcategory =
      selectedSubcategory === "all" ||
      item.category_id === Number(selectedSubcategory);

    return matchesSearch && hasStock && matchesCategory && matchesSubcategory;
  });

  const sortedItems = [...filteredItems].sort((a, b) => {
    if (sortOrder === "asc") return a.price - b.price;
    if (sortOrder === "desc") return b.price - a.price;
    return 0;
  });

  const totalPages = Math.ceil(sortedItems.length / ITEMS_PER_PAGE);

  const paginatedItems = sortedItems.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  /* ---------- CART HELPERS ---------- */

  function cartQuantity(itemId: number) {
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
      return [...prev, {
        item_id: item.id,
        name: item.name,
        price: item.price,
        quantity: 1
      }];
    });
  }

  function increaseQuantity(itemId: number, maxStock: number) {
    setCart(prev =>
      prev.map(c =>
        c.item_id === itemId && c.quantity < maxStock
          ? { ...c, quantity: c.quantity + 1 }
          : c
      )
    );
  }

  function decreaseQuantity(itemId: number) {
    setCart(prev =>
      prev
        .map(c =>
          c.item_id === itemId
            ? { ...c, quantity: c.quantity - 1 }
            : c
        )
        .filter(c => c.quantity > 0)
    );
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
            quantity: c.quantity
          }))
        })
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
      <div className="md:col-span-2">
        <h1 className="mb-4 text-2xl font-bold">Products</h1>

        {/* SEARCH */}
        <input
          className="mb-4 w-full rounded border px-4 py-2"
          placeholder="Search products..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        {/* CATEGORY FILTERS */}
        <div className="mb-4 flex gap-4">
          <select
            className="rounded border px-3 py-2"
            value={selectedCategory}
            onChange={e => {
              setSelectedCategory(e.target.value);
              setSelectedSubcategory("all");
            }}
          >
            <option value="all">All Categories</option>
            {mainCategories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {selectedCategory !== "all" && (
            <select
              className="rounded border px-3 py-2"
              value={selectedSubcategory}
              onChange={e => setSelectedSubcategory(e.target.value)}
            >
              <option value="all">All Subcategories</option>
              {subCategories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* SORT + STOCK */}
        <div className="mb-4 flex items-center gap-4">
          <select
            className="rounded border px-3 py-2"
            value={sortOrder}
            onChange={e => setSortOrder(e.target.value as any)}
          >
            <option value="none">Sort by price</option>
            <option value="asc">Low → High</option>
            <option value="desc">High → Low</option>
          </select>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={e => setInStockOnly(e.target.checked)}
            />
            In stock only
          </label>
        </div>

        <p className="mb-2 text-sm text-gray-500">
          Showing {sortedItems.length} of {items.length}
        </p>

        {/* GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {paginatedItems.map(item => (
            <div key={item.id} className="border rounded p-4">
              <h2 className="font-semibold">{item.name}</h2>
              <p>${item.price.toFixed(2)}</p>
              <p className="text-sm">Stock: {remainingStock(item)}</p>

              {remainingStock(item) > 0 ? (
                <button
                  onClick={() => addToCart(item)}
                  className="mt-2 rounded bg-black px-3 py-1 text-white"
                >
                  Add to Cart
                </button>
              ) : (
                <p className="mt-2 text-red-600 text-sm">Out of Stock</p>
              )}
            </div>
          ))}
        </div>

        {/* PAGINATION */}
        {totalPages > 1 && (
          <div className="mt-6 flex justify-center gap-4">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
            >
              Previous
            </button>
            <span>Page {currentPage} / {totalPages}</span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* CART */}
      <div className="border rounded p-4">
        <h2 className="text-xl font-semibold mb-2">Cart</h2>

        {cart.length === 0 && <p className="text-gray-500">Cart is empty</p>}

        {cart.map(item => {
          const maxStock =
            items.find(i => i.id === item.item_id)?.stock || 0;

          return (
            <div key={item.item_id} className="flex justify-between mb-2">
              <div>
                <p>{item.name}</p>
                <p>${(item.price * item.quantity).toFixed(2)}</p>
              </div>

              <div className="flex gap-2 items-center">
                <button onClick={() => decreaseQuantity(item.item_id)}>−</button>
                <span>{item.quantity}</span>
                <button
                  disabled={item.quantity >= maxStock}
                  onClick={() => increaseQuantity(item.item_id, maxStock)}
                >
                  +
                </button>
              </div>
            </div>
          );
        })}

        {cart.length > 0 && (
          <>
            <hr className="my-2" />
            <p>Total: ${total.toFixed(2)}</p>
            <button
              onClick={placeOrder}
              className="mt-2 w-full rounded bg-green-600 py-2 text-white"
            >
              Place Order
            </button>
          </>
        )}
      </div>
    </main>
  );
}
