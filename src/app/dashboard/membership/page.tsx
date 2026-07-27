"use client";

import { QRCodeSVG } from "qrcode.react";
import { Download } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getInitials } from "@/lib/utils";
import { toast } from "sonner";

export default function MembershipCardPage() {
  const { user } = useAuthStore();
  if (!user) return null;

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold">Digital Membership Card</h1>

      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0a0a0a] via-[#0f1f17] to-[#1a0a0a] p-6 text-white shadow-2xl">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-black via-yellow-400 to-red-600" />
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-600 via-yellow-400 to-red-600 text-[10px] font-black">
              PYU
            </div>
            <span className="text-xs font-semibold">Patriotic Youths of Uganda</span>
          </div>
          <Badge
            variant={user.membershipStatus === "active" ? "success" : "warning"}
            className="text-[10px] uppercase"
          >
            {user.membershipStatus || "Pending"}
          </Badge>
        </div>
        <div className="flex items-center gap-4 mb-6">
          {user.photoURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.photoURL} alt="" className="h-16 w-16 rounded-xl object-cover border-2 border-white/20" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 font-bold text-lg border-2 border-white/20">
              {getInitials(user.fullName)}
            </div>
          )}
          <div>
            <p className="font-bold text-lg">{user.fullName}</p>
            <p className="text-xs text-white/60">{user.district || "Uganda"} District</p>
            <p className="text-xs font-mono text-emerald-400 mt-1">
              {user.membershipNumber || "Not assigned"}
            </p>
          </div>
        </div>
        {user.membershipNumber && (
          <div className="flex justify-center bg-white rounded-xl p-3">
            <QRCodeSVG value={`PYU-MEMBER:${user.membershipNumber}`} size={140} level="H" />
          </div>
        )}
        <p className="mt-3 text-[10px] text-white/40 text-center">
          Official Digital Membership Card · Scan to verify
        </p>
      </div>

      <Button
        className="w-full"
        onClick={() => toast.success("PDF download started", { description: "Membership card PDF would generate here via jsPDF." })}
      >
        <Download className="h-4 w-4" /> Download PDF Card
      </Button>
    </div>
  );
}
