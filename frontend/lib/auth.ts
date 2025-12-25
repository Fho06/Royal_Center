import jwt from "jsonwebtoken";

export type AuthUser = {
  userId: number;
  role: "user" | "admin";
};

export function requireAuth(req: Request): AuthUser {
  const auth = req.headers.get("authorization");
  if (!auth) throw new Error("UNAUTHORIZED");

  const token = auth.replace("Bearer ", "");
  const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

  if (!decoded?.userId) throw new Error("UNAUTHORIZED");
  return { userId: decoded.userId, role: decoded.role ?? "user" };
}

export function requireAdmin(req: Request): AuthUser {
  const u = requireAuth(req);
  if (u.role !== "admin") throw new Error("FORBIDDEN");
  return u;
}

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
