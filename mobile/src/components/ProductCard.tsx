import { View, Text, StyleSheet } from "react-native";
import { Item } from "../types/item";

export function ProductCard({ item }: { item: Item }) {
  return (
    <View style={styles.card}>
      <Text style={styles.name}>{item.name}</Text>

      <Text style={styles.price}>
        ${item.price.toFixed(2)} / {item.unit}
      </Text>

      <Text style={styles.stock}>
        {item.stock > 0 ? `${item.stock} in stock` : "Out of stock"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#fff",
    marginBottom: 12,
    elevation: 2, // Android shadow
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
  },
  price: {
    marginTop: 4,
    fontSize: 14,
    color: "#444",
  },
  stock: {
    marginTop: 4,
    fontSize: 12,
    color: "#666",
  },
});
