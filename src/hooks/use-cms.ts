"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { CmsDatabase, SiteSettings, NationalStats } from "@/lib/cms/types";
import { useAuthStore } from "@/store/auth-store";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Request failed");
  }
  return res.json() as Promise<T>;
}

/** Bust React Query so header/logo/hero update immediately after save */
async function bustCmsCache(qc: ReturnType<typeof useQueryClient>, collection?: string) {
  await qc.invalidateQueries({ queryKey: ["cms"], refetchType: "all" });
  if (collection) {
    await qc.invalidateQueries({ queryKey: ["cms", collection], refetchType: "all" });
  }
  await qc.refetchQueries({ queryKey: ["cms"], type: "all" });
}

const liveQueryOptions = {
  staleTime: 0,
  gcTime: 30_000,
  refetchOnMount: "always" as const,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
};

export function useCmsDb() {
  return useQuery({
    queryKey: ["cms"],
    queryFn: () => fetchJson<CmsDatabase>(`/api/cms?t=${Date.now()}`),
    ...liveQueryOptions,
  });
}

export function useCmsCollection<K extends keyof CmsDatabase>(collection: K) {
  return useQuery({
    queryKey: ["cms", collection],
    queryFn: () =>
      fetchJson<CmsDatabase[K]>(`/api/cms/${collection}?t=${Date.now()}`),
    ...liveQueryOptions,
  });
}

export function useSiteSettings() {
  return useCmsCollection("site");
}

export function useNationalStats() {
  return useCmsCollection("stats");
}

export function useCmsItem(collection: string, id: string | undefined) {
  return useQuery({
    queryKey: ["cms", collection, id],
    queryFn: () =>
      fetchJson<Record<string, unknown>>(
        `/api/cms/${collection}/${id}?t=${Date.now()}`
      ),
    enabled: Boolean(id),
    ...liveQueryOptions,
  });
}

function useActor() {
  const user = useAuthStore((s) => s.user);
  return user?.email || user?.fullName || "admin";
}

export function useUpdateSite() {
  const qc = useQueryClient();
  const actor = useActor();
  return useMutation({
    mutationFn: (data: Partial<SiteSettings>) =>
      fetchJson<SiteSettings>("/api/cms/site", {
        method: "PUT",
        body: JSON.stringify({ data, actor }),
      }),
    onSuccess: async (site) => {
      // Optimistically put site in cache so logo updates without full reload
      qc.setQueryData(["cms", "site"], site);
      await bustCmsCache(qc, "site");
    },
  });
}

export function useUpdateStats() {
  const qc = useQueryClient();
  const actor = useActor();
  return useMutation({
    mutationFn: (data: Partial<NationalStats>) =>
      fetchJson<NationalStats>("/api/cms/stats", {
        method: "PUT",
        body: JSON.stringify({ data, actor }),
      }),
    onSuccess: async () => {
      await bustCmsCache(qc, "stats");
    },
  });
}

export function useUpsertItem(collection: string) {
  const qc = useQueryClient();
  const actor = useActor();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      fetchJson<Record<string, unknown>>(`/api/cms/${collection}`, {
        method: "POST",
        body: JSON.stringify({ data, actor }),
      }),
    onSuccess: async () => {
      await bustCmsCache(qc, collection);
    },
  });
}

export function useDeleteItem(collection: string) {
  const qc = useQueryClient();
  const actor = useActor();
  return useMutation({
    mutationFn: (id: string) =>
      fetchJson<{ success: boolean }>(
        `/api/cms/${collection}/${encodeURIComponent(id)}?actor=${encodeURIComponent(actor)}`,
        { method: "DELETE" }
      ),
    onSuccess: async () => {
      await bustCmsCache(qc, collection);
    },
  });
}

export function useReplaceCollection(collection: string) {
  const qc = useQueryClient();
  const actor = useActor();
  return useMutation({
    mutationFn: (data: unknown[]) =>
      fetchJson(`/api/cms/${collection}`, {
        method: "PUT",
        body: JSON.stringify({ data, actor }),
      }),
    onSuccess: async () => {
      await bustCmsCache(qc, collection);
    },
  });
}

export function useUploadImage() {
  const qc = useQueryClient();
  const actor = useActor();
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("file", file);
      form.append("actor", actor);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: form,
        cache: "no-store",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(err.error || "Upload failed");
      }
      return res.json() as Promise<{
        url: string;
        permanentUrl: string;
        dataUrl?: string;
        filename: string;
        mediaId?: string;
        storage?: string;
      }>;
    },
    onSuccess: async () => {
      await bustCmsCache(qc, "media");
    },
  });
}

export function useCmsReset() {
  const qc = useQueryClient();
  const actor = useActor();
  return useMutation({
    mutationFn: () =>
      fetchJson<CmsDatabase>("/api/cms", {
        method: "POST",
        body: JSON.stringify({ action: "reset", actor }),
      }),
    onSuccess: async () => {
      await bustCmsCache(qc);
    },
  });
}

export function useCmsImport() {
  const qc = useQueryClient();
  const actor = useActor();
  return useMutation({
    mutationFn: (data: unknown) =>
      fetchJson<CmsDatabase>("/api/cms", {
        method: "POST",
        body: JSON.stringify({ action: "import", data, actor }),
      }),
    onSuccess: async () => {
      await bustCmsCache(qc);
    },
  });
}

export function findBySlug<T extends { slug?: string; id?: string }>(
  items: T[] | undefined,
  slug: string
): T | undefined {
  if (!items) return undefined;
  return items.find((i) => i.slug === slug || i.id === slug);
}
