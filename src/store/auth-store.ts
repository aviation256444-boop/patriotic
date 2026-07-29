"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types";
import * as authService from "@/lib/firebase/auth";

/** Persist session into server DB; always return the server's user (includes promoted roles). */
async function syncUserToServer(user: User): Promise<User> {
  try {
    // Do NOT send client role for elevating — server DB is source of truth for super_admin
    const res = await fetch("/api/auth/ensure", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        photoURL: user.photoURL,
        // Only send role for brand-new registration hints; ensure never downgrades
        membershipStatus: user.membershipStatus,
      }),
      cache: "no-store",
    });
    if (!res.ok) return user;
    const data = await res.json();
    if (data.user) {
      // Prefer email lookup next so promotions by email always win
      try {
        const q = data.user.email
          ? `email=${encodeURIComponent(data.user.email)}`
          : data.user.id
            ? `userId=${encodeURIComponent(data.user.id)}`
            : "";
        if (q) {
          const me = await fetch(`/api/auth/me?${q}`, { cache: "no-store" });
          if (me.ok) {
            const meData = await me.json();
            if (meData.user) {
              if (typeof window !== "undefined") {
                localStorage.setItem("pyu_user", JSON.stringify(meData.user));
              }
              return meData.user as User;
            }
          }
        }
      } catch {
        /* fall through */
      }
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

function roleIsSuperAdmin(role: unknown): boolean {
  const r = String(role || "")
    .toLowerCase()
    .trim()
    .replace(/-/g, "_");
  return r === "super_admin" || r === "superadmin";
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
          // Re-bind session; server returns DB role (super_admin after promotion)
          const synced = await syncUserToServer(current);
          set({ user: synced });

          // Prefer email — stable across Firebase uid vs local id
          const email = synced.email || current.email;
          const id = synced.id || current.id;
          const qs = new URLSearchParams();
          if (email) qs.set("email", email);
          if (id) qs.set("userId", id);
          const res = await fetch(`/api/auth/me?${qs.toString()}`, {
            cache: "no-store",
          });
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
        return get().user;
      },
      isAdmin: () => {
        const role = String(get().user?.role || "");
        return (
          role === "admin" ||
          roleIsSuperAdmin(role) ||
          role === "regional_admin" ||
          role === "district_admin"
        );
      },
      isSuperAdmin: () => roleIsSuperAdmin(get().user?.role),
    }),
    {
      name: "pyu-auth",
      partialize: (state) => ({ user: state.user }),
    }
  )
);
