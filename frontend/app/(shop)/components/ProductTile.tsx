"use client";

import { useState } from "react";
import Image from "next/image";
import type { Item } from "../types";

const IMAGE_BASE_URL =
  "https://pub-db262da1ef9140738af0ec8adade1c90.r2.dev/products";

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

  /* 👇 NEW */
  heroSize?: "large" | "small";

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
  heroSize = "large",
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
     FEATURED (HERO)
     ========================= */
  if (variant === "featured") {
    const nameClass =
      heroSize === "small"
        ? "text-sm font-semibold"
        : "text-lg font-semibold";

    const priceClass =
      heroSize === "small"
        ? "text-[13px]"
        : "text-sm";

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

          {/* ADMIN REMOVE */}
          {showRemove && onRemove && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="absolute top-3 left-3 z-20 rounded-full bg-white/90 px-3 py-1 text-xs hover:bg-white"
            >
              Quitar
            </button>
          )}

          {/* TOP RIGHT ACTION */}
          {qty <= 0 ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                addToCart(item);
              }}
              disabled={outOfStock}
              className="absolute top-3 right-3 z-20 rounded-xl bg-[var(--navbar-accent)] px-4 py-2 text-sm font-semibold text-white hover:brightness-95 disabled:opacity-60"
            >
              Agregar
            </button>
          ) : (
            <div
              className="absolute top-3 right-3 z-20 flex items-center gap-1.5 rounded-xl bg-[var(--navbar-accent-soft)] px-2 py-1"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="h-6 w-6 rounded-md text-white hover:bg-white/10"
                onClick={() => decreaseQty(item.id)}
              >
                −
              </button>

              <span className="w-4 text-center text-xs font-semibold text-white">
                {qty}
              </span>

              <button
                className="h-6 w-6 rounded-md text-white hover:bg-white/10 disabled:opacity-40"
                onClick={() => increaseQty(item.id)}
                disabled={!canIncrease(item.id)}
              >
                +
              </button>
            </div>
          )}

          {/* BOTTOM TEXT */}
          <div className="absolute inset-x-0 bottom-0 p-4 text-white">
            <div className="min-w-0">
              <div className={`truncate ${nameClass}`}>
                {item.name}
              </div>
              <div className={`opacity-90 ${priceClass}`}>
                ${item.price_usd.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* =========================
     SEARCH (UNCHANGED)
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
      </div>
    </div>
  );
}
