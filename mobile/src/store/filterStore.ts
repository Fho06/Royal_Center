import { create } from "zustand";

type SortOrder = "asc" | "desc" | null;

type FilterState = {
  search: string;
  categoryId: number | null;
  subcategoryId: number | null;
  inStock: boolean;
  sort: SortOrder;

  setSearch: (v: string) => void;
  setCategoryId: (v: number | null) => void;
  setSubcategoryId: (v: number | null) => void;
  setInStock: (v: boolean) => void;
  setSort: (v: SortOrder) => void;
  reset: () => void;
};

export const useFilterStore = create<FilterState>((set) => ({
  search: "",
  categoryId: null,
  subcategoryId: null,
  inStock: false,
  sort: null,

  setSearch: (search) => set({ search }),
  setCategoryId: (categoryId) =>
    set({ categoryId, subcategoryId: null }), // reset subcat
  setSubcategoryId: (subcategoryId) => set({ subcategoryId }),
  setInStock: (inStock) => set({ inStock }),
  setSort: (sort) => set({ sort }),

  reset: () =>
    set({
      search: "",
      categoryId: null,
      subcategoryId: null,
      inStock: false,
      sort: null,
    }),
}));
