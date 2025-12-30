"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCart } from "@/app/context/CartContext";
import { useItems } from "./(shop)/hooks/UseItems";
import { useCategories } from "./(shop)/hooks/UseCategories";
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
import { SearchFilters } from "./(shop)/components/SearchFilters";

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
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  /* =========================
     SEARCH / PAGINATION
     ========================= */
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  /* =========================
     FILTER STATE (SEARCH ONLY)
     ========================= */
  const [categoryIds, setCategoryIds] = useState<number[]>([]);
  const [subcategoryIds, setSubcategoryIds] = useState<number[]>([]);
  const [inStockOnly, setInStockOnly] = useState(true);
  const [priceRange, setPriceRange] = useState<[number, number] | null>(null);

  /* =========================
     URL → STATE
     ========================= */
  useEffect(() => {
    if (!hydrated) return;
    setSearch(searchParams.get("search") || "");
    setCurrentPage(Number(searchParams.get("page")) || 1);
  }, [hydrated, searchParams]);

  /* =========================
     STATE → URL
     ========================= */
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

  /* =========================
     RESET FILTERS ON NEW SEARCH
     ========================= */
  useEffect(() => {
    if (!hydrated) return;

    setCategoryIds([]);
    setSubcategoryIds([]);
    setPriceRange(null);
    setInStockOnly(true);
    setCurrentPage(1);
  }, [hydrated, search]);

  /* =========================
     DATA
     ========================= */
  const { items, total, priceBounds, error } = useItems({
    search,
    categoryIds,
    subcategoryIds,
    inStockOnly,
    priceRange,
    page: currentPage,
    limit: ITEMS_PER_PAGE,
  });

  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));

  /* =========================
     FACETS (CRITICAL FIX)
     ========================= */
  const categories = useCategories();

  const facets = useMemo(() => {
    if (!items.length || !categories.length) return null;

    const subIds = new Set<number>();
    const catIds = new Set<number>();

    for (const item of items) {
      if (item.category_id != null) {
        subIds.add(item.category_id);
      }
    }

    for (const c of categories) {
      if (
        c.level === 2 &&
        subIds.has(c.id) &&
        c.parent_id != null
      ) {
        catIds.add(c.parent_id);
      }
    }

    return {
      categories: Array.from(catIds),
      subcategories: Array.from(subIds),
    };
  }, [items, categories]);

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
     //px = mobile, md = tablet, lg = desktop
  return (
    <div className="overflow-x-hidden">
      <div className="min-w-[1024px]">
        <main className="px-4 md:px-12 lg:px-20 py-6 space-y-6">
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
            <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6">
              <SearchFilters
                facets={facets}
                priceBounds={priceBounds}
                priceRange={priceRange}
                setPriceRange={setPriceRange}
                categoryIds={categoryIds}
                setCategoryIds={setCategoryIds}
                subcategoryIds={subcategoryIds}
                setSubcategoryIds={setSubcategoryIds}
                inStockOnly={inStockOnly}
                setInStockOnly={setInStockOnly}
              />

              <div className="space-y-4">
                <h2 className="pt-1 pb-7 text-2xl font-semibold">
                  Resultados
                </h2> 
                <ProductList
                  items={items}
                  cartQty={cartQty}
                  remainingStock={remainingStock}
                  addToCart={addToCart}
                  increaseQty={increaseQty}
                  decreaseQty={decreaseQty}
                  canIncrease={canIncrease}
                  variant="search"
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
              </div>
            </div>
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
      </div>
    </div>
  );
}
