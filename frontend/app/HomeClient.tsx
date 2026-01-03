"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCart } from "@/app/context/CartContext";
import { useItems } from "./(shop)/hooks/UseItems";
import { ProductList } from "./(shop)/components/ProductList";
import { Pagination } from "./(shop)/components/Pagination";
import { useAuth } from "@/app/context/AuthContext";
import {
  FeaturedGrid,
  type FeaturedMap,
  type FeaturedSlot,
} from "./(shop)/components/FeaturedGrid";
import { AdminProductSearchModal } from "./(shop)/components/AdminProductSearchModal";
import { SearchFilters } from "./(shop)/components/SearchFilters";
import { LOCATION_MAP } from "@/lib/locationMap";


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

  const {
    cartQty,
    remainingStock,
    addToCart,
    increaseQty,
    decreaseQty,
  } = useCart();

  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const [isLoadingResults, setIsLoadingResults] = useState(false);

  /* =========================
     SEARCH / PAGINATION
     ========================= */
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const uiLocation = searchParams.get("location") ?? "29";
  const location = LOCATION_MAP[uiLocation] ?? "29";


  /* =========================
     DRAFT FILTERS (UI ONLY)
     ========================= */
  const [draftCategoryIds, setDraftCategoryIds] = useState<number[]>([]);
  const [draftSubcategoryIds, setDraftSubcategoryIds] = useState<number[]>([]);
  const [draftInStockOnly, setDraftInStockOnly] = useState(true);
  const [draftPriceRange, setDraftPriceRange] =
    useState<[number, number] | null>(null);

  /* =========================
     APPLIED FILTERS (USED FOR FETCH)
     ========================= */
  const [categoryIds, setCategoryIds] = useState<number[]>([]);
  const [subcategoryIds, setSubcategoryIds] = useState<number[]>([]);
  const [inStockOnly, setInStockOnly] = useState(true);
  const [priceRange, setPriceRange] =
    useState<[number, number] | null>(null);

  /* =========================
     URL → STATE (search/page only, like your current behavior)
     ========================= */
  useEffect(() => {
    if (!hydrated) return;
    setSearch(searchParams.get("search") || "");
    setCurrentPage(Number(searchParams.get("page")) || 1);
  }, [hydrated, searchParams]);

  /* =========================
     STATE → URL (search/page only, like your current behavior)
     ========================= */
  useEffect(() => {
    if (!hydrated) return;

    const url = new URL(window.location.href);

    if (search) url.searchParams.set("search", search);
    else url.searchParams.delete("search");

    url.searchParams.set("page", String(currentPage));

    router.replace(url.pathname + "?" + url.searchParams.toString(), {
      scroll: false,
    });
  }, [hydrated, search, currentPage, router]);

  /* =========================
     RESET FILTERS ON NEW SEARCH
     (resets BOTH draft + applied)
     ========================= */
  useEffect(() => {
    if (!hydrated) return;

    // draft
    setDraftCategoryIds([]);
    setDraftSubcategoryIds([]);
    setDraftPriceRange(null);
    setDraftInStockOnly(true);

    // applied
    setCategoryIds([]);
    setSubcategoryIds([]);
    setPriceRange(null);
    setInStockOnly(true);

    setCurrentPage(1);
  }, [hydrated, search]);

  useEffect(() => {
  if (!hydrated) return;

  setIsLoadingResults(true);

  const t = setTimeout(() => {
    setIsLoadingResults(false);
    }, 250);

    return () => clearTimeout(t);
  }, [
    hydrated,
    search,
    currentPage,
    categoryIds,
    subcategoryIds,
    inStockOnly,
    priceRange,
  ]);


  /* =========================
     APPLY / CLEAR (ONLY TIME APPLIED STATE CHANGES)
     ========================= */
  function applyFilters() {
    setIsLoadingResults(true);

    setCategoryIds(draftCategoryIds);
    setSubcategoryIds(draftSubcategoryIds);
    setInStockOnly(draftInStockOnly);
    setPriceRange(draftPriceRange);
    setCurrentPage(1);

    setTimeout(() => {
      setIsLoadingResults(false);
    }, 300);
  }


  function clearFilters() {
    // draft
    setDraftCategoryIds([]);
    setDraftSubcategoryIds([]);
    setDraftInStockOnly(true);
    setDraftPriceRange(null);

    // applied
    setCategoryIds([]);
    setSubcategoryIds([]);
    setInStockOnly(true);
    setPriceRange(null);

    setCurrentPage(1);
  }

  /* =========================
     DATA (FACETS COME FROM SERVER)
     IMPORTANT: uses APPLIED filters only
     ========================= */
  const { items, total, priceBounds, facets, error } = useItems({
    search,
    categoryIds,
    subcategoryIds,
    inStockOnly,
    priceRange,
    page: currentPage,
    limit: ITEMS_PER_PAGE,
  });

  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));
  const isSearching = search.trim().length > 0;

  /* =========================
     FEATURED (UNCHANGED)
     ========================= */
  const [featured, setFeatured] = useState<FeaturedMap>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [activePick, setActivePick] = useState<ActivePick>(null);


  async function loadFeatured() {
    const res = await fetch(
      `/api/featured?location=${encodeURIComponent(location)}&bust=${Date.now()}`,
      { cache: "no-store" }
    );

    if (!res.ok) return;

    const data = await res.json();
    setFeatured(data.featured ?? {});
  }

  useEffect(() => {
    if (!hydrated) return;
    loadFeatured();
  }, [hydrated,location]);

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

  /* =========================
     RENDER
     ========================= */
  return (
    <div className="overflow-x-hidden">
      <main className="app-shell py-6 space-y-6">
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
          />
        )}

        {isSearching && (
          <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6">
            <SearchFilters
              facets={facets ?? null}
              priceBounds={priceBounds}
              // DRAFT goes to UI
              priceRange={draftPriceRange}
              setPriceRange={setDraftPriceRange}
              categoryIds={draftCategoryIds}
              setCategoryIds={setDraftCategoryIds}
              subcategoryIds={draftSubcategoryIds}
              setSubcategoryIds={setDraftSubcategoryIds}
              inStockOnly={draftInStockOnly}
              setInStockOnly={setDraftInStockOnly}
              // ACTIONS
              onApply={applyFilters}
              onClear={clearFilters}
            />

            <div className="relative space-y-4">
              {isLoadingResults && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 backdrop-blur-sm rounded-xl">
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
                    Buscando productos…
                  </div>
                </div>
              )}
              <h2 className="pt-1 pb-7 text-2xl font-semibold">Resultados</h2>

              <ProductList
                items={items}
                cartQty={cartQty}
                remainingStock={remainingStock}
                addToCart={addToCart}
                increaseQty={increaseQty}
                decreaseQty={decreaseQty}
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
              await assignFeatured(activePick.slot, activePick.position, item.id);
              setActivePick(null);
            }}
          />
        )}
      </main>
    </div>
  );
}
