"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types";
import * as authService from "@/lib/firebase/auth";

interface AuthState {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  login: (email: string, password: string) => Promise<User>;
  register: (email: string, password: string, fullName: string) => Promise<User>;
  loginWithGoogle: () => Promise<User>;
  loginWithFacebook: () => Promise<User>;
  loginWithApple: () => Promise<User>;
  logout: () => Promise<void>;
  updateUser: (data: Partial<User>) => void;
  /** Re-load user from data/users.json so credentials stay current */
  refreshUser: () => Promise<User | null>;
  isAdmin: () => boolean;
  isSuperAdmin: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      loading: false,
      setUser: (user) => set({ user }),
      setLoading: (loading) => set({ loading }),
      login: async (email, password) => {
        set({ loading: true });
        try {
          const user = await authService.signInWithEmail(email, password);
          set({ user, loading: false });
          return user;
        } catch (e) {
          set({ loading: false });
          throw e;
        }
      },
      register: async (email, password, fullName) => {
        set({ loading: true });
        try {
          const user = await authService.signUpWithEmail(email, password, fullName);
          set({ user, loading: false });
          return user;
        } catch (e) {
          set({ loading: false });
          throw e;
        }
      },
      loginWithGoogle: async () => {
        set({ loading: true });
        try {
          const user = await authService.signInWithGoogle();
          set({ user, loading: false });
          return user;
        } catch (e) {
          set({ loading: false });
          throw e;
        }
      },
      loginWithFacebook: async () => {
        set({ loading: true });
        try {
          const user = await authService.signInWithFacebook();
          set({ user, loading: false });
          return user;
        } catch (e) {
          set({ loading: false });
          throw e;
        }
      },
      loginWithApple: async () => {
        set({ loading: true });
        try {
          const user = await authService.signInWithApple();
          set({ user, loading: false });
          return user;
        } catch (e) {
          set({ loading: false });
          throw e;
        }
      },
      logout: async () => {
        await authService.signOut();
        set({ user: null });
      },
      updateUser: (data) => {
        const current = get().user;
        if (current) {
          const updated = { ...current, ...data, updatedAt: new Date().toISOString() };
          set({ user: updated });
          if (typeof window !== "undefined") {
            localStorage.setItem("pyu_user", JSON.stringify(updated));
          }
        }
      },
      refreshUser: async () => {
        const current = get().user;
        if (!current?.id && !current?.email) return null;
        try {
          const q = current.id
            ? `userId=${encodeURIComponent(current.id)}`
            : `email=${encodeURIComponent(current.email)}`;
          const res = await fetch(`/api/auth/me?${q}`, { cache: "no-store" });
          if (!res.ok) return current;
          const data = await res.json();
          if (data.user) {
            set({ user: data.user });
            if (typeof window !== "undefined") {
              localStorage.setItem("pyu_user", JSON.stringify(data.user));
            }
            return data.user as User;
          }
        } catch {
          /* keep session */
        }
        return current;
      },
      isAdmin: () => {
        const role = get().user?.role;
        return role === "admin" || role === "super_admin" || role === "regional_admin" || role === "district_admin";
      },
      isSuperAdmin: () => get().user?.role === "super_admin",
    }),
    {
      name: "pyu-auth",
      partialize: (state) => ({ user: state.user }),
    }
  )
);
