import { useEffect, useRef } from "react";
import { useAuthStore } from "./authStore";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const hydrate = useAuthStore((s) => s.hydrate);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    hydrate();
  }, []);

  return <>{children}</>;
}
