"use client";

import type { Item } from "../types";

const IMAGE_BASE_URL =
  "https://pub-db262da1ef9140738af0ec8adade1c90.r2.dev/products";
const IMAGE_EXTENSIONS = ["jpeg", "jpg", "webp", "png", "jfif", "HEIC"];

function imageUrl(id: string, extIndex: number) {
  return `${IMAGE_BASE_URL}/${id}/1.${IMAGE_EXTENSIONS[extIndex]}`;
}

type Props = {
  item: Item;

  cartQty: (itemId: string) => number;
  remainingStock: (item: Item) => number;

  addToCart: (item: Item) => void;
  increaseQty: (itemId: string) => void;
  decreaseQty: (itemId: string) => void;
  canIncrease: (itemId: string) => boolean;

  showRemove?: boolean;
  onRemove?: () => void;
};

export function ProductTile({
  item,
  cartQty,
  remainingStock,
  addToCart,
  increaseQty,
  decreaseQty,
  canIncrease,
  showRemove,
  onRemove,
}: Props) {
  const qty = cartQty(item.id);
  const outOfStock = remainingStock(item) <= 0;

  return (
    <div
      className="group h-full w-full rounded-2xl border bg-white overflow-hidden shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md"
      style={{ cursor: "pointer" }}
    >
      <div className="relative h-full">
        <img
          src={imageUrl(item.id, 0)}
          alt={item.name}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
          loading="lazy"
          onError={(e) => {
            const img = e.currentTarget as HTMLImageElement;
            const currentExt = img.src.split(".").pop();
            const idx = IMAGE_EXTENSIONS.indexOf(currentExt || "");
            const next = IMAGE_EXTENSIONS[idx + 1];
            if (next) img.src = imageUrl(item.id, idx + 1);
            else {
              img.onerror = null;
              img.src = "/placeholder.png";
            }
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />

        {showRemove && onRemove && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="absolute top-3 right-3 rounded-full bg-white/90 px-3 py-1 text-xs hover:bg-white"
            style={{ cursor: "pointer" }}
          >
            Quitar
          </button>
        )}

        <div className="absolute inset-x-0 bottom-0 p-4 text-white">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate font-semibold">{item.name}</div>
              <div className="text-sm opacity-90">
                ${item.price_usd.toFixed(2)}
              </div>
            </div>

            {qty <= 0 ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  addToCart(item);
                }}
                disabled={outOfStock}
                className="rounded-xl bg-white/95 px-4 py-2 text-sm font-medium text-black hover:bg-white disabled:opacity-60"
                style={{ cursor: outOfStock ? "not-allowed" : "pointer" }}
              >
                Agregar
              </button>
            ) : (
              <div
                className="flex items-center gap-2 rounded-xl bg-white/95 px-2 py-2 text-black"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  className="h-8 w-8 rounded-lg border hover:bg-black/5"
                  onClick={() => decreaseQty(item.id)}
                  style={{ cursor: "pointer" }}
                >
                  −
                </button>
                <span className="w-6 text-center text-sm font-semibold">
                  {qty}
                </span>
                <button
                  className="h-8 w-8 rounded-lg border hover:bg-black/5 disabled:opacity-50"
                  onClick={() => increaseQty(item.id)}
                  disabled={!canIncrease(item.id)}
                  style={{
                    cursor: canIncrease(item.id) ? "pointer" : "not-allowed",
                  }}
                >
                  +
                </button>
              </div>
            )}
          </div>

          <div className="mt-2 text-xs opacity-90">
            Stock: {remainingStock(item)}
          </div>
        </div>
      </div>
    </div>
  );
}
