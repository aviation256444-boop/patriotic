/** Default official PYU WhatsApp community invite */
export const DEFAULT_WHATSAPP_GROUP =
  "https://chat.whatsapp.com/H7GOLHTLRYQ5IPSomBEu52";

export const DEFAULT_WHATSAPP_GROUP_LABEL = "Join Our Official WhatsApp Group";

export const DEFAULT_WHATSAPP_GROUP_DESCRIPTION =
  "Connect with patriots nationwide — get event alerts, opportunities, and real-time updates. Join the official PYU WhatsApp community now.";

export function getWhatsAppGroupUrl(site?: {
  whatsappGroup?: string;
} | null): string {
  return site?.whatsappGroup?.trim() || DEFAULT_WHATSAPP_GROUP;
}
