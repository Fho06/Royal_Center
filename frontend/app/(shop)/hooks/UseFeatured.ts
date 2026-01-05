"use client";

import { useEffect, useState } from "react";
import type { FeaturedMap, FeaturedSlot } from "../components/FeaturedGrid";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export type ActivePick = {
  slot: FeaturedSlot;
  position: 1 | 2 | 3 | 4;
} | null;

export function useFeatured(opts: { hydrated: boolean; location: string }) {
  const { hydrated, location } = opts;

  const [featured, setFeatured] = useState<FeaturedMap>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [activePick, setActivePick] = useState<ActivePick>(null);

  async function loadFeatured() {
    const res = await fetch(
      `/api/featured?location=${encodeURIComponent(location)}&bust=${Date.now()}`,
      { cache: "no-store" }
    );

    if (!res.ok) return;

    const data = await res.json();
    setFeatured(data.featured ?? {});
  }

  useEffect(() => {
    if (!hydrated) return;
    loadFeatured();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, location]);

  async function assignFeatured(
    slot: FeaturedSlot,
    position: number,
    itemId: string
  ) {
    const token = getToken();
    if (!token) return;

    await fetch(`/api/featured/${slot}/${position}`, {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ item_id: itemId }),
    });

    await loadFeatured();
  }

  async function removeFeatured(slot: FeaturedSlot, position: number) {
    const token = getToken();
    if (!token) return;

    await fetch(`/api/featured/${slot}/${position}`, {
      method: "DELETE",
      headers: { authorization: `Bearer ${token}` },
    });

    await loadFeatured();
  }

  return {
    featured,
    modalOpen,
    setModalOpen,
    activePick,
    setActivePick,
    assignFeatured,
    removeFeatured,
  };
}
