import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";

export type Category = {
  id: number;
  name: string;
  level: 1 | 2;
  parent_id: number | null;
};

export function useCategories() {
  return useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await api.get("/api/categories");
      return res.data;
    },
  });
}
