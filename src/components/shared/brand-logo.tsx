"use client";

import Link from "next/link";
import { useSiteSettings } from "@/hooks/use-cms";
import { mediaUrl } from "@/lib/cms/media-url";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  href?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  className?: string;
  lightText?: boolean;
  /** How the mark sits: circular cutout (default) or soft square */
  variant?: "crest" | "soft";
}

/**
 * Circular crest cutout sizes — logo fills the hole so it feels built into the chrome.
 */
const crestSizes = {
  sm: "h-10 w-10",
  md: "h-11 w-11 sm:h-12 sm:w-12",
  lg: "h-14 w-14",
  xl: "h-[4.5rem] w-[4.5rem]",
};

const textSizes = {
  sm: { title: "text-sm", sub: "text-[10px]" },
  md: { title: "text-[15px] sm:text-base", sub: "text-[11px]" },
  lg: { title: "text-lg", sub: "text-xs" },
  xl: { title: "text-xl", sub: "text-sm" },
};

/**
 * Site logo cut into a native brand mark:
 * - Circular “porthole” that matches the crest shape
 * - Logo scaled to fill the cutout (no floating white plate)
 * - Soft ring + inset shadow so it reads as part of the header chrome
 */
export function BrandLogo({
  href = "/",
  size = "md",
  showText = true,
  className,
  lightText = false,
  variant = "crest",
}: BrandLogoProps) {
  const { data: site, dataUpdatedAt } = useSiteSettings();
  const logo = site?.logoUrl?.trim();
  const orgName = site?.orgName || "Patriotic Youths of Uganda";
  // Short wordmark beside the crest (crest image already carries full name)
  const shortName = "PYU";
  const fullShort = "Patriotic Youths";
  const t = textSizes[size];

  const isCrest = variant === "crest";

  const mark = (
    <div
      className={cn(
        crestSizes[size],
        "relative shrink-0 transition-transform duration-300 group-hover:scale-[1.04]",
        isCrest ? "rounded-full" : "rounded-2xl"
      )}
      aria-hidden={!logo}
    >
      {/* Outer brand ring — thin, like metal bezel around a cutout */}
      <div
        className={cn(
          "absolute inset-0 p-[2px]",
          isCrest ? "rounded-full" : "rounded-2xl",
          "bg-gradient-to-br from-yellow-400 via-emerald-500 to-red-600",
          "shadow-[0_4px_14px_-2px_rgba(0,0,0,0.35),0_0_0_1px_rgba(255,255,255,0.12)_inset]"
        )}
      >
        {/* Inner cutout well */}
        <div
          className={cn(
            "relative h-full w-full overflow-hidden",
            isCrest ? "rounded-full" : "rounded-[0.95rem]",
            // Dark well matches logo grey/black so edges blend
            "bg-gradient-to-b from-zinc-800 via-zinc-900 to-black",
            // Inset = recessed into the UI
            "shadow-[inset_0_2px_6px_rgba(0,0,0,0.55),inset_0_0_0_1px_rgba(255,255,255,0.06)]"
          )}
        >
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={`${logo.slice(0, 48)}-${dataUpdatedAt}`}
              src={mediaUrl(logo, dataUpdatedAt)}
              alt=""
              className={cn(
                "absolute inset-0 h-full w-full",
                // Full logo visible (no heavy crop) — fits inside the circular crest
                "object-contain object-center p-[6%]",
                "contrast-[1.04] saturate-[1.06]"
              )}
              draggable={false}
            />
          ) : (
            <span
              className={cn(
                "absolute inset-0 flex items-center justify-center font-black tracking-tight",
                "bg-gradient-to-br from-yellow-300 via-emerald-400 to-red-500 bg-clip-text text-transparent",
                size === "sm" ? "text-xs" : size === "xl" ? "text-lg" : "text-sm"
              )}
            >
              PYU
            </span>
          )}

          {/* Top light catch — makes the cutout feel 3D / built-in */}
          <div
            className={cn(
              "pointer-events-none absolute inset-0",
              isCrest ? "rounded-full" : "rounded-[0.95rem]",
              "bg-gradient-to-b from-white/15 via-transparent to-black/25"
            )}
          />
        </div>
      </div>

      {/* Soft outer glow that ties into the header */}
      <div
        className={cn(
          "pointer-events-none absolute -inset-1 -z-10 opacity-60 blur-md",
          isCrest ? "rounded-full" : "rounded-2xl",
          "bg-gradient-to-br from-emerald-500/40 via-yellow-400/20 to-red-500/30"
        )}
      />
    </div>
  );

  const text = showText ? (
    <div className="min-w-0 flex flex-col justify-center leading-none">
      <p
        className={cn(
          "font-black tracking-tight",
          t.title,
          lightText
            ? "text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]"
            : "text-foreground"
        )}
      >
        <span className="sm:hidden">{shortName}</span>
        <span className="hidden sm:inline">{fullShort}</span>
      </p>
      <p
        className={cn(
          "mt-0.5 font-semibold tracking-wide uppercase",
          t.sub,
          lightText ? "text-yellow-300/95" : "text-emerald-700 dark:text-emerald-400"
        )}
      >
        of Uganda
      </p>
    </div>
  ) : null;

  const content = (
    <>
      {mark}
      {text}
    </>
  );

  const shellClass = cn(
    "group inline-flex items-center gap-2.5 sm:gap-3",
    // Pill that anchors logo into the header chrome
    "rounded-full py-1 pl-1 pr-2.5 sm:pr-3",
    "bg-black/25 backdrop-blur-md",
    "ring-1 ring-white/10",
    "shadow-[0_2px_12px_rgba(0,0,0,0.2)]",
    "transition-colors duration-300",
    "hover:bg-black/35 hover:ring-white/15",
    "dark:bg-white/5 dark:hover:bg-white/10",
    className
  );

  if (!href) {
    return (
      <div className={shellClass} role="img" aria-label={orgName}>
        {content}
      </div>
    );
  }

  return (
    <Link href={href} className={shellClass} aria-label={`${orgName} Home`}>
      {content}
    </Link>
  );
}
