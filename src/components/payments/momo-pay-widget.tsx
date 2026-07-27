"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  getMomoApiUserId,
  getMomoCurrency,
  getMomoEnv,
  isMomoEnabled,
} from "@/lib/momo/config";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export type MomoInvoiceDetail = {
  invoiceId?: string;
  externalId?: string;
  referenceId?: string;
  paymentReference?: string;
  amount?: number;
  currency?: string;
  status?: string;
  expiryDateTime?: string;
};

type Props = {
  amount: number;
  externalId: string;
  currency?: string;
  className?: string;
  onCreated?: (detail: MomoInvoiceDetail) => void;
  onSuccess?: (detail: MomoInvoiceDetail) => void;
  onFailed?: (detail?: MomoInvoiceDetail) => void;
  onCanceled?: (detail?: MomoInvoiceDetail) => void;
  disabled?: boolean;
};

/**
 * Official MTN MoMo QR Collection Widget.
 * Docs attributes: data-api-user-id, data-amount, data-currency, data-external-id
 * Class: mobile-money-qr-payment
 */
export function MomoPayWidget({
  amount,
  externalId,
  currency,
  className,
  onCreated,
  onSuccess,
  onFailed,
  onCanceled,
  disabled,
}: Props) {
  const reactId = useId().replace(/:/g, "");
  const elementId = `momo-qr-${reactId}`;
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const env = getMomoEnv();
  const apiUserId = getMomoApiUserId();
  const cur = currency || getMomoCurrency();

  // Sandbox widget responds by amount bands if amount is small; real donations are large → SUCCESSFUL
  const widgetAmount = useMemo(() => {
    if (!amount || amount <= 0) return "0";
    // Keep integer UGX for clarity
    return String(Math.round(amount));
  }, [amount]);

  useEffect(() => {
    if (!isMomoEnabled() || disabled || !externalId || amount < 1) return;

    const onCreatedEv = (e: Event) => {
      const detail = (e as CustomEvent).detail as MomoInvoiceDetail;
      onCreated?.(detail);
    };
    const onSuccessEv = (e: Event) => {
      const detail = (e as CustomEvent).detail as MomoInvoiceDetail;
      onSuccess?.(detail);
    };
    const onFailedEv = (e: Event) => {
      const detail = (e as CustomEvent).detail as MomoInvoiceDetail | undefined;
      onFailed?.(detail);
      toast.error("MoMo payment failed", {
        description: "Please try again or use Request to Pay with your phone number.",
      });
    };
    const onCanceledEv = (e: Event) => {
      const detail = (e as CustomEvent).detail as MomoInvoiceDetail | undefined;
      onCanceled?.(detail);
    };

    window.addEventListener("mobile-money-qr-payment-created", onCreatedEv);
    window.addEventListener("mobile-money-qr-payment-successful", onSuccessEv);
    window.addEventListener("mobile-money-qr-payment-failed", onFailedEv);
    window.addEventListener("mobile-money-qr-payment-canceled", onCanceledEv);

    // Re-init after attributes / DOM mount
    const t = window.setTimeout(() => {
      try {
        window.mobileMoneyReinitializeWidgets?.();
        setReady(true);
      } catch {
        setReady(false);
      }
    }, 300);

    return () => {
      window.clearTimeout(t);
      window.removeEventListener("mobile-money-qr-payment-created", onCreatedEv);
      window.removeEventListener("mobile-money-qr-payment-successful", onSuccessEv);
      window.removeEventListener("mobile-money-qr-payment-failed", onFailedEv);
      window.removeEventListener("mobile-money-qr-payment-canceled", onCanceledEv);
    };
  }, [amount, externalId, cur, disabled, onCreated, onSuccess, onFailed, onCanceled]);

  // When amount / externalId changes, update DOM attributes and reinit
  useEffect(() => {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.setAttribute("data-amount", widgetAmount);
    el.setAttribute("data-external-id", externalId);
    el.setAttribute("data-currency", cur);
    el.setAttribute("data-api-user-id", apiUserId);
    try {
      window.mobileMoneyReinitializeWidgets?.();
    } catch {
      // ignore
    }
  }, [widgetAmount, externalId, cur, apiUserId, elementId]);

  if (!isMomoEnabled()) {
    return (
      <p className="text-sm text-muted-foreground">
        MTN MoMo payments are disabled. Set NEXT_PUBLIC_MOMO_ENABLED=true.
      </p>
    );
  }

  if (disabled || amount < 1 || !externalId) {
    return (
      <p className="text-sm text-muted-foreground">
        Enter a valid amount to enable MTN MoMo Pay.
      </p>
    );
  }

  return (
    <div className={cn("space-y-3", className)} ref={containerRef}>
      <div className="rounded-2xl border border-[#FFCC00]/40 bg-gradient-to-br from-[#FFCC00]/15 via-background to-[#004F71]/10 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#004F71] dark:text-[#FFCC00]">
              MTN MoMo Pay
            </p>
            <p className="font-semibold mt-1">
              Pay {cur} {Number(widgetAmount).toLocaleString()} with Mobile Money
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Click the MoMo button / scan QR · You approve the charge on your phone
            </p>
            {env === "sandbox" && (
              <p className="text-[10px] text-amber-600 mt-2">
                Sandbox mode — use your MoMo developer test credentials for live charging tests.
              </p>
            )}
          </div>

          {/* Official widget mount point */}
          <div
            id={elementId}
            key={`${elementId}-${widgetAmount}-${externalId}`}
            className="mobile-money-qr-payment min-h-[45px] min-w-[36px] flex items-center justify-center"
            data-api-user-id={apiUserId}
            data-amount={widgetAmount}
            data-currency={cur}
            data-external-id={externalId}
          />
        </div>
        {!ready && (
          <p className="text-[10px] text-muted-foreground mt-3">
            Loading MoMo widget… If it does not appear, check your network or API User ID.
          </p>
        )}
      </div>
    </div>
  );
}
