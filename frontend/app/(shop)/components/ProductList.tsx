import { Item } from "../types";
const IMAGE_BASE_URL = "https://pub-db262da1ef9140738af0ec8adade1c90.r2.dev/products";
const IMAGE_EXTENSIONS = ["jpeg", "jpg", "webp", "png", "jfif", "HEIC"];


type Props = {
  items: Item[];
  remainingStock: (item: Item) => number;
  addToCart: (item: Item) => void;
};

function getProductImageUrl(itemId: string, index: number = 1) {
  return `${IMAGE_BASE_URL}/${itemId}/${index}.jpg`;
}

export function ProductList({ items, remainingStock, addToCart }: Props) {
  return (
    <>
      {items
        .filter(i => i.price_usd > 0)
        .map(item => (
          <div
            key={item.id}
            className="border rounded p-4 flex gap-4"
          >
            {/* PRODUCT IMAGE */}
            <img
              src={`${IMAGE_BASE_URL}/${item.id}/1.${IMAGE_EXTENSIONS[0]}`}
              alt={item.name}
              className="w-24 h-24 object-cover rounded"
              loading="lazy"
              onError={(e) => {
                const img = e.currentTarget as HTMLImageElement;

                const currentSrc = img.src;
                const currentExt = currentSrc.split(".").pop();
                const currentIndex = IMAGE_EXTENSIONS.indexOf(currentExt || "");

                // Try next extension
                const nextExt = IMAGE_EXTENSIONS[currentIndex + 1];

                if (nextExt) {
                  img.src = `${IMAGE_BASE_URL}/${item.id}/1.${nextExt}`;
                } else {
                  // All failed → fallback
                  img.onerror = null;
                  img.src = "/placeholder.png";
                }
              }}
            />


            {/* PRODUCT INFO */}
            <div className="flex-1 flex justify-between">
              <div>
                <h3 className="font-semibold">{item.name}</h3>
                <p>${item.price_usd.toFixed(2)}</p>
                <p className="text-sm text-gray-500">
                  Stock: {remainingStock(item)}
                </p>
              </div>

              <button
                onClick={() => addToCart(item)}
                disabled={remainingStock(item) <= 0}
                className="bg-black text-white px-4 py-2 rounded disabled:opacity-50 h-fit"
              >
                Add
              </button>
            </div>
          </div>
        ))}
    </>
  );
}
