"use client";

import { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Download,
  Printer,
  ShieldCheck,
  MapPin,
  Mail,
  Phone,
  Sparkles,
} from "lucide-react";
import { BrandLogo } from "@/components/shared/brand-logo";
import { Button } from "@/components/ui/button";
import { getInitials, cn } from "@/lib/utils";
import { toast } from "sonner";
import type { User } from "@/types";

type Props = {
  user: User;
  className?: string;
  /** Show download / print controls */
  showActions?: boolean;
};

/**
 * Modern digital membership ID — screen + one-page print/PDF.
 */
export function DigitalMembershipCard({
  user,
  className,
  showActions = true,
}: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const status = (user.membershipStatus || "pending").toLowerCase();
  const active = status === "active" || status === "approved";
  const memberNo = user.membershipNumber || "PENDING";
  const qrValue = user.membershipNumber
    ? `PYU-MEMBER:${user.membershipNumber}`
    : `PYU-USER:${user.id}`;

  const handlePrint = () => {
    const html = document.documentElement;
    const prev = html.style.colorScheme;
    html.style.colorScheme = "light";
    const restore = () => {
      html.style.colorScheme = prev;
      window.removeEventListener("afterprint", restore);
    };
    window.addEventListener("afterprint", restore);
    window.print();
    window.setTimeout(restore, 2000);
  };

  const handleDownloadPdf = async () => {
    if (!cardRef.current) return;
    try {
      toast.message("Preparing card PDF…");
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");
      const node = cardRef.current;
      const canvas = await html2canvas(node, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#0a0a0a",
        logging: false,
      });
      const img = canvas.toDataURL("image/png");
      // Credit-card-ish landscape PDF page
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: [85.6, 53.98],
      });
      pdf.addImage(img, "PNG", 0, 0, 85.6, 53.98);
      pdf.save(`PYU-membership-${memberNo.replace(/\s/g, "")}.pdf`);
      toast.success("Membership card PDF downloaded");
    } catch (e) {
      console.error(e);
      toast.error("Could not generate PDF — try Print instead");
    }
  };

  return (
    <div className={cn("membership-card-page space-y-5", className)}>
      {showActions && (
        <div className="no-print flex flex-wrap gap-2 justify-end">
          <Button type="button" variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4" />
            Print
          </Button>
          <Button
            type="button"
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-500 text-white"
            onClick={() => void handleDownloadPdf()}
          >
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
        </div>
      )}

      {/* Capture target for PDF */}
      <div ref={cardRef} className="membership-card-capture mx-auto w-full max-w-xl">
        <article
          className={cn(
            "membership-id relative overflow-hidden rounded-[1.35rem]",
            "bg-[#070b09] text-white shadow-2xl shadow-emerald-950/40",
            "ring-1 ring-white/10"
          )}
        >
          {/* Ambient glows */}
          <div
            className="pointer-events-none absolute -top-20 -right-16 h-56 w-56 rounded-full bg-emerald-500/25 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-24 -left-10 h-52 w-52 rounded-full bg-red-600/20 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute top-1/2 left-1/3 h-32 w-32 -translate-y-1/2 rounded-full bg-yellow-400/10 blur-2xl"
            aria-hidden
          />

          {/* Flag stripe */}
          <div className="flag-stripe relative z-10 h-1.5 w-full" aria-hidden />

          <div className="relative z-10 p-5 sm:p-6">
            {/* Top bar */}
            <div className="flex items-start justify-between gap-3 mb-5">
              <div className="flex items-center gap-2.5 min-w-0">
                <BrandLogo
                  size="sm"
                  showText={false}
                  variant="crest"
                  className="!bg-white/5 ring-1 ring-white/15 shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/55">
                    Official member ID
                  </p>
                  <p className="text-sm font-black tracking-tight truncate">
                    Patriotic Youths of Uganda
                  </p>
                </div>
              </div>
              <div
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border",
                  active
                    ? "bg-emerald-500/20 border-emerald-400/40 text-emerald-300"
                    : "bg-amber-500/15 border-amber-400/30 text-amber-200"
                )}
              >
                {status.replace("_", " ")}
              </div>
            </div>

            {/* Identity row */}
            <div className="flex gap-4 sm:gap-5">
              <div className="relative shrink-0">
                {user.photoURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.photoURL}
                    alt=""
                    className="h-[4.75rem] w-[4.75rem] sm:h-24 sm:w-24 rounded-2xl object-cover ring-2 ring-white/20 shadow-lg"
                  />
                ) : (
                  <div className="flex h-[4.75rem] w-[4.75rem] sm:h-24 sm:w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600/40 to-zinc-800 text-xl font-black text-emerald-200 ring-2 ring-white/15">
                    {getInitials(user.fullName)}
                  </div>
                )}
                <span className="absolute -bottom-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-black text-white shadow-md ring-2 ring-[#070b09]">
                  <ShieldCheck className="h-3.5 w-3.5" />
                </span>
              </div>

              <div className="min-w-0 flex-1 space-y-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45">
                    Member name
                  </p>
                  <h2 className="text-lg sm:text-xl font-black tracking-tight leading-tight">
                    {user.fullName}
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1.5 text-[11px] text-white/70">
                  <p className="flex items-center gap-1.5 truncate">
                    <MapPin className="h-3 w-3 text-emerald-400 shrink-0" />
                    {user.district || "Uganda"} District
                  </p>
                  <p className="flex items-center gap-1.5 truncate capitalize">
                    <Sparkles className="h-3 w-3 text-yellow-400 shrink-0" />
                    {user.role?.replace(/_/g, " ") || "member"}
                  </p>
                  {user.email && (
                    <p className="flex items-center gap-1.5 truncate sm:col-span-2">
                      <Mail className="h-3 w-3 text-emerald-400 shrink-0" />
                      {user.email}
                    </p>
                  )}
                  {user.phone && (
                    <p className="flex items-center gap-1.5 truncate">
                      <Phone className="h-3 w-3 text-emerald-400 shrink-0" />
                      {user.phone}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Number + QR */}
            <div className="mt-5 flex flex-col sm:flex-row items-stretch sm:items-center gap-4 rounded-2xl bg-white/[0.06] border border-white/10 p-3.5 sm:p-4 backdrop-blur-sm">
              <div className="flex-1 min-w-0 space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/50">
                  Membership number
                </p>
                <p className="font-mono text-base sm:text-lg font-black tracking-wide text-emerald-300 break-all">
                  {memberNo}
                </p>
                <p className="text-[10px] text-white/40 leading-relaxed">
                  Present this card or QR for verification at PYU events and chapters.
                </p>
              </div>
              <div className="mx-auto sm:mx-0 shrink-0 rounded-xl bg-white p-2 shadow-inner">
                <QRCodeSVG
                  value={qrValue}
                  size={96}
                  level="H"
                  bgColor="#ffffff"
                  fgColor="#0a0a0a"
                  includeMargin={false}
                />
              </div>
            </div>

            {/* Footer meta */}
            <div className="mt-4 flex flex-wrap items-end justify-between gap-2 text-[9px] text-white/40">
              <div>
                <p className="font-semibold text-white/55">Unity · Service · Leadership · Development</p>
                <p>Scan QR · PYU digital verification</p>
              </div>
              <p className="font-mono">ID · {user.id.slice(0, 8).toUpperCase()}</p>
            </div>
          </div>

          <div className="flag-stripe relative z-10 h-1 w-full" aria-hidden />
        </article>
      </div>
    </div>
  );
}
