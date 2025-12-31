"use client";

import type { Item } from "../types";
import { ProductTile } from "./ProductTile";

/* =========================
   TYPES
   ========================= */

export type FeaturedSlot =
  | "hero_left"
  | "hero_right"
  | "group_1"
  | "group_2"
  | "group_3"
  | "group_4";

export type FeaturedMap = Partial<
  Record<FeaturedSlot, Partial<Record<number, Item>>>
>;

/* =========================
   HELPERS
   ========================= */

function emptyBox(isAdmin: boolean, onAdd?: () => void) {
  if (isAdmin && onAdd) {
    return (
      <button
        onClick={onAdd}
        className="w-full h-full rounded-2xl border border-gray-200 border-dashed bg-white hover:bg-black/5 flex items-center justify-center"
      >
        <span className="text-2xl font-light text-gray-700">+</span>
      </button>
    );
  }

  return (
    <div className="w-full h-full rounded-2xl border border-gray-200 bg-white/60" />
  );
}

function getItem(
  featured: FeaturedMap,
  slot: FeaturedSlot,
  position: number
): Item | null {
  const slotMap = featured[slot];
  if (!slotMap) return null;
  return slotMap[position] ?? null;
}

/* =========================
   PROPS
   ========================= */

type Props = {
  isAdmin: boolean;
  featured?: FeaturedMap;

  onAddClick: (slot: FeaturedSlot, position: 1 | 2 | 3 | 4) => void;
  onRemoveClick: (slot: FeaturedSlot, position: 1 | 2 | 3 | 4) => void;

  cartQty: (itemId: string) => number;
  remainingStock: (item: Item) => number;
  addToCart: (item: Item) => void;
  increaseQty: (itemId: string) => void;
  decreaseQty: (itemId: string) => void;
  canIncrease: (itemId: string) => boolean;
};

/* =========================
   COMPONENT
   ========================= */

export function FeaturedGrid({
  isAdmin,
  featured = {},
  onAddClick,
  onRemoveClick,
  cartQty,
  remainingStock,
  addToCart,
  increaseQty,
  decreaseQty,
  canIncrease,
}: Props) {
  /* ---------- HERO TILE ---------- */
  const renderHero = (slot: FeaturedSlot) => {
    const item = getItem(featured, slot, 1);

    return (
      <div className="aspect-square w-full">
        {item ? (
          <ProductTile
            item={item}
            cartQty={cartQty}
            remainingStock={remainingStock}
            addToCart={addToCart}
            increaseQty={increaseQty}
            decreaseQty={decreaseQty}
            canIncrease={canIncrease}
            variant="featured"
            showRemove={isAdmin}
            onRemove={() => onRemoveClick(slot, 1)}
          />
        ) : (
          emptyBox(isAdmin, () => onAddClick(slot, 1))
        )}
      </div>
    );
  };

  /* ---------- GROUP TILE (2x2) ---------- */
  const renderGroup = (slot: FeaturedSlot) => {
    const positions: (1 | 2 | 3 | 4)[] = [1, 2, 3, 4];

    return (
      <div className="aspect-square w-full">
        <div className="grid grid-cols-2 grid-rows-2 gap-3 w-full h-full">
          {positions.map((pos) => {
            const item = getItem(featured, slot, pos);

            return (
              <div key={pos} className="aspect-square w-full">
                {item ? (
                  <ProductTile
                    item={item}
                    cartQty={cartQty}
                    remainingStock={remainingStock}
                    addToCart={addToCart}
                    increaseQty={increaseQty}
                    decreaseQty={decreaseQty}
                    canIncrease={canIncrease}
                    variant="featured"
                    showRemove={isAdmin}
                    onRemove={() => onRemoveClick(slot, pos)}
                  />
                ) : (
                  emptyBox(isAdmin, () => onAddClick(slot, pos))
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  /* =========================
     RENDER
     ========================= */

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between">
        <h2 className="text-xl font-semibold">
          Productos destacados
        </h2>

        {isAdmin && (
          <p className="text-xs text-gray-500">
            Admin: usa “+” para asignar productos.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {renderHero("hero_left")}
        {renderGroup("group_1")}
        {renderGroup("group_2")}
        {renderGroup("group_3")}
        {renderGroup("group_4")}
        {renderHero("hero_right")}
      </div>
    </section>
  );
}
