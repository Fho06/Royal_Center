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
     ============================================================
     - Any 401 is treated as "user must authenticate"
     - Redirects to login
     - Preserves current path so user can resume flow
     - Throws to stop downstream logic
     ============================================================ */

  if (res.status === 401) {
    if (typeof window !== "undefined") {
      const next = encodeURIComponent(window.location.pathname);
      window.location.href = `/login?next=${next}`;
    }
    throw new Error("Unauthorized");
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || "API request failed");
  }

  return data;
}
