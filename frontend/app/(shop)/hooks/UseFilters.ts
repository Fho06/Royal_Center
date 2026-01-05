"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export function useFilters(opts: {
  hydrated: boolean;
  search: string;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  setIsLoadingResults: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const { hydrated, search, setCurrentPage, setIsLoadingResults } = opts;

  /* =========================
     DRAFT FILTERS (UI ONLY)
     ========================= */
  const [draftCategoryIds, setDraftCategoryIds] = useState<number[]>([]);
  const [draftSubcategoryIds, setDraftSubcategoryIds] = useState<number[]>([]);
  const [draftInStockOnly, setDraftInStockOnly] = useState(true);
  const [draftPriceRange, setDraftPriceRange] =
    useState<[number, number] | null>(null);

  /* =========================
     APPLIED FILTERS (USED FOR FETCH)
     ========================= */
  const [categoryIds, setCategoryIds] = useState<number[]>([]);
  const [subcategoryIds, setSubcategoryIds] = useState<number[]>([]);
  const [inStockOnly, setInStockOnly] = useState(true);
  const [priceRange, setPriceRange] = useState<[number, number] | null>(null);

  /* =========================
     RESET FILTERS ON NEW SEARCH
     (resets BOTH draft + applied)
     ========================= */
  useEffect(() => {
    if (!hydrated) return;

    // draft
    setDraftCategoryIds([]);
    setDraftSubcategoryIds([]);
    setDraftPriceRange(null);
    setDraftInStockOnly(true);

    // applied
    setCategoryIds([]);
    setSubcategoryIds([]);
    setPriceRange(null);
    setInStockOnly(true);

    setCurrentPage(1);
  }, [hydrated, search, setCurrentPage]);

  /* =========================
     APPLY / CLEAR (ONLY TIME APPLIED STATE CHANGES)
     ========================= */
  function applyFilters() {
    setIsLoadingResults(true);

    setCategoryIds(draftCategoryIds);
    setSubcategoryIds(draftSubcategoryIds);
    setInStockOnly(draftInStockOnly);
    setPriceRange(draftPriceRange);
    setCurrentPage(1);

    setTimeout(() => {
      setIsLoadingResults(false);
    }, 300);
  }

  function clearFilters() {
    // draft
    setDraftCategoryIds([]);
    setDraftSubcategoryIds([]);
    setDraftInStockOnly(true);
    setDraftPriceRange(null);

    // applied
    setCategoryIds([]);
    setSubcategoryIds([]);
    setInStockOnly(true);
    setPriceRange(null);

    setCurrentPage(1);
  }

  return {
    // draft
    draftCategoryIds,
    setDraftCategoryIds,
    draftSubcategoryIds,
    setDraftSubcategoryIds,
    draftInStockOnly,
    setDraftInStockOnly,
    draftPriceRange,
    setDraftPriceRange,

    // applied
    categoryIds,
    subcategoryIds,
    inStockOnly,
    priceRange,

    // actions
    applyFilters,
    clearFilters,
  };
}
