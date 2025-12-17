export function getToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return localStorage.getItem("token");
}

export function saveToken(token: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem("token", token);
}

export function logout() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("token");
}

export function isLoggedIn(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return !!localStorage.getItem("token");
}
