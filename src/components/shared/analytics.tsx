"use client";

import Script from "next/script";

/**
 * Optional analytics — only loads when NEXT_PUBLIC_GA_MEASUREMENT_ID
 * or NEXT_PUBLIC_PLAUSIBLE_DOMAIN is set. Safe no-op otherwise.
 */
export function Analytics() {
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();
  const plausible = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN?.trim();

  if (!gaId && !plausible) return null;

  return (
    <>
      {gaId ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
            strategy="afterInteractive"
          />
          <Script id="ga-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${gaId}', { anonymize_ip: true });
            `}
          </Script>
        </>
      ) : null}
      {plausible ? (
        <Script
          defer
          data-domain={plausible}
          src="https://plausible.io/js/script.js"
          strategy="afterInteractive"
        />
      ) : null}
    </>
  );
}
