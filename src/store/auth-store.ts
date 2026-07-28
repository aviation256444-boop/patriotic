"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types";
import * as authService from "@/lib/firebase/auth";

/** Persist every login into data/users.json so Super Admin always sees accounts */
async function syncUserToServer(user: User): Promise<User> {
  try {
    const res = await fetch("/api/auth/ensure", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        photoURL: user.photoURL,
        role: user.role,
        membershipStatus: user.membershipStatus,
      }),
      cache: "no-store",
    });
    if (!res.ok) return user;
    const data = await res.json();
    if (data.user) {
      if (typeof window !== "undefined") {
        localStorage.setItem("pyu_user", JSON.stringify(data.user));
      }
      return data.user as User;
    }
  } catch {
    /* keep session user */
  }
  return user;
}

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
          const synced = await syncUserToServer(user);
          set({ user: synced, loading: false });
          return synced;
        } catch (e) {
          set({ loading: false });
          throw e;
        }
      },
      register: async (email, password, fullName) => {
        set({ loading: true });
        try {
          const user = await authService.signUpWithEmail(email, password, fullName);
          const synced = await syncUserToServer(user);
          set({ user: synced, loading: false });
          return synced;
        } catch (e) {
          set({ loading: false });
          throw e;
        }
      },
      loginWithGoogle: async () => {
        set({ loading: true });
        try {
          const user = await authService.signInWithGoogle();
          const synced = await syncUserToServer(user);
          set({ user: synced, loading: false });
          return synced;
        } catch (e) {
          set({ loading: false });
          throw e;
        }
      },
      loginWithFacebook: async () => {
        set({ loading: true });
        try {
          const user = await authService.signInWithFacebook();
          const synced = await syncUserToServer(user);
          set({ user: synced, loading: false });
          return synced;
        } catch (e) {
          set({ loading: false });
          throw e;
        }
      },
      loginWithApple: async () => {
        set({ loading: true });
        try {
          const user = await authService.signInWithApple();
          const synced = await syncUserToServer(user);
          set({ user: synced, loading: false });
          return synced;
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
          // Re-bind session into server DB (survives forgotten accounts)
          if (current.email) {
            const synced = await syncUserToServer(current);
            set({ user: synced });
          }
          const q = current.id
            ? `userId=${encodeURIComponent(current.id)}`
            : `email=${encodeURIComponent(current.email)}`;
          const res = await fetch(`/api/auth/me?${q}`, { cache: "no-store" });
          if (!res.ok) return get().user;
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
