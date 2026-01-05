"use client";

import Image from "next/image";
import { CartSidebar } from "@/app/(shop)/components/CartSidebar";
import { useCart } from "@/app/context/CartContext";

type Props = {
  isTouch: boolean;
  open: boolean;
  openCart: () => void;
  closeCart: () => void;
  onMobileClick: () => void;
};

export function NavbarCart({
  isTouch,
  open,
  openCart,
  closeCart,
  onMobileClick,
}: Props) {
  const { cart, cartCount, increaseQty, decreaseQty, clearCart } = useCart();

  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <div
      className="relative"
      onMouseEnter={!isTouch ? openCart : undefined}
      onMouseLeave={!isTouch ? closeCart : undefined}
    >
      {/* CART BUTTON (matches your original click behavior) */}
      <button
        onClick={() => {
          if (isTouch) onMobileClick();
        }}
        className="relative flex items-center pr-1"
      >
        <Image
          src="/cart6.png"
          alt="Cart"
          width={30}
          height={30}
          className="align-middle"
        />

        {cart.length > 0 && (
          <span className="navbar-badge absolute -top-2 -right-1 text-xs rounded-full px-1">
            {cartCount}
          </span>
        )}
      </button>

      {/* DESKTOP ONLY CART PREVIEW */}
      {!isTouch && open && (
        <div className="absolute right-0 top-full mt-2 w-80">
          <CartSidebar
            cart={cart}
            total={total}
            increase={increaseQty}
            decrease={decreaseQty}
            remove={clearCart}
          />
        </div>
      )}
    </div>
  );
}
