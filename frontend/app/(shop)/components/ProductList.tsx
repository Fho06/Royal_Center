import { Item } from "../types";
const IMAGE_BASE_URL = "https://pub-db262da1ef9140738af0ec8adade1c90.r2.dev/products";


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
              src={getProductImageUrl(item.id)}
              alt={item.name}
              className="w-24 h-24 object-cover rounded"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.onerror = null; // Prevent infinite loop
                e.currentTarget.src = "/placeholder.png";
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
