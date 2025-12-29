"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCart } from "@/app/context/CartContext";
import { useItems } from "./(shop)/hooks/UseItems";
import { ProductList } from "./(shop)/components/ProductList";
import { Pagination } from "./(shop)/components/Pagination";
import { useAuth } from "@/app/context/AuthContext";
import { Item } from "./(shop)/types";
import {
  FeaturedGrid,
  type FeaturedMap,
  type FeaturedSlot,
} from "./(shop)/components/FeaturedGrid";
import { AdminProductSearchModal } from "./(shop)/components/AdminProductSearchModal";

const ITEMS_PER_PAGE = 20;

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

type ActivePick = {
  slot: FeaturedSlot;
  position: 1 | 2 | 3 | 4;
} | null;

export default function HomeClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { cart, setCart } = useCart();
  const user = useAuth().user;
  const isAdmin = user?.role === "admin";

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  /* =========================
     SEARCH / PAGINATION
     ========================= */
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (!hydrated) return;
    setSearch(searchParams.get("search") || "");
    setCurrentPage(Number(searchParams.get("page")) || 1);
  }, [hydrated, searchParams]);

  useEffect(() => {
    if (!hydrated) return;

    const url = new URL(window.location.href);

    if (search) url.searchParams.set("search", search);
    else url.searchParams.delete("search");

    url.searchParams.set("page", currentPage.toString());

    router.replace(url.pathname + "?" + url.searchParams.toString(), {
      scroll: false,
    });
  }, [hydrated, search, currentPage, router]);

  useEffect(() => {
    if (!hydrated) return;
    setCurrentPage(1);
  }, [hydrated, search]);

  /* =========================
     DATA (compat with hook)
     ========================= */
  const { items, total, error } = useItems({
    search,
    category: "all",
    subcategory: "all",
    inStockOnly: false,
    page: currentPage,
    limit: ITEMS_PER_PAGE,
  });

  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));

  /* =========================
     CART HELPERS
     ========================= */
  function cartQty(itemId: string) {
    return cart.find((c) => c.item_id === itemId)?.quantity || 0;
  }

  function remainingStock(item: Item) {
    return item.stock - cartQty(item.id);
  }

  function addToCart(item: Item) {
    if (remainingStock(item) <= 0) return;

    setCart((prev) => {
      const existing = prev.find((c) => c.item_id === item.id);
      if (existing) {
        return prev.map((c) =>
          c.item_id === item.id ? { ...c, quantity: c.quantity + 1 } : c
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
    setCart((prev) =>
      prev.map((it) =>
        it.item_id === itemId ? { ...it, quantity: it.quantity + 1 } : it
      )
    );
  }

  function decreaseQty(itemId: string) {
    setCart((prev) =>
      prev
        .map((it) =>
          it.item_id === itemId ? { ...it, quantity: it.quantity - 1 } : it
        )
        .filter((it) => it.quantity > 0)
    );
  }

  const canIncrease = (id: string) =>
    (items.find((p) => p.id === id)?.stock ?? 0) - cartQty(id) > 0;

  /* =========================
     FEATURED
     ========================= */
  const [featured, setFeatured] = useState<FeaturedMap>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [activePick, setActivePick] = useState<ActivePick>(null);

  async function loadFeatured() {
    const res = await fetch(`/api/featured?bust=${Date.now()}`, {
      cache: "no-store",
    });
    if (!res.ok) return;
    const data = await res.json();
    setFeatured(data.featured ?? {});
  }

  useEffect(() => {
    if (!hydrated) return;
    loadFeatured();
  }, [hydrated]);

  async function assignFeatured(
    slot: FeaturedSlot,
    position: number,
    itemId: string
  ) {
    const token = getToken();
    if (!token) return;

    await fetch(`/api/featured/${slot}/${position}`, {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ item_id: itemId }),
    });

    await loadFeatured();
  }

  async function removeFeatured(slot: FeaturedSlot, position: number) {
    const token = getToken();
    if (!token) return;

    await fetch(`/api/featured/${slot}/${position}`, {
      method: "DELETE",
      headers: { authorization: `Bearer ${token}` },
    });

    await loadFeatured();
  }

  const isSearching = search.trim().length > 0;

  /* =========================
     RENDER
     ========================= */
  return (
    <main className="p-6 space-y-6">
      {!isSearching && (
        <FeaturedGrid
          isAdmin={isAdmin}
          featured={featured}
          onAddClick={(slot, position) => {
            setActivePick({ slot, position });
            setModalOpen(true);
          }}
          onRemoveClick={removeFeatured}
          cartQty={cartQty}
          remainingStock={remainingStock}
          addToCart={addToCart}
          increaseQty={increaseQty}
          decreaseQty={decreaseQty}
          canIncrease={canIncrease}
        />
      )}

      {isSearching && (
        <>
          <ProductList
            items={items}
            cartQty={cartQty}
            remainingStock={remainingStock}
            addToCart={addToCart}
            increaseQty={increaseQty}
            decreaseQty={decreaseQty}
            canIncrease={canIncrease}
          />

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPrev={() => setCurrentPage((p) => Math.max(1, p - 1))}
            onNext={() =>
              setCurrentPage((p) => Math.min(totalPages, p + 1))
            }
          />

          {error && <p className="text-red-600 text-sm">{error}</p>}
        </>
      )}

      {isAdmin && (
        <AdminProductSearchModal
          open={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setActivePick(null);
          }}
          onPick={async (item) => {
            if (!activePick) return;
            setModalOpen(false);
            await assignFeatured(
              activePick.slot,
              activePick.position,
              item.id
            );
            setActivePick(null);
          }}
        />
      )}
    </main>
  );
}
