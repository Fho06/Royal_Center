"use client";

import { useState } from "react";
import Image from "next/image";
import type { Item } from "../types";

const IMAGE_BASE_URL =
  "https://pub-db262da1ef9140738af0ec8adade1c90.r2.dev/products";

// keep these lowercase (we normalize on error)
const IMAGE_EXTENSIONS = ["jpeg", "jpg", "webp", "png", "jfif", "heic"];

type Props = {
  item: Item;

  cartQty: (itemId: string) => number;
  remainingStock: (item: Item) => number;

  addToCart: (item: Item) => void;
  increaseQty: (itemId: string) => void;
  decreaseQty: (itemId: string) => void;
  canIncrease: (itemId: string) => boolean;

  variant?: "featured" | "search";

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
  variant = "featured",
  showRemove,
  onRemove,
}: Props) {
  const qty = cartQty(item.id);
  const outOfStock = remainingStock(item) <= 0;

  const [extIndex, setExtIndex] = useState(0);
  const [failed, setFailed] = useState(false);

  const src = failed
    ? "/placeholder.png"
    : `${IMAGE_BASE_URL}/${item.id}/1.${IMAGE_EXTENSIONS[extIndex]}`;

  function onImgError() {
    if (extIndex < IMAGE_EXTENSIONS.length - 1) setExtIndex((i) => i + 1);
    else setFailed(true);
  }

  /* =========================
     FEATURED (FULL IMAGE)
     ========================= */
  if (variant === "featured") {
    return (
      <div className="group h-full w-full rounded-2xl bg-white overflow-hidden transition-transform hover:-translate-y-0.5 hover:shadow-md">
        <div role="button" className="relative h-full">
          <Image
            src={src}
            alt={item.name}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            onError={onImgError}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />

          {showRemove && onRemove && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="absolute top-3 right-3 rounded-full bg-white/90 px-3 py-1 text-xs hover:bg-white"
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
                >
                  Agregar
                </button>
              ) : (
                <div
                  className="flex items-center gap-2 rounded-xl bg-white/95 px-2 py-2 text-black"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    className="h-8 w-8 rounded-lg hover:bg-black/5"
                    onClick={() => decreaseQty(item.id)}
                  >
                    −
                  </button>
                  <span className="w-6 text-center text-sm font-semibold">
                    {qty}
                  </span>
                  <button
                    className="h-8 w-8 rounded-lg hover:bg-black/5 disabled:opacity-50"
                    onClick={() => increaseQty(item.id)}
                    disabled={!canIncrease(item.id)}
                  >
                    +
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* =========================
     SEARCH (CLASSIC CARD)
     ========================= */
  return (
    <div className="h-full min-h-[460px] w-full rounded-xl border border-gray-200 bg-white flex flex-col hover:shadow-sm transition-shadow">
      <div className="relative w-full h-[340px] shrink-0">
        <Image
          src={src}
          alt={item.name}
          fill
          sizes="(max-width: 768px) 100vw, 25vw"
          onError={onImgError}
          className="object-contain"
        />
      </div>

      <div className="px-3 py-2 flex flex-col gap-1">
        <div className="text-sm font-medium leading-snug line-clamp-2">
          {item.name}
        </div>

        <div className="text-base font-semibold">
          ${item.price_usd.toFixed(2)}
        </div>

        {qty <= 0 ? (
          <button
            onClick={() => addToCart(item)}
            disabled={outOfStock}
            className="mt-1 w-fit rounded-full bg-yellow-400 px-3 py-1.5 text-sm font-medium text-black hover:bg-yellow-300 disabled:opacity-50"
          >
            Agregar
          </button>
        ) : (
          <div className="mt-1 flex items-center gap-2 rounded-full border px-2 py-1 w-fit">
            <button onClick={() => decreaseQty(item.id)} className="px-1">
              −
            </button>
            <span className="text-sm font-semibold">{qty}</span>
            <button
              onClick={() => increaseQty(item.id)}
              disabled={!canIncrease(item.id)}
              className="px-1 disabled:opacity-50"
            >
              +
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
