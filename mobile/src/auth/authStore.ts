import { create } from "zustand";
import * as SecureStore from "expo-secure-store";

type User = {
  id: number;
  email: string;
  role: "user" | "admin";
};

type AuthState = {
  token: string | null;
  user: User | null;
  hydrated: boolean;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  hydrated: false,

  login: async (token, user) => {
    await SecureStore.setItemAsync("jwt", token);
    await SecureStore.setItemAsync("user", JSON.stringify(user));
    set({ token, user });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync("jwt");
    await SecureStore.deleteItemAsync("user");
    set({ token: null, user: null });
  },

  hydrate: async () => {
    const token = await SecureStore.getItemAsync("jwt");
    const userStr = await SecureStore.getItemAsync("user");
    const user = userStr ? JSON.parse(userStr) : null;

    set((state) => {
      if (
        state.hydrated &&
        state.token === token &&
        JSON.stringify(state.user) === JSON.stringify(user)
      ) {
        return state;
      }
      return { token, user, hydrated: true };
    });
  },
}));
