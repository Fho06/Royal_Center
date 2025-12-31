"use client";

import Image from "next/image";
import { useState } from "react";

const IMAGE_BASE_URL =
  "https://pub-db262da1ef9140738af0ec8adade1c90.r2.dev/products";

const IMAGE_EXTENSIONS = ["jpeg", "jpg", "webp", "png", "jfif", "heic"];

type Props = {
  item: any;
  increaseQty: (id: string) => void;
  decreaseQty: (id: string) => void;
  removeFromCart: (id: string) => void;
};

export function CartItemRow({
  item,
  increaseQty,
  decreaseQty,
  removeFromCart,
}: Props) {
  const [extIndex, setExtIndex] = useState(0);
  const [failed, setFailed] = useState(false);

  const src = failed
    ? "/placeholder.png"
    : `${IMAGE_BASE_URL}/${item.item_id}/1.${IMAGE_EXTENSIONS[extIndex]}`;

  return (
    <div className="flex gap-4 border rounded p-4">
      <div className="w-20 h-20 relative shrink-0">
        <Image
          src={src}
          alt={item.name}
          fill
          className="object-contain"
          onError={() => {
            if (extIndex < IMAGE_EXTENSIONS.length - 1) {
              setExtIndex(i => i + 1);
            } else {
              setFailed(true);
            }
          }}
        />
      </div>

      <div className="flex-1">
        <p className="font-medium">{item.name}</p>
        <p className="text-sm text-gray-500">
          ${item.price.toFixed(2)}
        </p>

        <div className="mt-2 flex items-center gap-2">
          <button
            onClick={() => decreaseQty(item.item_id)}
            className="w-7 h-7 border rounded"
          >
            −
          </button>
          <span>{item.quantity}</span>
          <button
            onClick={() => increaseQty(item.item_id)}
            className="w-7 h-7 border rounded"
          >
            +
          </button>
        </div>
      </div>

      {/* PRICE + DELETE */}
      <div className="flex flex-col items-end justify-between">
        <div className="font-semibold">
          ${(item.price * item.quantity).toFixed(2)}
        </div>

        <button
          onClick={() => removeFromCart(item.item_id)}
          className="text-xs text-red-600"
        >
          Eliminar
        </button>
      </div>
    </div>
  );
}
