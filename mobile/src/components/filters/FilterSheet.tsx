import { View, Text, TextInput } from "react-native";
import { useFilterStore } from "../../store/filterStore";
import { SortDropdown } from "./SortDropdown";
import { CategorySelector } from "./CategorySelector";
import { FilterActionsBar } from "./FilterActionsBar";

type Props = {
  onClose: () => void;
};

export function FilterSheet({ onClose }: Props) {
  const { search, setSearch } = useFilterStore();

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* Top content */}
      <View style={{ padding: 8 }}>
        {/* Search */}
        <Text style={{ marginBottom: 4, fontSize: 18 }}>Search</Text>
        <TextInput
          placeholder="Search products"
          placeholderTextColor="#999"
          value={search}
          onChangeText={setSearch}
          style={{
            borderWidth: 1,
            padding: 8,
            marginBottom: 16,
          }}
        />

        {/* Sort dropdown */}
        <SortDropdown />
      </View>

      {/* Middle: Category / Subcategory panes (scroll internally) */}
      <View style={{ flex: 1 }}>
        <CategorySelector />
      </View>

      {/* Bottom: Sticky actions */}
      <FilterActionsBar onApply={onClose} />
    </View>
  );
}
