import { useRouter } from "next/navigation";

type Props = {
  cart: any[];
  total: number;
  increase: (id: string) => void;
  decrease: (id: string) => void;
  remove: (id: string) => void;
  canIncrease: (id: string) => boolean;
};

export function CartSidebar(props: Props) {
  const router = useRouter();

  return (
    <aside className="border rounded p-4">
      <h2 className="text-xl font-semibold mb-2">Cart</h2>

      {props.cart.length === 0 && (
        <p className="text-gray-500 text-sm">Cart is empty</p>
      )}

      {props.cart.map(item => (
        <div key={item.item_id} className="flex justify-between mb-2 text-sm">
          <span>{item.name}</span>
          <div className="flex gap-2">
            <button onClick={() => props.decrease(item.item_id)}>−</button>
            <span>{item.quantity}</span>
            <button
              onClick={() => props.increase(item.item_id)}
              disabled={!props.canIncrease(item.item_id)}
            >
              +
            </button>
            <button onClick={() => props.remove(item.item_id)}>✕</button>
          </div>
        </div>
      ))}

      <p className="font-bold mt-3">Total: ${props.total.toFixed(2)}</p>

      <button
        onClick={() => router.push("/checkout")}
        className="mt-3 w-full bg-black text-white py-2 rounded"
      >
        Proceed to Checkout
      </button>
    </aside>
  );
}
