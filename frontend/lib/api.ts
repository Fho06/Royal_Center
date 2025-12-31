const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

export async function apiRequest(
  endpoint: string,
  options: RequestInit = {}
) {
  const token =
    typeof window !== "undefined"
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

  /* ============================================================
     AUTH FAILURE HANDLING (401)
     ============================================================ */
  if (res.status === 401) {
    if (typeof window !== "undefined") {
      const next = encodeURIComponent(window.location.pathname);
      window.location.href = `/login?next=${next}`;
    }
    throw new Error("Unauthorized");
  }

  /* ============================================================
     SAFE RESPONSE PARSING
     - Supports JSON, empty bodies, 204 No Content
     ============================================================ */
  let data: any = {};

  const contentType = res.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    try {
      data = await res.json();
    } catch {
      data = {};
    }
  }

  if (!res.ok) {
    throw new Error(data?.error || "API request failed");
  }

  return data;
}
