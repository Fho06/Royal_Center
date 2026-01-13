"use client";

import { useState } from "react";
import Image from "next/image";

const IMAGE_BASE_URL =
  "https://pub-db262da1ef9140738af0ec8adade1c90.r2.dev/products";

const IMAGE_EXTENSIONS = ["jpeg", "jpg", "webp", "png", "jfif", "heic"];

type Props = {
  itemId: string;
  name: string;
  quantity: number;
  price: number;
};

export function OrderItemRow({
  itemId,
  name,
  quantity,
  price,
}: Props) {
  const [extIndex, setExtIndex] = useState(0);
  const [failed, setFailed] = useState(false);

  const src = failed
    ? "/placeholder.png"
    : `${IMAGE_BASE_URL}/${itemId}/1.${IMAGE_EXTENSIONS[extIndex]}`;

  function onImgError() {
    if (extIndex < IMAGE_EXTENSIONS.length - 1) {
      setExtIndex(i => i + 1);
    } else {
      setFailed(true);
    }
  }

  return (
    <div className="flex gap-4 p-4 items-start">
      {/* IMAGE (same size/feel as cart) */}
      <div className="relative w-16 h-16 shrink-0 rounded-lg overflow-hidden border">
        <Image
          src={src}
          alt={name}
          fill
          sizes="64px"
          onError={onImgError}
          className="object-contain"
        />
      </div>

      {/* INFO */}
      <div className="flex-1 min-w-0">
        <p className="font-medium leading-tight truncate">
          {name}
        </p>

        <p className="text-sm text-gray-500 mt-1">
          ${price.toFixed(2)}
        </p>

        <div className="mt-2 text-sm text-gray-600">
          Cantidad:{" "}
          <span className="font-medium text-gray-900">
            {quantity}
          </span>
        </div>
      </div>

      {/* TOTAL */}
      <div className="text-right shrink-0">
        <p className="font-semibold">
          ${(price * quantity).toFixed(2)}
        </p>
      </div>
    </div>
  );
}
