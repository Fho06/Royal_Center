import {
  View,
  Text,
  Pressable,
  ScrollView,
  Platform,
} from "react-native";
import { useCategories } from "../../hooks/useCategories";
import { useFilterStore } from "../../store/filterStore";

export function CategorySelector() {
  const { data: categories } = useCategories();
  const {
    categoryId,
    subcategoryId,
    setCategoryId,
    setSubcategoryId,
  } = useFilterStore();

  const mainCategories =
    categories?.filter((c) => c.level === 1) ?? [];

  const subcategories =
    categories?.filter(
      (c) => c.level === 2 && c.parent_id === categoryId
    ) ?? [];

  return (
    <View
      style={{
        flex: 1,
        flexDirection: "row",
        borderTopWidth: 1,
        borderBottomWidth: 1,
      }}
    >
      {/* LEFT: Categories (narrower) */}
      <ScrollView
        style={{
          width: 20,
          borderRightWidth: 1,
        }}
        contentContainerStyle={{ paddingVertical: 6 }}
      >
        {mainCategories.map((c) => {
          const selected = c.id === categoryId;

          return (
            <Pressable
              key={c.id}
              onPress={() => {
                setCategoryId(c.id);
                setSubcategoryId(null);
              }}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 10,
                marginVertical: 4,
                backgroundColor: selected ? "#eee" : "transparent",
                ...(selected
                  ? Platform.select({
                      ios: {
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.2,
                        shadowRadius: 3,
                      },
                      android: { elevation: 3 },
                    })
                  : {}),
              }}
            >
              <Text style={{ 
                fontSize: 12,
                lineHeight: 16,
                fontWeight: selected ? "600" : "400" }}>
                {c.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* RIGHT: Subcategories (wider + independent scroll) */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingVertical: 6,
          paddingHorizontal: 12,
        }}
      >
        {categoryId === null ? (
          <Text style={{ color: "#666", padding: 12 }}>
            Select a category
          </Text>
        ) : subcategories.length === 0 ? (
          <Text style={{ color: "#666", padding: 12 }}>
            No subcategories
          </Text>
        ) : (
          subcategories.map((c) => {
            const selected = c.id === subcategoryId;

            return (
              <Pressable
                key={c.id}
                onPress={() => setSubcategoryId(c.id)}
                style={{
                  paddingVertical: 10,
                  //paddingHorizontal: 14,
                  marginVertical: 6,
                  borderRadius: 6,
                  backgroundColor: selected ? "#eee" : "transparent",
                  ...(selected
                    ? Platform.select({
                        ios: {
                          shadowColor: "#000",
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.2,
                          shadowRadius: 3,
                        },
                        android: { elevation: 3 },
                      })
                    : {}),
                }}
              >
                <Text
                  style={{ fontWeight: selected ? "600" : "400" }}
                >
                  {c.name}
                </Text>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}
