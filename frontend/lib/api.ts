const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

/**
 * Centralized API request helper
 * - Works in local dev and production
 * - Uses same-origin Next.js API routes by default
 * - Automatically attaches auth token if present
 */
export async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const makeRequest = async () => {
    const token = typeof window !== "undefined"
      ? localStorage.getItem("token")
      : null;

    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    };

    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "API request failed");
    }

    return res.json();
  };

  try {
    return await makeRequest();
  } catch (err: any) {
    // 🔁 retry once after short delay
    if (err.message === "Unauthorized") {
      await new Promise(r => setTimeout(r, 300));
      return makeRequest();
    }
    throw err;
  }
}

