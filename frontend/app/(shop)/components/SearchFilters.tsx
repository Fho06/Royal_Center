"use client";

import { useCategories } from "../hooks/UseCategories";
import { useMemo, useState } from "react";

type Props = {
  facets: {
    categories: number[];
    subcategories: number[];
  } | null;

  priceBounds: {
    min: number | null;
    max: number | null;
  } | null;

  // DRAFT FILTER STATE (UI ONLY)
  categoryIds: number[];
  setCategoryIds: (v: number[]) => void;
  subcategoryIds: number[];
  setSubcategoryIds: (v: number[]) => void;
  inStockOnly: boolean;
  setInStockOnly: (v: boolean) => void;
  priceRange: [number, number] | null;
  setPriceRange: (v: [number, number] | null) => void;

  // ACTIONS (REQUIRED)
  onApply: () => void;
  onClear: () => void;
};

export function SearchFilters({
  facets,
  priceBounds,
  categoryIds,
  setCategoryIds,
  subcategoryIds,
  setSubcategoryIds,
  inStockOnly,
  setInStockOnly,
  priceRange,
  setPriceRange,
  onApply,
  onClear,
}: Props) {
  const categories = useCategories();
  const [open, setOpen] = useState(false);
  const [isApplying, setIsApplying] = useState(false);


  // normalize bounds for TS + safety
  const minPrice = priceBounds?.min ?? 0;
  const maxPrice = priceBounds?.max ?? 0;

  /* =========================
     VISIBILITY LOGIC (NEVER HIDE OPTIONS)
     ========================= */
  const visibleSubcategories = useMemo(() => {
    if (!categories.length) return [];

    if (!facets || facets.subcategories.length === 0) {
      return categories.filter((c) => c.level === 2);
    }

    const facetSubIds = new Set(facets.subcategories.map(Number));
    return categories.filter(
      (c) =>
        c.level === 2 &&
        (facetSubIds.has(c.id) || subcategoryIds.includes(c.id))
    );
  }, [categories, facets, subcategoryIds]);

  const visibleCategories = useMemo(() => {
    if (!categories.length) return [];

    if (!facets || facets.categories.length === 0) {
      return categories.filter((c) => c.level === 1);
    }

    const facetCatIds = new Set(facets.categories.map(Number));
    return categories.filter(
      (c) =>
        c.level === 1 &&
        (facetCatIds.has(c.id) || categoryIds.includes(c.id))
    );
  }, [categories, facets, categoryIds]);

  return (
    <aside className="rounded-xl bg-[#f6eeff] p-3 sm:p-4 sm:sticky sm:top-28">
      {/* HEADER */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between font-semibold"
      >
        <span>Filtros</span>
        <span className="sm:hidden text-lg">{open ? "▴" : "▾"}</span>
      </button>

      {/* CLEAR (mobile quick access) */}
      <button
        onClick={() => {
          onClear();
          setOpen(false);
        }}
        className="mt-2 text-xs text-purple-700 underline sm:hidden"
      >
        Limpiar filtros
      </button>

      {/* CONTENT */}
      <div className={`${open ? "block" : "hidden"} sm:block mt-3 space-y-4`}>
        {/* STOCK */}
        <label className="flex gap-2 text-sm">
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(e) => setInStockOnly(e.target.checked)}
          />
          Solo en stock
        </label>

        {/* CATEGORIES */}
        {visibleCategories.length > 0 && (
          <div>
            <p className="font-semibold mb-2">Categorías</p>
            {visibleCategories.map((c) => (
              <label key={c.id} className="flex gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={categoryIds.includes(c.id)}
                  onChange={() =>
                    setCategoryIds(
                      categoryIds.includes(c.id)
                        ? categoryIds.filter((x) => x !== c.id)
                        : [...categoryIds, c.id]
                    )
                  }
                />
                {c.name}
              </label>
            ))}
          </div>
        )}

        {/* SUBCATEGORIES */}
        {visibleSubcategories.length > 0 && (
          <div>
            <p className="font-semibold mb-2">Subcategorías</p>
            {visibleSubcategories.map((c) => (
              <label key={c.id} className="flex gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={subcategoryIds.includes(c.id)}
                  onChange={() =>
                    setSubcategoryIds(
                      subcategoryIds.includes(c.id)
                        ? subcategoryIds.filter((x) => x !== c.id)
                        : [...subcategoryIds, c.id]
                    )
                  }
                />
                {c.name}
              </label>
            ))}
          </div>
        )}

        {/* PRICE */}
        {priceBounds?.min != null && priceBounds?.max != null && (
          <div>
            <p className="font-semibold mb-2 ">Precio</p>
            <div className="relative h-6 ">
              <input
                type="range"
                min={minPrice}
                max={maxPrice}
                value={priceRange?.[0] ?? minPrice}
                onChange={(e) =>
                  setPriceRange([
                    Number(e.target.value),
                    priceRange?.[1] ?? maxPrice,
                  ])
                }
                className="absolute w-full price-slider"
              />
              <input
                type="range"
                min={minPrice}
                max={maxPrice}
                value={priceRange?.[1] ?? maxPrice}
                onChange={(e) =>
                  setPriceRange([
                    priceRange?.[0] ?? minPrice,
                    Number(e.target.value),
                  ])
                }
                className="absolute w-full price-slider"
              />
            </div>
            <div className="mt-2 text-sm text-gray-700 flex justify-between">
              <span>${priceRange?.[0] ?? minPrice}</span>
              <span>${priceRange?.[1] ?? maxPrice}</span>
            </div>
          </div>
        )}

        {/* APPLY */}
        <button
          onClick={() => {
            onApply();
            setOpen(false);
          }}
          className="w-full rounded-xl bg-[var(--reg-accent)] py-2 text-white font-semibold"
        >
          Filtrar
        </button>
      </div>
    </aside>
  );
}
