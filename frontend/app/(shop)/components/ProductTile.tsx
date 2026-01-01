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

  if (variant === "featured") {
    const isSmall = heroSize === "small";

    const nameClass = isSmall
      ? "text-xs font-semibold"
      : "text-sm font-semibold";

    const priceClass = isSmall ? "text-[11px]" : "text-sm";

    const plusSize = isSmall
      ? "h-6 w-6 text-xs sm:h-8 sm:w-8 sm:text-sm"
      : "h-8 w-8 text-sm sm:h-10 sm:w-10 sm:text-lg";

    const qtyBtnSize = isSmall
      ? "h-4 w-4 sm:h-5 sm:w-5"
      : "h-5 w-5 sm:h-6 sm:w-6";

    const qtyTextSize = isSmall
      ? "text-[10px] sm:text-[11px]"
      : "text-xs sm:text-sm";

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
              className="absolute top-2 left-2 z-20 rounded-full bg-white/90 px-2 py-0.5 text-[11px] hover:bg-white"
            >
              Quitar
            </button>
          )}

          {/* SINGLE + BUTTON (ONLY WHEN qty === 0) */}
          {qty <= 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                addToCart(item);
              }}
              disabled={outOfStock}
              className={`
                absolute top-2 right-2 z-20
                ${plusSize}
                flex items-center justify-center
                rounded-full bg-[var(--navbar-accent)]
                font-bold text-white
                hover:brightness-95 disabled:opacity-60
              `}
            >
              +
            </button>
          )}

          {/* QTY PILL (ONLY WHEN qty > 0) */}
          {qty > 0 && (
            <div
              className="
                absolute top-2 right-2 z-20
                flex items-center gap-1
                rounded-full bg-[var(--navbar-accent-soft)]
                px-1.5 py-0.5
              "
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className={`${qtyBtnSize}
                  flex items-center justify-center
                  leading-none
                  translate-y-[0.5px]
                  text-white
                `}
                onClick={() => decreaseQty(item.id)}
              >
                −
              </button>

              <span
                className={`w-3 text-center font-semibold text-white ${qtyTextSize}`}
              >
                {qty}
              </span>

              <button
                className={`${plusSize}
                  flex items-center justify-center
                  rounded-full
                  leading-none
                  translate-y-[-0.5px]
                  bg-[var(--navbar-accent)]
                  text-white font-bold
                `}
                onClick={() => increaseQty(item.id)}
                disabled={!canIncrease(item.id)}
              >
                +
              </button>
            </div>
          )}

          {/* BOTTOM TEXT */}
          <div className="absolute inset-x-0 bottom-0 p-3 text-white">
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

  /* SEARCH CARD (UNCHANGED) */
  return (
    <div
      className="
        w-full rounded-xl border border-gray-200 bg-white
        flex flex-col hover:shadow-sm transition-shadow
        sm:min-h-[460px]
      "
    >
      {/* IMAGE */}
      <div className="relative w-full h-[150px] sm:h-[340px] shrink-0">
        <Image
          src={src}
          alt={item.name}
          fill
          sizes="(max-width: 768px) 100vw, 25vw"
          onError={onImgError}
          className="object-contain"
        />
      </div>

      {/* TEXT / ACTIONS */}
      <div className="px-2 pt-1 pb-1 sm:px-3 sm:pt-2 sm:pb-2 flex flex-col gap-0">
        <div className="text-xs sm:text-sm font-medium leading-tight line-clamp-2">
          {item.name}
        </div>

        <div className="text-sm sm:text-base font-semibold leading-tight">
          ${item.price_usd.toFixed(2)}
        </div>

        {qty <= 0 ? (
          <button
            onClick={() => addToCart(item)}
            disabled={outOfStock}
            className="
              mt-0.5 w-fit rounded-lg
              bg-[var(--navbar-accent)]
              px-2 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-sm
              font-semibold text-white
              hover:brightness-95 disabled:opacity-50
            "
          >
            Agregar
          </button>
        ) : (
          <div className="mt-0.5 flex items-center gap-1 rounded-lg bg-[var(--navbar-accent-soft)] px-1.5 py-0.5 w-fit">
            <button
              onClick={() => decreaseQty(item.id)}
              className="h-6 w-6 sm:h-7 sm:w-7 rounded-md text-white hover:bg-white/10 transition-colors"
            >
              −
            </button>

            <span className="text-xs sm:text-sm font-semibold text-white">
              {qty}
            </span>

            <button
              onClick={() => increaseQty(item.id)}
              disabled={!canIncrease(item.id)}
              className="h-6 w-6 sm:h-7 sm:w-7 rounded-md text-white hover:bg-white/10 disabled:opacity-40 transition-colors"
            >
              +
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
