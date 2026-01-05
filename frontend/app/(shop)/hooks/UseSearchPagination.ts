"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function useSearchPagination() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  /* =========================
     URL → STATE (search/page only, like your current behavior)
     ========================= */
  useEffect(() => {
    if (!hydrated) return;
    setSearch(searchParams.get("search") || "");
    setCurrentPage(Number(searchParams.get("page")) || 1);
  }, [hydrated, searchParams]);

  /* =========================
     STATE → URL (search/page only, like your current behavior)
     ========================= */
  useEffect(() => {
    if (!hydrated) return;

    const url = new URL(window.location.href);

    if (search) url.searchParams.set("search", search);
    else url.searchParams.delete("search");

    url.searchParams.set("page", String(currentPage));

    router.replace(url.pathname + "?" + url.searchParams.toString(), {
      scroll: false,
    });
  }, [hydrated, search, currentPage, router]);

  return {
    hydrated,
    search,
    setSearch,
    currentPage,
    setCurrentPage,
  };
}
