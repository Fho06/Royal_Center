"use client";

import { useEffect, useState } from "react";

export function useSearchLoading(opts: {
  hydrated: boolean;
  search: string;
  currentPage: number;
  categoryIds: number[];
  subcategoryIds: number[];
  inStockOnly: boolean;
  priceRange: [number, number] | null;
}) {
  const {
    hydrated,
    search,
    currentPage,
    categoryIds,
    subcategoryIds,
    inStockOnly,
    priceRange,
  } = opts;

  const [isLoadingResults, setIsLoadingResults] = useState(false);

  useEffect(() => {
    if (!hydrated) return;

    setIsLoadingResults(true);

    const t = setTimeout(() => {
      setIsLoadingResults(false);
    }, 250);

    return () => clearTimeout(t);
  }, [
    hydrated,
    search,
    currentPage,
    categoryIds,
    subcategoryIds,
    inStockOnly,
    priceRange,
  ]);

  return { isLoadingResults, setIsLoadingResults };
}
