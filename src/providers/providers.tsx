"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useState, type ReactNode } from "react";
import { Toaster } from "sonner";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // CMS is live-edited: never treat data as fresh for long
            staleTime: 0,
            gcTime: 60_000,
            refetchOnWindowFocus: true,
            refetchOnMount: "always",
            refetchOnReconnect: true,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            className: "font-sans",
            style: {
              borderRadius: "12px",
            },
          }}
          richColors
          closeButton
        />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
