import { View, Text, FlatList, ActivityIndicator } from "react-native";
import { useItems } from "../../src/hooks/useItems";
import { ProductCard } from "../../src/components/ProductCard";

export default function ProductsScreen() {
  const { data, isLoading, error } = useItems();

  if (isLoading) {
    return <ActivityIndicator style={{ marginTop: 40 }} />;
  }

  if (error || !data) {
    return (
      <View style={{ padding: 24 }}>
        <Text>Failed to load products</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={data.items}   // ✅ FIX HERE
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <ProductCard item={item} />}
    />
  );
}
