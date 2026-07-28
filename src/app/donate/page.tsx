"use client";

import { useState } from "react";
import {
  Heart,
  Users,
  TreePine,
  GraduationCap,
} from "lucide-react";
import { PageHero } from "@/components/shared/page-hero";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PaymentCheckout } from "@/components/payments/payment-checkout";
import { cn } from "@/lib/utils";

const amounts = [10000, 25000, 50000, 100000, 250000, 500000];
const campaigns = [
  { id: "general", name: "General Fund", icon: Heart, desc: "Support all programs" },
  { id: "education", name: "Scholarships", icon: GraduationCap, desc: "Fund youth education" },
  { id: "climate", name: "Green Uganda", icon: TreePine, desc: "Tree planting & climate" },
  { id: "skills", name: "Skills Training", icon: Users, desc: "ICT & entrepreneurship" },
];

export default function DonatePage() {
  const [amount, setAmount] = useState(50000);
  const [custom, setCustom] = useState("");
  const [campaign, setCampaign] = useState("general");
  const [anonymous, setAnonymous] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [step, setStep] = useState<"form" | "checkout">("form");

  const finalAmount = custom ? parseInt(custom, 10) || 0 : amount;

  return (
    <>
      <PageHero
        badge="Donate · Airtel & MTN via PawaPay"
        title="Fuel the Movement"
        description="Pay from your phone: Airtel Money or MTN MoMo via PawaPay. Enter your number, approve the PIN on your phone — we only leave this page after payment is confirmed."
      />

      <section className="py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-[#ED1C24] text-white">Airtel Money · Recommended</Badge>
            <Badge className="bg-[#FFCC00] text-black">MTN MoMo</Badge>
            <Badge variant="secondary">Powered by PawaPay</Badge>
            <Badge variant="info">Card · Square</Badge>
          </div>

          <div className="rounded-2xl border border-[#ED1C24]/25 bg-[#ED1C24]/5 p-4 text-sm">
            <p className="font-semibold text-[#ED1C24]">Fastest way: Airtel Money</p>
            <p className="text-muted-foreground mt-1">
              After you pick an amount, choose <strong>Airtel Money</strong>, enter your Airtel
              number, and approve the charge with your Airtel Money PIN on that phone.
            </p>
          </div>

          {step === "form" && (
            <div className="space-y-8">
              <div>
                <h2 className="font-bold mb-4">Choose a Cause</h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  {campaigns.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCampaign(c.id)}
                      className={cn(
                        "flex items-start gap-3 rounded-2xl border p-4 text-left transition-all",
                        campaign === c.id
                          ? "border-emerald-500 bg-emerald-500/5 shadow-sm"
                          : "border-border/50 hover:border-emerald-500/30"
                      )}
                    >
                      <c.icon
                        className={cn(
                          "h-5 w-5 mt-0.5",
                          campaign === c.id ? "text-emerald-500" : "text-muted-foreground"
                        )}
                      />
                      <div>
                        <p className="font-semibold text-sm">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="font-bold mb-4">Select Amount (UGX)</h2>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {amounts.map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => {
                        setAmount(a);
                        setCustom("");
                      }}
                      className={cn(
                        "rounded-xl border py-3 text-sm font-semibold transition-all",
                        amount === a && !custom
                          ? "border-emerald-500 bg-emerald-600 text-white"
                          : "border-border/50 hover:border-emerald-500/30"
                      )}
                    >
                      {(a / 1000).toFixed(0)}K
                    </button>
                  ))}
                </div>
                <Input
                  label="Custom Amount"
                  type="number"
                  min={1000}
                  placeholder="Enter amount"
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                  className="mt-4"
                />
              </div>

              <div className="space-y-4">
                <h2 className="font-bold">Your Details</h2>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={anonymous}
                    onChange={(e) => setAnonymous(e.target.checked)}
                    className="rounded border-border"
                  />
                  Donate anonymously
                </label>
                {!anonymous && (
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Input label="Full Name" value={name} onChange={(e) => setName(e.target.value)} />
                    <Input
                      label="Email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Message (optional)</label>
                  <textarea
                    rows={3}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="flex w-full rounded-xl border border-border bg-background/50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none"
                    placeholder="Leave a message of support..."
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-border/50 bg-card p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">You will pay</p>
                  <p className="text-3xl font-bold text-emerald-600">
                    UGX {finalAmount.toLocaleString()}
                  </p>
                </div>
                <Button
                  size="lg"
                  className="w-full sm:w-auto bg-[#ED1C24] hover:bg-[#c41620] text-white"
                  disabled={finalAmount < 1000}
                  onClick={() => {
                    if (finalAmount < 1000) return;
                    setStep("checkout");
                  }}
                >
                  Pay with phone (Airtel / MTN) →
                </Button>
              </div>
            </div>
          )}

          {step === "checkout" && (
            <div className="space-y-4">
              <Button type="button" variant="ghost" size="sm" onClick={() => setStep("form")}>
                ← Back to details
              </Button>
              <PaymentCheckout
                amount={finalAmount}
                currency="UGX"
                purpose="donation"
                campaign={campaign}
                donorName={name}
                email={email}
                message={message}
                isAnonymous={anonymous}
                successRedirect="/donate/success"
                onCancel={() => setStep("form")}
              />
              <p className="text-xs text-center text-muted-foreground">
                Default: Airtel Money via PawaPay — charge hits your phone, enter PIN, then we open
                your receipt.
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
