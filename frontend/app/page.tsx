"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { useCart } from "@/context/CartContext";
import { isLoggedIn } from "@/lib/auth";
import { useRouter } from "next/navigation";

type Item = {
  id: number;
  name: string;
  price: number;
  stock: number;
};

type CartItem = {
  item_id: number;
  name: string;
  price: number;
  quantity: number;
};

export default function HomePage() {
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const { cart, setCart } = useCart();
  const router = useRouter();
  //filter
  const [sortOrder, setSortOrder] = useState<"none" | "asc" | "desc">("none");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedSubcategory, setSelectedSubcategory] = useState("all");

  //Pagination
  const ITEMS_PER_PAGE = 20;
  const [currentPage, setCurrentPage] = useState(1);


  useEffect(() => {
    setCurrentPage(1);
  }, [search, sortOrder, inStockOnly]);

  
  const filteredItems = items.filter((item) => {
    const matchesSearch = item.name
      .toLowerCase()
      .includes(search.toLowerCase());

    const hasStock = !inStockOnly || item.stock > 0;

    return matchesSearch && hasStock;
  });


  const sortedItems = [...filteredItems].sort((a, b) => {
    if (sortOrder === "asc") {
      return a.price - b.price;
    }
    if (sortOrder === "desc") {
      return b.price - a.price;
    }
    return 0;
  });

  const totalPages = Math.ceil(sortedItems.length / ITEMS_PER_PAGE);

  const paginatedItems = sortedItems.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

    async function fetchItems() {
      try {
        const data = await apiRequest("/items");
        setItems(data);
      } catch (err: any) {
        setError(err.message);
      }
    }
    useEffect(() => { 
    fetchItems();
  }, []);

function addToCart(item: Item) {
  setCart((prev) => {
    const existing = prev.find((c) => c.item_id === item.id);

    if (existing) {
      if (existing.quantity >= item.stock) return prev;

      return prev.map((c) =>
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
        price: item.price,
        quantity: 1,
      },
    ];
  });
}

function increaseQuantity(itemId: number, maxStock: number) {
  setCart((prev) =>
    prev.map((c) =>
      c.item_id === itemId && c.quantity < maxStock
        ? { ...c, quantity: c.quantity + 1 }
        : c
    )
  );
}

function decreaseQuantity(itemId: number) {
  setCart((prev) =>
    prev
      .map((c) =>
        c.item_id === itemId
          ? { ...c, quantity: c.quantity - 1 }
          : c
      )
      .filter((c) => c.quantity > 0)
  );
}

function cartQuantity(itemId: number) {
  return cart.find((c) => c.item_id === itemId)?.quantity || 0;
}

function remainingStock(item: Item) {
  return item.stock - cartQuantity(item.id);
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
          items: cart.map((c) => ({
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
  

  return (
    <main className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* PRODUCTS */}
      <div className="md:col-span-2">
        <h1 className="mb-4 text-2xl font-bold">Products</h1>

        {/* 🔍 SEARCH BAR */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded border px-4 py-2"
          />
        </div>

        {/* 🔽 SORT */}
        <div className="mb-6">
          <select
            value={sortOrder}
            onChange={(e) =>
              setSortOrder(e.target.value as "none" | "asc" | "desc")
            }
            className="rounded border px-3 py-2"
          >
            <option value="none">Sort by price</option>
            <option value="asc">Price: Low → High</option>
            <option value="desc">Price: High → Low</option>
          </select>
            {/* ✅ IN STOCK FILTER */}
          <div className="mb-6 flex items-center gap-2">
            
            <input
              type="checkbox"
              id="inStockOnly"
              checked={inStockOnly}
              onChange={(e) => setInStockOnly(e.target.checked)}
              className="h-4 w-4"
            />
            <label htmlFor="inStockOnly" className="text-sm">
              In stock only
              
            </label>
            
          </div>
        </div>

        {error && <p className="text-red-600">{error}</p>}
        {message && <p className="text-green-600">{message}</p>}
        
        <p className="mb-4 text-sm text-gray-500">
          Showing {sortedItems.length} of {items.length} products
        </p>

      { /* PRODUCT GRID */}      
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {paginatedItems.map((item) => (
            <div
              key={item.id}
              className="rounded border p-4 shadow-sm"
            >
              <h2 className="text-lg font-semibold">{item.name}</h2>
              <p className="mt-2 text-gray-700">
                Price: ${item.price.toFixed(2)}
              </p>
              <p className="text-sm text-gray-500">
                Stock: {remainingStock(item)}
              </p>

              {remainingStock(item) > 0 ? (
                <button
                  onClick={() => addToCart(item)}
                  className="mt-3 rounded bg-black px-4 py-2 text-white hover:bg-gray-800"
                >
                  Add to Cart
                </button>
              ) : (
                <p className="mt-3 text-sm font-semibold text-red-600">
                  Out of Stock
                </p>
              )}
            </div>
          ))}
        </div>
        {/* PAGINATION */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-4">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className={`rounded px-3 py-1 border ${
                currentPage === 1
                  ? "cursor-not-allowed text-gray-400"
                  : "hover:bg-gray-100"
              }`}
            >
              Previous
            </button>

            <span className="text-sm">
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() =>
                setCurrentPage((p) => Math.min(totalPages, p + 1))
              }
              disabled={currentPage === totalPages}
              className={`rounded px-3 py-1 border ${
                currentPage === totalPages
                  ? "cursor-not-allowed text-gray-400"
                  : "hover:bg-gray-100"
              }`}
            >
              Next
            </button>
          </div>
        )}

      </div>
      
      {/* CART */}
      <div className="rounded border p-4">
        <h2 className="mb-2 text-xl font-semibold">Cart</h2>

        {cart.length === 0 && (
          <p className="text-gray-500">Cart is empty</p>
        )}

        {cart.map((item) => {
          const maxStock =
            items.find((i) => i.id === item.item_id)?.stock || 0;

          return (
            <div
              key={item.item_id}
              className="mb-3 flex items-center justify-between text-sm"
            >
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-gray-500">
                  ${(item.price * item.quantity).toFixed(2)}
                </p>
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={() => decreaseQuantity(item.item_id)}
                  className="h-9 w-9 rounded-full 
               border-2 border-gray-400
               flex items-center justify-center
               text-lg font-medium
               hover:bg-gray-100 
               active:scale-95 transition"
                >
                  −
                </button>

                  <span className="w-6 text-center font-medium">
                    {item.quantity}
                  </span>

                <button
                  onClick={() =>
                    increaseQuantity(item.item_id, maxStock)
                  }
                  disabled={item.quantity >= maxStock}
                  className={`h-9 w-9 rounded-full 
                              border-2
                              flex items-center justify-center
                              text-lg font-medium
                              transition
                              ${
                                item.quantity >= maxStock
                                  ? "border-gray-200 text-gray-300 cursor-not-allowed"
                                  : "border-gray-400 hover:bg-gray-100 active:scale-95"
                              }`}
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
            <p className="font-semibold">
              Total: ${total.toFixed(2)}
            </p>

            <button
              onClick={placeOrder}
              className="mt-3 w-full rounded bg-green-600 px-4 py-2 text-white"
            >
              Place Order
            </button>
          </>
        )}
      </div>
    </main>
  );
}
