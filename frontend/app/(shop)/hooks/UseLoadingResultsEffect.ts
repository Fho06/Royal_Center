"use client";

import { useEffect } from "react";

export function useLoadingResultsEffect(opts: {
  hydrated: boolean;
  search: string;
  currentPage: number;
  categoryIds: number[];
  subcategoryIds: number[];
  inStockOnly: boolean;
  priceRange: [number, number] | null;
  setIsLoadingResults: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const {
    hydrated,
    search,
    currentPage,
    categoryIds,
    subcategoryIds,
    inStockOnly,
    priceRange,
    setIsLoadingResults,
  } = opts;

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
    categoryIds.join(","),
    subcategoryIds.join(","),
    inStockOnly,
    priceRange?.[0],
    priceRange?.[1],
    setIsLoadingResults,
  ]);
}
