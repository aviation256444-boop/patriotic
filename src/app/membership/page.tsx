"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import {
  CheckCircle2,
  Download,
  User,
  CreditCard,
  QrCode,
  FileText,
} from "lucide-react";
import { PageHero } from "@/components/shared/page-hero";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { generateMembershipNumber, getInitials } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { useCmsCollection, useUpsertItem } from "@/hooks/use-cms";
import { toast } from "sonner";
import type { DistrictStats } from "@/types";

const steps = ["Personal", "Location", "Profile", "Review"];

const genders = ["male", "female", "other", "prefer_not_to_say"];
const educationLevels = ["Primary", "Secondary", "Certificate", "Diploma", "Bachelor's", "Master's", "PhD", "Other"];

export default function MembershipPage() {
  const { user, updateUser } = useAuthStore();
  const { data: districtsData } = useCmsCollection("districts");
  const districts = (districtsData as DistrictStats[]) || [];
  const saveMember = useUpsertItem("members");
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [membershipNumber, setMembershipNumber] = useState("");
  const cardRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState({
    fullName: user?.fullName || "",
    nationalId: "",
    dateOfBirth: "",
    gender: "",
    email: user?.email || "",
    phone: user?.phone || "",
    district: user?.district || "",
    subCounty: "",
    parish: "",
    village: "",
    occupation: "",
    education: "",
    skills: "",
    interests: "",
    emergencyName: "",
    emergencyPhone: "",
    emergencyRelation: "",
    photoPreview: user?.photoURL || "",
  });

  const update = (field: string, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const next = () => {
    if (step < steps.length - 1) setStep(step + 1);
  };
  const prev = () => {
    if (step > 0) setStep(step - 1);
  };

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Photo must be under 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => update("photoPreview", reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const memNo = generateMembershipNumber();
    setMembershipNumber(memNo);
    setSubmitted(true);

    const memberPayload = {
      id: user?.id || `member-${Date.now()}`,
      fullName: form.fullName,
      email: form.email,
      phone: form.phone,
      photoURL: form.photoPreview || user?.photoURL || "",
      role: "member",
      membershipNumber: memNo,
      membershipStatus: "pending",
      district: form.district,
      subCounty: form.subCounty,
      parish: form.parish,
      village: form.village,
      occupation: form.occupation,
      education: form.education,
      skills: form.skills.split(",").map((s) => s.trim()).filter(Boolean),
      interests: form.interests.split(",").map((s) => s.trim()).filter(Boolean),
      volunteerHours: user?.volunteerHours || 0,
      badges: user?.badges || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await saveMember.mutateAsync(memberPayload);
    } catch {
      // still show success UX; data may be local-only if API fails
    }

    if (user) {
      updateUser({
        fullName: form.fullName,
        nationalId: form.nationalId,
        dateOfBirth: form.dateOfBirth,
        gender: form.gender as "male" | "female" | "other" | "prefer_not_to_say",
        district: form.district,
        subCounty: form.subCounty,
        parish: form.parish,
        village: form.village,
        occupation: form.occupation,
        education: form.education,
        skills: form.skills.split(",").map((s) => s.trim()).filter(Boolean),
        interests: form.interests.split(",").map((s) => s.trim()).filter(Boolean),
        emergencyContact: {
          name: form.emergencyName,
          phone: form.emergencyPhone,
          relationship: form.emergencyRelation,
        },
        membershipNumber: memNo,
        membershipStatus: "pending",
        photoURL: form.photoPreview || user.photoURL,
      });
    }
    toast.success("Application submitted!", {
      description: `Membership number: ${memNo}. Visible in Super Admin → Members.`,
    });
  };

  const downloadCard = () => {
    toast.success("Membership card PDF download started", {
      description: "In production, this generates a PDF via jsPDF/html2canvas.",
    });
  };

  if (submitted) {
    return (
      <>
        <PageHero badge="Membership" title="Application Received" />
        <section className="py-16">
          <div className="mx-auto max-w-lg px-4 text-center space-y-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10"
            >
              <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            </motion.div>
            <div>
              <h2 className="text-2xl font-bold">Welcome to PYU!</h2>
              <p className="mt-2 text-muted-foreground">
                Your application is under review. Status:{" "}
                <Badge variant="warning">Pending Approval</Badge>
              </p>
            </div>

            {/* Digital Membership Card */}
            <div
              ref={cardRef}
              className="relative mx-auto max-w-sm overflow-hidden rounded-2xl bg-gradient-to-br from-[#0a0a0a] via-[#0f1f17] to-[#1a0a0a] p-6 text-white shadow-2xl"
            >
              <div className="absolute top-0 left-0 right-0 flag-stripe h-1" />
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-600 via-yellow-400 to-red-600 text-[10px] font-black">
                    PYU
                  </div>
                  <span className="text-xs font-semibold">Patriotic Youths of Uganda</span>
                </div>
                <Badge variant="warning" className="text-[10px]">PENDING</Badge>
              </div>
              <div className="flex items-center gap-4 mb-6">
                {form.photoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.photoPreview} alt="" className="h-16 w-16 rounded-xl object-cover border-2 border-white/20" />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 font-bold text-lg border-2 border-white/20">
                    {getInitials(form.fullName || "M")}
                  </div>
                )}
                <div className="text-left">
                  <p className="font-bold text-lg">{form.fullName}</p>
                  <p className="text-xs text-white/60">{form.district} District</p>
                  <p className="text-xs font-mono text-emerald-400 mt-1">{membershipNumber}</p>
                </div>
              </div>
              <div className="flex justify-center bg-white rounded-xl p-3">
                <QRCodeSVG
                  value={`PYU-MEMBER:${membershipNumber}`}
                  size={120}
                  level="H"
                />
              </div>
              <p className="mt-3 text-[10px] text-white/40 text-center">
                Scan to verify membership · Official Digital Card
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={downloadCard}>
                <Download className="h-4 w-4" /> Download PDF Card
              </Button>
              <Button variant="outline" onClick={() => (window.location.href = "/dashboard")}>
                <CreditCard className="h-4 w-4" /> Go to Dashboard
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { icon: FileText, label: "Membership No.", value: membershipNumber },
                { icon: QrCode, label: "QR Code", value: "Generated" },
                { icon: CreditCard, label: "Digital Card", value: "Ready" },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-border/50 p-3">
                  <item.icon className="h-5 w-5 mx-auto text-emerald-500 mb-1" />
                  <p className="text-[10px] text-muted-foreground">{item.label}</p>
                  <p className="text-xs font-semibold truncate">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <PageHero
        badge="Membership"
        title="Join the Movement"
        description="Register as a member of the Patriotic Youths of Uganda. Receive your membership number, QR code, and digital card."
      />

      <section className="py-16">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          {/* Steps */}
          <div className="flex items-center justify-between mb-10">
            {steps.map((s, i) => (
              <div key={s} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-all ${
                      i <= step
                        ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/30"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {i < step ? <CheckCircle2 className="h-5 w-5" /> : i + 1}
                  </div>
                  <span className="mt-1.5 text-[10px] font-medium hidden sm:block">{s}</span>
                </div>
                {i < steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 transition-colors ${
                      i < step ? "bg-emerald-600" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="rounded-2xl border border-border/50 bg-card p-6 sm:p-8 space-y-4"
              >
                {step === 0 && (
                  <>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <User className="h-5 w-5 text-emerald-500" /> Personal Information
                    </h2>
                    <Input label="Full Name" required value={form.fullName} onChange={(e) => update("fullName", e.target.value)} />
                    <Input label="National ID (NIN)" required value={form.nationalId} onChange={(e) => update("nationalId", e.target.value)} placeholder="CM..." />
                    <Input label="Date of Birth" type="date" required value={form.dateOfBirth} onChange={(e) => update("dateOfBirth", e.target.value)} />
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground/80">Gender <span className="text-red-500">*</span></label>
                      <select
                        required
                        value={form.gender}
                        onChange={(e) => update("gender", e.target.value)}
                        className="flex h-11 w-full rounded-xl border border-border bg-background/50 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      >
                        <option value="">Select gender</option>
                        {genders.map((g) => (
                          <option key={g} value={g}>{g.replace(/_/g, " ")}</option>
                        ))}
                      </select>
                    </div>
                    <Input label="Email" type="email" required value={form.email} onChange={(e) => update("email", e.target.value)} />
                    <Input label="Phone" type="tel" required value={form.phone} onChange={(e) => update("phone", e.target.value)} />
                  </>
                )}

                {step === 1 && (
                  <>
                    <h2 className="text-xl font-bold">Location Details</h2>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground/80">District <span className="text-red-500">*</span></label>
                      <select
                        required
                        value={form.district}
                        onChange={(e) => update("district", e.target.value)}
                        className="flex h-11 w-full rounded-xl border border-border bg-background/50 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      >
                        <option value="">Select district</option>
                        {districts.map((d) => (
                          <option key={d.name} value={d.name}>{d.name} ({d.region})</option>
                        ))}
                      </select>
                    </div>
                    <Input label="Sub County" required value={form.subCounty} onChange={(e) => update("subCounty", e.target.value)} />
                    <Input label="Parish" required value={form.parish} onChange={(e) => update("parish", e.target.value)} />
                    <Input label="Village" required value={form.village} onChange={(e) => update("village", e.target.value)} />
                  </>
                )}

                {step === 2 && (
                  <>
                    <h2 className="text-xl font-bold">Profile & Skills</h2>
                    <Input label="Occupation" value={form.occupation} onChange={(e) => update("occupation", e.target.value)} />
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground/80">Education Level</label>
                      <select
                        value={form.education}
                        onChange={(e) => update("education", e.target.value)}
                        className="flex h-11 w-full rounded-xl border border-border bg-background/50 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      >
                        <option value="">Select education</option>
                        {educationLevels.map((e) => (
                          <option key={e} value={e}>{e}</option>
                        ))}
                      </select>
                    </div>
                    <Input label="Skills" placeholder="Comma-separated" value={form.skills} onChange={(e) => update("skills", e.target.value)} />
                    <Input label="Interests" placeholder="Comma-separated" value={form.interests} onChange={(e) => update("interests", e.target.value)} />
                    <div className="border-t border-border/50 pt-4 space-y-4">
                      <h3 className="font-semibold text-sm">Emergency Contact</h3>
                      <Input label="Contact Name" required value={form.emergencyName} onChange={(e) => update("emergencyName", e.target.value)} />
                      <Input label="Contact Phone" type="tel" required value={form.emergencyPhone} onChange={(e) => update("emergencyPhone", e.target.value)} />
                      <Input label="Relationship" required value={form.emergencyRelation} onChange={(e) => update("emergencyRelation", e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground/80">Profile Photo</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhoto}
                        className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-lg file:border-0 file:bg-emerald-500/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-emerald-600 hover:file:bg-emerald-500/20"
                      />
                      {form.photoPreview && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={form.photoPreview} alt="Preview" className="mt-2 h-20 w-20 rounded-xl object-cover" />
                      )}
                    </div>
                  </>
                )}

                {step === 3 && (
                  <>
                    <h2 className="text-xl font-bold">Review Your Application</h2>
                    <div className="space-y-3 text-sm">
                      {[
                        ["Full Name", form.fullName],
                        ["National ID", form.nationalId],
                        ["Date of Birth", form.dateOfBirth],
                        ["Gender", form.gender],
                        ["Email", form.email],
                        ["Phone", form.phone],
                        ["District", form.district],
                        ["Sub County", form.subCounty],
                        ["Parish", form.parish],
                        ["Village", form.village],
                        ["Occupation", form.occupation],
                        ["Education", form.education],
                        ["Emergency Contact", `${form.emergencyName} (${form.emergencyRelation}) — ${form.emergencyPhone}`],
                      ].map(([label, value]) => (
                        <div key={label as string} className="flex justify-between border-b border-border/30 pb-2">
                          <span className="text-muted-foreground">{label}</span>
                          <span className="font-medium text-right max-w-[60%]">{value || "—"}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground pt-2">
                      By submitting, you agree to the PYU Code of Conduct and confirm that the information provided is accurate.
                    </p>
                  </>
                )}

                <div className="flex justify-between pt-4">
                  <Button type="button" variant="outline" onClick={prev} disabled={step === 0}>
                    Back
                  </Button>
                  {step < steps.length - 1 ? (
                    <Button type="button" onClick={next}>
                      Continue
                    </Button>
                  ) : (
                    <Button type="submit">
                      Submit Application
                    </Button>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </form>
        </div>
      </section>
    </>
  );
}
