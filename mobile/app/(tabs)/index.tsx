import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useEffect, useState } from "react";
import { useItems } from "../../src/hooks/useItems";
import { ProductCard } from "../../src/components/ProductCard";
import { Item } from "../../src/types/item";
import { useFilterStore } from "../../src/store/filterStore";
import { FilterSheet } from "../../src/components/filters/FilterSheet";

const ITEMS_PER_PAGE = 20;

export default function ProductsScreen() {
  const [items, setItems] = useState<Item[]>([]);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // 🔑 filter state (Zustand)
  const filters = useFilterStore();

  // ✅ filters INCLUDED in query
  const { data, isLoading, isFetching, error } = useItems({
    offset,
    search: filters.search,
    categoryId: filters.categoryId,
    subcategoryId: filters.subcategoryId,
    inStock: filters.inStock,
    sort: filters.sort,
  });

  // 🔁 Reset pagination when filters change
  useEffect(() => {
    setItems([]);
    setOffset(0);
    setTotal(null);
  }, [
    filters.search,
    filters.categoryId,
    filters.subcategoryId,
    filters.inStock,
    filters.sort,
  ]);

  // ✅ Append new items safely
  useEffect(() => {
    if (!data) return;

    setItems((prev) => {
      const existing = new Set(prev.map((p) => p.id));
      const newItems = data.items.filter(
        (item) => !existing.has(item.id)
      );
      return [...prev, ...newItems];
    });

    setTotal(data.total);
  }, [data]);

  const loadMore = () => {
    if (isFetching) return;
    if (total !== null && items.length >= total) return;

    setOffset((prev) => prev + ITEMS_PER_PAGE);
  };

  if (isLoading && items.length === 0) {
    return <ActivityIndicator style={{ marginTop: 40 }} />;
  }

  if (error) {
    return (
      <View style={{ padding: 24 }}>
        <Text>Failed to load products</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* 🔍 Filter Button */}
      <TouchableOpacity
        onPress={() => setShowFilters(true)}
        style={{
          padding: 12,
          backgroundColor: "#000",
          alignItems: "center",
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "600" }}>
          Filters
        </Text>
      </TouchableOpacity>

      {/* 🛍 Product List */}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <ProductCard item={item} />
        )}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isFetching ? (
            <ActivityIndicator style={{ margin: 16 }} />
          ) : null
        }
      />

      {/* 🧰 Filter Sheet */}
      <View
        pointerEvents={showFilters ? "auto" : "none"}
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          top: 0,
          backgroundColor: "#fff",
          transform: [{ translateY: showFilters ? 0 : 1000 }],
        }}
      >
        <FilterSheet onClose={() => setShowFilters(false)} />
      </View>
    </View>
  );
}
