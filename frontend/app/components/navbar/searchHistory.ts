import { SEARCH_HISTORY_KEY, MAX_HISTORY_ITEMS } from "./constants";

export function loadLocalHistory(): string[] {
  try {
    return JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveLocalHistory(items: string[]) {
  localStorage.setItem(
    SEARCH_HISTORY_KEY,
    JSON.stringify(items.slice(0, MAX_HISTORY_ITEMS))
  );
}

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}
