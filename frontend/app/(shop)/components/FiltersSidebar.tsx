"use client";

import { Category } from "../types";

type Props = {
  categories: Category[];
  selectedCategories: number[];
  setSelectedCategories: (v: number[]) => void;
  selectedSubcategories: number[];
  setSelectedSubcategories: (v: number[]) => void;
  priceBounds: { min: number; max: number } | null;
  price: [number, number];
  setPrice: (v: [number, number]) => void;
  inStockOnly: boolean;
  setInStockOnly: (v: boolean) => void;
};

export function FiltersSidebar({
  categories,
  selectedCategories,
  setSelectedCategories,
  selectedSubcategories,
  setSelectedSubcategories,
  priceBounds,
  price,
  setPrice,
  inStockOnly,
  setInStockOnly,
}: Props) {
  const main = categories.filter((c) => c.level === 1);
  const subs = categories.filter(
    (c) => c.level === 2 && selectedCategories.includes(c.parent_id!)
  );

  function toggle(list: number[], id: number) {
    return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
  }

  return (
    <aside className="space-y-6 sticky top-24 border rounded-xl p-4">
      {/* CATEGORY */}
      <div className="space-y-1">
        <h3 className="font-semibold mb-1">Categorías</h3>
        {main.map((c) => (
          <label key={c.id} className="flex items-start gap-2 text-sm pr-2">
            <input
              type="checkbox"
              className="mt-1"
              checked={selectedCategories.includes(c.id)}
              onChange={() => {
                setSelectedCategories(toggle(selectedCategories, c.id));
                setSelectedSubcategories([]);
              }}
            />
            <span className="leading-tight break-words whitespace-normal">
              {c.name}
            </span>
          </label>
        ))}
      </div>

      {/* SUBCATEGORY */}
      {subs.length > 0 && (
        <div className="space-y-1">
          <h3 className="font-semibold mb-1">Subcategorías</h3>
          {subs.map((c) => (
            <label key={c.id} className="flex items-start gap-2 text-sm pr-2">
              <input
                type="checkbox"
                className="mt-1"
                checked={selectedSubcategories.includes(c.id)}
                onChange={() => setSelectedSubcategories(toggle(selectedSubcategories, c.id))}
              />
              <span className="leading-tight break-words whitespace-normal">
                {c.name}
              </span>
            </label>
          ))}
        </div>
      )}

      {/* PRICE */}
      {priceBounds && priceBounds.min !== priceBounds.max && (
        <div className="space-y-2">
          <h3 className="font-semibold">Precio</h3>
          <input
            type="range"
            min={priceBounds.min}
            max={priceBounds.max}
            value={price[0]}
            onChange={(e) => setPrice([Number(e.target.value), price[1]])}
            className="w-full"
          />
          <input
            type="range"
            min={priceBounds.min}
            max={priceBounds.max}
            value={price[1]}
            onChange={(e) => setPrice([price[0], Number(e.target.value)])}
            className="w-full"
          />
          <div className="text-xs">
            ${price[0]} – ${price[1]}
          </div>
        </div>
      )}

      {/* STOCK */}
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={inStockOnly}
          onChange={(e) => setInStockOnly(e.target.checked)}
        />
        En stock
      </label>

      <div className="text-xs text-gray-400">Marca (próximamente)</div>
    </aside>
  );
}
