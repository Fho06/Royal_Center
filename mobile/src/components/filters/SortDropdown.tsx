import {
  View,
  Text,
  Pressable,
  Platform,
} from "react-native";
import { useState } from "react";
import { useFilterStore } from "../../store/filterStore";

export function SortDropdown() {
  const { sort, setSort } = useFilterStore();
  const [open, setOpen] = useState(false);

  const renderOption = (
    label: string,
    value: "asc" | "desc"
  ) => {
    const selected = sort === value;

    return (
      <Pressable
        onPress={() => {
          setSort(value);
          setOpen(false);
        }}
        style={{
          paddingVertical: 12,
          paddingHorizontal: 12,
          marginVertical: 4,
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
          style={{
            fontWeight: selected ? "600" : "400",
          }}
        >
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={{ marginBottom: 8 }}>
      {/* Dropdown toggle */}
      <Pressable
        onPress={() => setOpen((p) => !p)}
        style={{
          paddingVertical: 12,
          paddingHorizontal: 10,
          borderWidth: 1,
          borderRadius: 6,
        }}
      >
        <Text style={{ fontWeight: "600" }}>
          Sort by Price{" "}
          {sort === "asc"
            ? "(Low → High)"
            : sort === "desc"
            ? "(High → Low)"
            : ""}
        </Text>
      </Pressable>

      {/* Options */}
      {open && (
        <View style={{ marginTop: 8 }}>
          {renderOption("Low → High", "asc")}
          {renderOption("High → Low", "desc")}
        </View>
      )}
    </View>
  );
}
