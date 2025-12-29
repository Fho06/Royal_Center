import { Item } from "../types";
import { ProductTile } from "./ProductTile";

type Props = {
  items: Item[];

  cartQty: (itemId: string) => number;
  remainingStock: (item: Item) => number;

  addToCart: (item: Item) => void;
  increaseQty: (itemId: string) => void;
  decreaseQty: (itemId: string) => void;
  canIncrease: (itemId: string) => boolean;
};

export function ProductList({
  items,
  cartQty,
  remainingStock,
  addToCart,
  increaseQty,
  decreaseQty,
  canIncrease,
}: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {items
        .filter((i) => i.price_usd > 0)
        .map((item) => (
          <div key={item.id} className="h-[260px] md:h-[300px]">
            <ProductTile
              item={item}
              cartQty={cartQty}
              remainingStock={remainingStock}
              addToCart={addToCart}
              increaseQty={increaseQty}
              decreaseQty={decreaseQty}
              canIncrease={canIncrease}
            />
          </div>
        ))}
    </div>
  );
}
