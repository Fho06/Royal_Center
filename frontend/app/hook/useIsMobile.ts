"use client";

import { useEffect, useState } from "react";

/**
 * Matches Tailwind's `sm` breakpoint (640px)
 * true  -> phone
 * false -> tablet / desktop
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 639px)");

    // set initial value
    setIsMobile(media.matches);

    // listen only when breakpoint flips
    const handler = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
    };

    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, []);

  return isMobile;
}
