import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { Category } from "../types";

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    apiRequest("/categories")
      .then(data =>
        setCategories(Array.isArray(data.categories) ? data.categories : [])
      )
      .catch(() => setCategories([]));
  }, []);

  return categories;
}
