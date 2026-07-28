"use client";

import { useState } from "react";
import { CheckCircle2, Search, ShieldAlert, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type VerifyResult = {
  found: boolean;
  valid: boolean;
  status?: string;
  message?: string;
  member?: {
    fullName: string;
    email?: string;
    phone?: string;
    membershipNumber?: string;
    membershipStatus?: string;
    district?: string;
    role?: string;
    photoURL?: string;
    lastLoginAt?: string;
  };
};

export default function SuperAdminVerifyPage() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);

  const verify = async () => {
    if (!q.trim()) {
      toast.error("Enter a membership number, email, or scanned QR text");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(
        `/api/membership/verify?q=${encodeURIComponent(q.trim())}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verify failed");
      setResult(data);
      if (data.valid) toast.success("Membership verified");
      else if (data.found) toast.message("Found — not fully active");
      else toast.error("Not found");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Verify failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <UserCheck className="h-6 w-6 text-red-600" />
          Verify membership card
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Enter the membership number from the digital card, member email, or paste
          QR text (<code className="text-xs bg-muted px-1 rounded">PYU-MEMBER:…</code>).
        </p>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card p-6 space-y-4">
        <Input
          label="Membership number / email / QR payload"
          placeholder="PYU-2024-100001 or member@email.com"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void verify();
          }}
        />
        <Button
          className="w-full bg-red-600 hover:bg-red-500"
          loading={loading}
          onClick={() => void verify()}
        >
          <Search className="h-4 w-4" /> Verify membership
        </Button>
      </div>

      {result && (
        <div
          className={`rounded-2xl border p-6 space-y-3 ${
            result.valid
              ? "border-emerald-500/40 bg-emerald-500/10"
              : result.found
                ? "border-amber-500/40 bg-amber-500/10"
                : "border-red-500/40 bg-red-500/10"
          }`}
        >
          <div className="flex items-center gap-2">
            {result.valid ? (
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            ) : (
              <ShieldAlert className="h-6 w-6 text-amber-600" />
            )}
            <div>
              <p className="font-bold">
                {result.valid
                  ? "VALID MEMBERSHIP"
                  : result.found
                    ? "FOUND — NOT ACTIVE"
                    : "NOT FOUND"}
              </p>
              <p className="text-sm text-muted-foreground">{result.message}</p>
            </div>
          </div>

          {result.member && (
            <div className="rounded-xl bg-background/80 border border-border/50 p-4 space-y-2 text-sm">
              <p className="font-semibold text-lg">{result.member.fullName}</p>
              <p className="text-muted-foreground">{result.member.email}</p>
              {result.member.phone && <p>{result.member.phone}</p>}
              <div className="flex flex-wrap gap-2 pt-1">
                <Badge variant="outline">
                  {result.member.membershipNumber || "No number"}
                </Badge>
                <Badge
                  className={
                    result.valid ? "bg-emerald-600 text-white" : "bg-amber-500 text-black"
                  }
                >
                  {result.member.membershipStatus}
                </Badge>
                <Badge variant="secondary">{result.member.role}</Badge>
              </div>
              {result.member.district && (
                <p className="text-xs text-muted-foreground">
                  District: {result.member.district}
                </p>
              )}
              {result.member.lastLoginAt && (
                <p className="text-xs text-muted-foreground">
                  Last login: {new Date(result.member.lastLoginAt).toLocaleString()}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
