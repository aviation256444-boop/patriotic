export type PaymentGateway = "mtn_momo" | "airtel_money" | "card" | "bank";

export type PaymentPurpose = "donation" | "event" | "membership" | "other";

export interface PaymentInitRequest {
  amount: number;
  currency?: string;
  gateway: PaymentGateway;
  purpose?: PaymentPurpose;
  campaign?: string;
  donorName?: string;
  email?: string;
  phone?: string;
  message?: string;
  isAnonymous?: boolean;
  meta?: Record<string, unknown>;
}

export interface PaymentInitResponse {
  success: boolean;
  paymentId: string;
  externalId: string;
  amount: number;
  currency: string;
  gateway: PaymentGateway;
  status: "pending" | "completed" | "failed";
  /** Demo mode always works without real API keys */
  demoMode: boolean;
  message?: string;
  error?: string;
}

export interface PaymentConfirmRequest {
  paymentId: string;
  externalId: string;
  gateway: PaymentGateway;
  status: "completed" | "failed" | "pending";
  providerRef?: string;
  phone?: string;
  meta?: Record<string, unknown>;
}
