"use client";

import { useEffect, useState } from "react";
import type { Item } from "../types";

const IMAGE_BASE_URL =
  "https://pub-db262da1ef9140738af0ec8adade1c90.r2.dev/products";
const IMAGE_EXTENSIONS = ["jpeg", "jpg", "webp", "png", "jfif", "HEIC"];

function imageUrl(id: string, extIndex: number) {
  return `${IMAGE_BASE_URL}/${id}/1.${IMAGE_EXTENSIONS[extIndex]}`;
}

type Props = {
  open: boolean;
  onClose: () => void;
  onPick: (item: Item) => void;
};

export function AdminProductSearchModal({ open, onClose, onPick }: Props) {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [results, setResults] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!open) return;
    setQ("");
    setDebounced("");
    setResults([]);
    setErr("");
  }, [open]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    if (!open) return;
    if (!debounced) {
      setResults([]);
      return;
    }

    let cancelled = false;

    async function run() {
      setLoading(true);
      setErr("");
      try {
        const res = await fetch(
          `/api/items?search=${encodeURIComponent(debounced)}&limit=12&offset=0`
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Search failed");
        if (!cancelled) setResults((data?.items || []) as Item[]);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || "Search failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [open, debounced]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 md:p-8">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        style={{ cursor: "pointer" }}
      />
      <div className="relative w-full max-w-2xl rounded-2xl border bg-white p-4 shadow-xl">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold">Buscar producto</h3>
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-1 text-sm hover:bg-black/5"
            style={{ cursor: "pointer" }}
          >
            Cerrar
          </button>
        </div>

        <div className="mt-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre o referencia…"
            className="w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-black/10"
          />
        </div>

        <div className="mt-4">
          {err && <p className="text-sm text-red-600">{err}</p>}
          {loading && <p className="text-sm text-gray-500">Buscando…</p>}

          {!loading && results.length === 0 && debounced && !err && (
            <p className="text-sm text-gray-500">Sin resultados.</p>
          )}

          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {results
              .filter((i) => i.price_usd > 0)
              .map((item) => (
                <button
                  key={item.id}
                  onClick={() => onPick(item)}
                  className="flex items-center gap-3 rounded-xl border p-3 text-left hover:bg-black/5"
                  style={{ cursor: "pointer" }}
                >
                  <img
                    src={imageUrl(item.id, 0)}
                    alt={item.name}
                    className="h-14 w-14 rounded-lg object-cover"
                    loading="lazy"
                    onError={(e) => {
                      const img = e.currentTarget as HTMLImageElement;
                      const currentExt = img.src.split(".").pop();
                      const idx = IMAGE_EXTENSIONS.indexOf(currentExt || "");
                      const next = IMAGE_EXTENSIONS[idx + 1];
                      if (next) img.src = imageUrl(item.id, idx + 1);
                      else {
                        img.onerror = null;
                        img.src = "/placeholder.png";
                      }
                    }}
                  />
                  <div className="min-w-0">
                    <div className="truncate font-medium">{item.name}</div>
                    <div className="text-sm text-gray-600">
                      ${item.price_usd.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      Ref: {item.id}
                    </div>
                  </div>
                </button>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
