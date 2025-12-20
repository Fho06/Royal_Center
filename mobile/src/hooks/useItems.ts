import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { Item } from "../types/item";

export type SortOrder = "asc" | "desc" | null;

type ItemsResponse = {
  items: Item[];
  total: number;
};

const ITEMS_PER_PAGE = 10;

type UseItemsParams = {
  offset: number;
  search: string;
  categoryId: number | null;
  subcategoryId: number | null;
  inStock: boolean;
  sort: SortOrder;
};

export function useItems(params: UseItemsParams) {
  return useQuery({
    queryKey: [
      "items",
      params.offset,
      params.search,
      params.categoryId,
      params.subcategoryId,
      params.inStock,
      params.sort,
    ],
    queryFn: async (): Promise<ItemsResponse> => {
      const res = await api.get("/api/items", {
        params: {
          limit: ITEMS_PER_PAGE,
          offset: params.offset,
          search: params.search || undefined,
          category_id: params.categoryId ?? undefined,
          subcategory_id: params.subcategoryId ?? undefined,
          in_stock: params.inStock ? "1" : undefined,
          sort: params.sort ?? undefined,
        },
      });

      return res.data;
    },
    placeholderData: (prev) => prev,
  });
}
