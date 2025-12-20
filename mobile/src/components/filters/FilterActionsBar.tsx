import { View, Text, Pressable, Switch } from "react-native";
import { useFilterStore } from "../../store/filterStore";

type Props = {
  onApply: () => void;
};

export function FilterActionsBar({ onApply }: Props) {
  const { inStock, setInStock, reset } = useFilterStore();

  return (
    <View
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        padding: 16,
        borderTopWidth: 1,
        backgroundColor: "#fff",
      }}
    >
      {/* Top row: In stock + Reset */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text style={{ marginRight: 8 }}>In Stock</Text>
          <Switch value={inStock} onValueChange={setInStock} />
        </View>

        <Pressable onPress={reset}>
          <Text>Reset</Text>
        </Pressable>
      </View>

      {/* Apply button */}
      <Pressable
        onPress={onApply}
        style={{
          backgroundColor: "#000",
          paddingVertical: 12,
          alignItems: "center",
          borderRadius: 4,
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "600" }}>
          Apply Filters
        </Text>
      </Pressable>
    </View>
  );
}
