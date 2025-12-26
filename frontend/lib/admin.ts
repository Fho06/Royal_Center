import jwt from "jsonwebtoken";

export function requireAdmin(req: Request) {
  const auth = req.headers.get("authorization");
  if (!auth) throw new Error("Unauthorized");

  const token = auth.replace("Bearer ", "");
  const user = jwt.verify(token, process.env.JWT_SECRET!) as {
    userId: number;
    role?: string;
  };

  if (user.role !== "admin") {
    throw new Error("Forbidden");
  }

  return user;
}
