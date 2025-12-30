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
  variant?: "featured" | "search";
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
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
      {items.map((item) => (
        <ProductTile
          key={item.id}
          item={item}
          cartQty={cartQty}
          remainingStock={remainingStock}
          addToCart={addToCart}
          increaseQty={increaseQty}
          decreaseQty={decreaseQty}
          canIncrease={canIncrease}
          variant="search"
        />
      ))}
    </div>
  );
}

