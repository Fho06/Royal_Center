import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { Item } from "../types";

type Params = {
  search: string;
  category: string;
  subcategory: string;
  inStockOnly: boolean;
  page: number;
  limit: number;
};

export function useItems({
  search,
  category,
  subcategory,
  inStockOnly,
  page,
  limit,
}: Params) {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    const qs = new URLSearchParams({
      limit: limit.toString(),
      offset: ((page - 1) * limit).toString(),
    });

    if (search) qs.set("search", search);
    if (inStockOnly) qs.set("in_stock", "1");

    if (subcategory !== "all") qs.set("subcategory_id", subcategory);
    else if (category !== "all") qs.set("category_id", category);

    apiRequest(`/items?${qs}`)
      .then(data => {
        setItems(Array.isArray(data.items) ? data.items : []);
        setTotal(Number(data.total) || 0);
      })
      .catch(err => setError(err.message));
  }, [
    search,
    category,
    subcategory,
    inStockOnly,
    page,
    limit,
  ]); // ✅ stable deps

  return { items, total, error };
}