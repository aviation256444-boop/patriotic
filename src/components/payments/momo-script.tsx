"use client";

import Script from "next/script";
import { getMomoWidgetScriptUrl, isMomoEnabled } from "@/lib/momo/config";

/**
 * Loads the official MTN MoMo Collection Widget script once per app.
 * https://momodeveloper.mtn.com/product#product=momowidget
 */
export function MomoScript() {
  if (!isMomoEnabled()) return null;

  return (
    <Script
      id="mtn-momo-widget"
      src={getMomoWidgetScriptUrl()}
      strategy="afterInteractive"
      onLoad={() => {
        if (typeof window !== "undefined" && window.mobileMoneyReinitializeWidgets) {
          try {
            window.mobileMoneyReinitializeWidgets();
          } catch {
            // ignore
          }
        }
      }}
    />
  );
}
