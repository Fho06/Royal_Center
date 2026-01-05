"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { DEFAULT_LOCATION } from "./constants";
import { getToken, loadLocalHistory, saveLocalHistory } from "./searchHistory";

export function NavbarSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [location, setLocation] = useState(
    searchParams.get("location") || DEFAULT_LOCATION
  );
  const [showLocations, setShowLocations] = useState(false);

  const [search, setSearch] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);

  // ✅ keep in sync with URL like original
  useEffect(() => {
    setSearch(searchParams.get("search") || "");
  }, [searchParams]);

  useEffect(() => {
    setLocation(searchParams.get("location") || DEFAULT_LOCATION);
  }, [searchParams]);

  /* load history like original */
  useEffect(() => {
    async function load() {
      const token = getToken();
      if (!token) {
        setHistory(loadLocalHistory());
        return;
      }

      const res = await fetch("/api/search-history", {
        headers: { authorization: `Bearer ${token}` },
      });

      if (res.ok) setHistory(await res.json());
    }

    load();
  }, []);

    async function submitSearch(value: string) {
    const q = value.trim();
    if (!q) return router.push("/");

    const token = getToken();

    if (token) {
        await fetch("/api/search-history", {
        method: "POST",
        headers: {
            "content-type": "application/json",
            authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ query: q }),
        });
    } else {
        // ✅ original behavior: case-insensitive dedupe + max 8
        const next = [
        q,
        ...history.filter((h) => h.toLowerCase() !== q.toLowerCase()),
        ];
        saveLocalHistory(next);
        setHistory(next.slice(0, 8));
    }

    setShowHistory(false);
    setActiveIndex(-1);

    inputRef.current?.blur();

    router.push(
        `/?search=${encodeURIComponent(q)}&location=${encodeURIComponent(location)}`
    );
    router.refresh();
    }


  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showHistory) {
      if (e.key === "Enter") submitSearch(search);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, history.length - 1));
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    }

    if (e.key === "Enter") {
        e.preventDefault();
        submitSearch(activeIndex >= 0 ? history[activeIndex] : search);
        inputRef.current?.blur();
    }


    if (e.key === "Escape") {
      setShowHistory(false);
      setActiveIndex(-1);
    }
  }

  async function deleteHistoryItem(item: string) {
    const token = getToken();

    if (token) {
      await fetch(`/api/search-history/${encodeURIComponent(item)}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${token}` },
      });
    }

    const next = history.filter((h) => h !== item);
    saveLocalHistory(next);
    setHistory(next);
  }

  return (
    <div className="relative w-full">
      <div className="flex relative h-11 sm:h-11">
        {/* LOCATION BUTTON */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowLocations((v) => !v)}
            className="
              navbar-btn
              h-full
              w-11
              flex items-center justify-center
              rounded-l-lg
              border
            "
          >
            <Image src="/location.png" alt="Location" width={18} height={18} />
          </button>

          {showLocations && (
            <div
              className="absolute left-0 top-full mt-1 w-28 bg-white border rounded-lg shadow-lg z-50"
              onMouseDown={(e) => e.preventDefault()}
            >
              {["29"].map((loc) => (
                <button
                  key={loc}
                  onClick={() => {
                    setLocation(loc);
                    setShowLocations(false);

                    const params = new URLSearchParams(searchParams.toString());
                    params.set("location", loc);
                    router.push(`/?${params.toString()}`);
                  }}
                  className={`block w-full text-left px-3 py-2 hover:bg-black/5 ${
                    location === loc ? "font-semibold" : ""
                  }`}
                >
                  {`Ubicación ${loc}`}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* SEARCH INPUT */}
        <input
          ref={inputRef}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => setShowHistory(true)}
          onBlur={() => setTimeout(() => setShowHistory(false), 150)}
          onKeyDown={handleKeyDown}
          placeholder="Buscar productos..."
          className="navbar-input w-full h-full px-4 bg-white/60 border border-x-0 focus:outline-none"
        />

        {/* SEARCH BUTTON */}
        <button
          onClick={() => submitSearch(search)}
          className="
            navbar-btn
            h-full
            w-11
            flex items-center justify-center
            rounded-r-lg
            border
          "
        >
          <Image src="/search.png" alt="Search" width={18} height={18} />
        </button>
      </div>

      {/* HISTORY DROPDOWN */}
      {showHistory && history.length > 0 && (
        <div className="navbar-dropdown navbar-history absolute left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-50">
          {history.map((item, i) => (
            <div
              key={item}
              className={`flex justify-between px-3 py-2 cursor-pointer ${
                i === activeIndex ? "bg-black/5" : ""
              }`}
              onMouseDown={() => submitSearch(item)}
            >
              <span className="truncate">{item}</span>
              <button
                onMouseDown={(e) => {
                  e.stopPropagation();
                  deleteHistoryItem(item);
                }}
                className="opacity-60 hover:opacity-100"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
