"use client";

import { useEffect } from "react";

/**
 * Registers the service worker only in production.
 * In development it unregisters any existing SW and clears caches so
 * Next.js chunks never get stuck (ChunkLoadError / double /_next paths).
 */
export function PWARegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const isDev = process.env.NODE_ENV === "development";

    if (isDev) {
      // Kill stale service workers from previous sessions
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => r.unregister());
      });
      if ("caches" in window) {
        caches.keys().then((keys) => {
          keys.forEach((k) => caches.delete(k));
        });
      }
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Registration failed — non-fatal
    });
  }, []);

  return null;
}
