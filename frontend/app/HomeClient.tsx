"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart } from "@/app/context/CartContext";
import { useAuth } from "@/app/context/AuthContext";
import { useItems } from "./(shop)/hooks/UseItems";
import { ProductList } from "./(shop)/components/ProductList";
import { Pagination } from "./(shop)/components/Pagination";
import {
  FeaturedGrid,
  type FeaturedSlot,
} from "./(shop)/components/FeaturedGrid";
import { AdminProductSearchModal } from "./(shop)/components/AdminProductSearchModal";
import { SearchFilters } from "./(shop)/components/SearchFilters";
import { LOCATION_MAP } from "@/lib/locationMap";

import { useSearchPagination } from "./(shop)/hooks/UseSearchPagination";
import { useFilters } from "./(shop)/hooks/UseFilters";
import { useLoadingResultsEffect } from "./(shop)/hooks/UseLoadingResultsEffect";
import { useFeatured } from "./(shop)/hooks/UseFeatured";

const ITEMS_PER_PAGE = 20;

export default function HomeClient() {
  const searchParams = useSearchParams();

  const { cartQty, remainingStock, addToCart, increaseQty, decreaseQty } =
    useCart();

  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  /* =========================
     SEARCH / PAGINATION
     ========================= */
  const { hydrated, search, currentPage, setCurrentPage } =
    useSearchPagination();

  /* =========================
     LOCATION (for FEATURED ONLY; useItems has its own location)
     ========================= */
  const uiLocation = searchParams.get("location") ?? "29";
  const location = LOCATION_MAP[uiLocation] ?? "29";

  /* =========================
     LOADING OVERLAY (single state, same as original)
     ========================= */
  const [isLoadingResults, setIsLoadingResults] = useState(false);

  /* =========================
     FILTERS (draft + applied)
     ========================= */
  const filters = useFilters({
    hydrated,
    search,
    setCurrentPage,
    setIsLoadingResults,
  });

  /* =========================
     LOADING EFFECT (250ms) - SAME deps as original
     ========================= */
  useLoadingResultsEffect({
    hydrated,
    search,
    currentPage,
    categoryIds: filters.categoryIds,
    subcategoryIds: filters.subcategoryIds,
    inStockOnly: filters.inStockOnly,
    priceRange: filters.priceRange,
    setIsLoadingResults,
  });

  /* =========================
     DATA (FACETS COME FROM SERVER)
     IMPORTANT: uses APPLIED filters only
     ========================= */
  const { items, total, priceBounds, facets, error } = useItems({
    search,
    categoryIds: filters.categoryIds,
    subcategoryIds: filters.subcategoryIds,
    inStockOnly: filters.inStockOnly,
    priceRange: filters.priceRange,
    page: currentPage,
    limit: ITEMS_PER_PAGE,
  });

  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));
  const isSearching = search.trim().length > 0;

  /* =========================
     FEATURED (UNCHANGED)
     ========================= */
  const featuredCtrl = useFeatured({ hydrated, location });

  /* =========================
     RENDER
     ========================= */
  return (
    <div className="overflow-x-hidden">
      <main className="app-shell py-6 space-y-6">
        {!isSearching && (
          <FeaturedGrid
            isAdmin={isAdmin}
            featured={featuredCtrl.featured}
            onAddClick={(slot, position) => {
              featuredCtrl.setActivePick({
                slot,
                position,
              } as { slot: FeaturedSlot; position: 1 | 2 | 3 | 4 });
              featuredCtrl.setModalOpen(true);
            }}
            onRemoveClick={featuredCtrl.removeFeatured}
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
              priceRange={filters.draftPriceRange}
              setPriceRange={filters.setDraftPriceRange}
              categoryIds={filters.draftCategoryIds}
              setCategoryIds={filters.setDraftCategoryIds}
              subcategoryIds={filters.draftSubcategoryIds}
              setSubcategoryIds={filters.setDraftSubcategoryIds}
              inStockOnly={filters.draftInStockOnly}
              setInStockOnly={filters.setDraftInStockOnly}
              // ACTIONS
              onApply={filters.applyFilters}
              onClear={filters.clearFilters}
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
                onNext={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              />

              {error && <p className="text-red-600 text-sm">{error}</p>}
            </div>
          </div>
        )}

        {isAdmin && (
          <AdminProductSearchModal
            open={featuredCtrl.modalOpen}
            onClose={() => {
              featuredCtrl.setModalOpen(false);
              featuredCtrl.setActivePick(null);
            }}
            onPick={async (item) => {
              if (!featuredCtrl.activePick) return;
              featuredCtrl.setModalOpen(false);
              await featuredCtrl.assignFeatured(
                featuredCtrl.activePick.slot,
                featuredCtrl.activePick.position,
                item.id
              );
              featuredCtrl.setActivePick(null);
            }}
          />
        )}
      </main>
    </div>
  );
}
