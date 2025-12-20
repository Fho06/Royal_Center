import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { Item } from "../types/item";

type ItemsResponse = {
  items: Item[];
  total: number;
};

export function useItems(params?: {
  limit?: number;
  offset?: number;
  search?: string;
  category_id?: number;
  subcategory_id?: number;
  in_stock?: boolean;
  sort?: "asc" | "desc";
}) {
  return useQuery<ItemsResponse>({
    queryKey: ["items", params],
    queryFn: async () => {
      const res = await api.get("/api/items", {
        params: {
          limit: params?.limit ?? 20,
          offset: params?.offset ?? 0,
          search: params?.search ?? "",
          category_id: params?.category_id,
          subcategory_id: params?.subcategory_id,
          in_stock: params?.in_stock ? "1" : undefined,
          sort: params?.sort,
        },
      });

      return res.data;
    },
  });
}
