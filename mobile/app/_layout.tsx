import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useRef } from "react";
import { AuthProvider } from "../src/auth/authProvider";
import { useAuthStore } from "../src/auth/authStore";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthGate />
      </AuthProvider>
    </QueryClientProvider>
  );
}


function AuthGate() {
  const router = useRouter();
  const segments = useSegments();

  // IMPORTANT: subscribe to fields separately
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s.hydrated);

  // prevent redirect spam during initial mount / fast refresh
  const didRedirect = useRef(false);

  useEffect(() => {
    if (!hydrated) return;

    const inAuthGroup =
      segments.length > 0 && (segments[0] === "login" || segments[0] === "register");

    // If not logged in, force auth screens
    if (!token && !inAuthGroup) {
      if (!didRedirect.current) {
        didRedirect.current = true;
        router.replace("/login");
      }
      return;
    }

    // If logged in, keep them out of auth screens
    if (token && inAuthGroup) {
      if (!didRedirect.current) {
        didRedirect.current = true;
        router.replace("/(tabs)");
      }
      return;
    }

    // If we're in the right place, allow future redirects if state changes
    didRedirect.current = false;
  }, [hydrated, token, segments]);

  if (!hydrated) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="modal" options={{ presentation: "modal" }} />
    </Stack>
  );
}
