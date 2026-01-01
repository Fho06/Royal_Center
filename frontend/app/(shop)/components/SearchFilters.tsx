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

  priceRange: [number, number] | null;
  setPriceRange: (v: [number, number] | null) => void;

  categoryIds: number[];
  setCategoryIds: (v: number[]) => void;
  subcategoryIds: number[];
  setSubcategoryIds: (v: number[]) => void;
  inStockOnly: boolean;
  setInStockOnly: (v: boolean) => void;
};

export function SearchFilters({
  facets,
  priceBounds,
  priceRange,
  setPriceRange,
  categoryIds,
  setCategoryIds,
  subcategoryIds,
  setSubcategoryIds,
  inStockOnly,
  setInStockOnly,
  
}: Props) {
  const categories = useCategories();
  const [open, setOpen] = useState(true);

  const visibleSubcategories = useMemo(() => {
    if (!facets || categories.length === 0) return [];

    const facetSubIds = new Set(
        facets.subcategories.map(Number)
    );

    return categories.filter(
        (c) =>
        c.level === 2 &&
        facetSubIds.has(Number(c.id))
    );
    }, [categories, facets]);

  const visibleCategories = useMemo(() => {
    if (visibleSubcategories.length === 0) return [];

    const parentIds = new Set(
        visibleSubcategories
        .map((s) => Number(s.parent_id))
        .filter((id) => !Number.isNaN(id))
    );

    return categories.filter(
        (c) =>
        c.level === 1 &&
        parentIds.has(Number(c.id))
    );
    }, [categories, visibleSubcategories]);

  return (
    <aside className="rounded-xl p-4 space-y-4 sticky top-28 bg-[#f6eeff]"> {/* Edit for border/background */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="font-semibold w-full text-left"
      >
        Filtros
      </button>

      {open && (
        <>
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
              <div className="space-y-1">
                {visibleCategories.map((c) => (
                  <label key={c.id} className="flex gap-2 text-sm break-words">
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
            </div>
          )}

          {/* SUBCATEGORIES */}
          {visibleSubcategories.length > 0 && (
            <div>
              <p className="font-semibold mb-2">Subcategorías</p>
              <div className="space-y-1">
                {visibleSubcategories.map((c) => (
                  <label key={c.id} className="flex gap-2 text-sm break-words">
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
            </div>
          )}

          {/* PRICE */}
          {priceBounds &&
            priceBounds.min !== null &&
            priceBounds.max !== null &&
            priceBounds.min < priceBounds.max && (() => {
            const min = priceBounds.min;
            const max = priceBounds.max;

            return (
                <div className="space-y-2">
                <p className="font-semibold">Precio</p>

                <div className="relative h-6">
                    <input
                    type="range"
                    min={min}
                    max={max}
                    value={priceRange?.[0] ?? min}
                    onChange={(e) => {
                        const v = Number(e.target.value);
                        setPriceRange([
                        Math.min(v, priceRange?.[1] ?? max),
                        priceRange?.[1] ?? max,
                        ]);
                    }}
                    className="absolute w-full pointer-events-auto"
                    />

                    <input
                    type="range"
                    min={min}
                    max={max}
                    value={priceRange?.[1] ?? max}
                    onChange={(e) => {
                        const v = Number(e.target.value);
                        setPriceRange([
                        priceRange?.[0] ?? min,
                        Math.max(v, priceRange?.[0] ?? min),
                        ]);
                    }}
                    className="absolute w-full pointer-events-auto"
                    />
                </div>

                <div className="flex justify-between text-xs">
                    <span>${priceRange?.[0] ?? min}</span>
                    <span>${priceRange?.[1] ?? max}</span>
                </div>
                </div>
            );
            })()}

          <div className="text-xs text-gray-400 mt-2">
            Marca (próximamente)
          </div>
        </>
      )}
    </aside>
  );
}
