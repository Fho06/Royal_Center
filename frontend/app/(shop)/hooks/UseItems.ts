import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiRequest } from "@/lib/api";
import { Item } from "../types";
import { LOCATION_MAP } from "@/lib/locationMap";


type Params = {
  search: string;
  categoryIds?: number[];
  subcategoryIds?: number[];
  inStockOnly: boolean;
  priceRange?: [number, number] | null;
  page: number;
  limit: number;
};

type Facets = {
  categories: number[];
  subcategories: number[];
};

type PriceBounds = {
  min: number | null;
  max: number | null;
};

export function useItems({
  search,
  categoryIds = [],
  subcategoryIds = [],
  inStockOnly,
  priceRange,
  page,
  limit,
}: Params) {
  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [facets, setFacets] = useState<Facets | null>(null);
  const [priceBounds, setPriceBounds] =
    useState<PriceBounds | null>(null);
  const [error, setError] = useState("");

  const searchParams = useSearchParams();
  const uiLocation = searchParams.get("location") ?? "29";
  const location = LOCATION_MAP[uiLocation] ?? "all";


  useEffect(() => {
    const qs = new URLSearchParams({
      limit: limit.toString(),
      offset: ((page - 1) * limit).toString(),
    });

    if (search) qs.set("search", search);
    if (inStockOnly) qs.set("in_stock", "1");
    if (categoryIds.length)
      qs.set("category_ids", categoryIds.join(","));
    if (subcategoryIds.length)
      qs.set("subcategory_ids", subcategoryIds.join(","));
    if (priceRange) {
      qs.set("price_min", priceRange[0].toString());
      qs.set("price_max", priceRange[1].toString());
    }

      qs.set("location", location);

    apiRequest(`/items?${qs.toString()}`)
      .then((data) => {
        setItems(data.items || []);
        setTotal(data.total || 0);
        setFacets(data.facets || null);
        setPriceBounds(data.priceBounds || null);
        setError("");
      })
      .catch((err) =>
        setError(err.message || "Failed to load items")
      );
  }, [
    search,
    categoryIds.join(","),
    subcategoryIds.join(","),
    inStockOnly,
    priceRange?.[0],
    priceRange?.[1],
    page,
    limit,
    location,
  ]);

  return { items, total, facets, priceBounds, error };
}
