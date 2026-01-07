function getApiBaseUrl() {
  // Client → relative
  if (typeof window !== "undefined") {
    return "";
  }

  // Server → absolute
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  // Local dev fallback
  return "http://localhost:3000";
}

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

  const res = await fetch(
    `${getApiBaseUrl()}/api${endpoint}`,
    {
      ...options,
      headers,
      cache: "no-store",
    }
  );

  if (res.status === 401) {
    if (typeof window !== "undefined") {
      const next = encodeURIComponent(window.location.pathname);
      window.location.href = `/login?next=${next}`;
    }
    throw new Error("Unauthorized");
  }

  let data: any = {};
  const contentType = res.headers.get("content-type");

  if (contentType?.includes("application/json")) {
    try {
      data = await res.json();
    } catch {
      data = {};
    }
  }

  if (!res.ok) {
    throw new Error(
      data?.error || `${res.status} ${res.statusText}`
    );
  }

  return data;
}
