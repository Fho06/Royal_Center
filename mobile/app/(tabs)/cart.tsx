import {
  View,
  Text,
  FlatList,
  Button,
} from "react-native";
import { useCartStore } from "../../src/store/cartStore";
import { commonStyles } from "@/src/styles/common.styles";

export default function CartScreen() {
  const { items, increment, decrement, clear } = useCartStore();

  const total = items.reduce(
    (sum, i) => sum + i.item.price * i.quantity,
    0
  );

  if (items.length === 0) {
    return (
      <View style={{ padding: 24 }}>
        <Text style={commonStyles.title}> Your cart is empty </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <FlatList
        data={items}
        keyExtractor={(i) => i.item.id}
        renderItem={({ item }) => (
          <View style={{ marginBottom: 12 }}>
            <Text>{item.item.name}</Text>
            <Text>
              ${item.item.price.toFixed(2)} × {item.quantity}
            </Text>

            <View style={{ flexDirection: "row", gap: 8 }}>
              <Button
                title="-"
                onPress={() => decrement(item.item.id)}
              />
              <Button
                title="+"
                onPress={() => increment(item.item.id)}
              />
            </View>
          </View>
        )}
      />

      <Text style={[commonStyles.title, { marginVertical: 12 }]}>
        Total: ${total.toFixed(2)}
      </Text>

      <Button title="Clear Cart" onPress={clear} />
      <Button title="Checkout" onPress={() => {}} />
    </View>
  );
}
