import { View, Text, Pressable } from "react-native";
import { Item } from "../types/item";
import { useCartStore } from "../store/cartStore";
import { commonStyles } from "../styles/common.styles";

export function ProductCard({ item }: { item: Item }) {
  const addItem = useCartStore((s) => s.addItem);
  const quantityInCart = useCartStore((s) =>
    s.getQuantity(item.id)
  );

  const remainingStock = item.stock - quantityInCart;
  const outOfStock = remainingStock <= 0;

  return (
    <View style={commonStyles.card}>
      <View style={commonStyles.cardInfo}>
        <Text style={commonStyles.title}>{item.name}</Text>
        <Text style={commonStyles.price}>
          ${item.price.toFixed(2)} / {item.unit}
        </Text>
        <Text style={commonStyles.mutedText}>
          {remainingStock > 0
            ? `${remainingStock} in stock`
            : "Out of stock"}
        </Text>
      </View>

      <Pressable
        onPress={() => addItem(item)}
        disabled={outOfStock}
        accessibilityRole="button"
        accessibilityLabel={`Add ${item.name} to cart`}
        accessibilityState={{ disabled: outOfStock }}
        style={({ pressed }) => [
          commonStyles.primaryButton,
          outOfStock && commonStyles.disabledButton,
          pressed && !outOfStock && { opacity: 0.8 },
        ]}
      >
        <Text style={commonStyles.primaryButtonText}>
          Add
        </Text>
      </Pressable>
    </View>
  );
}
