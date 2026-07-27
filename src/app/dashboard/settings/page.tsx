"use client";

import { useState } from "react";
import { useAuthStore } from "@/store/auth-store";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export default function SettingsPage() {
  const { user, updateUser } = useAuthStore();
  const [twoFA, setTwoFA] = useState(user?.twoFactorEnabled ?? false);

  if (!user) return null;

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <div className="rounded-2xl border border-border/50 bg-card p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold">Theme</p>
            <p className="text-sm text-muted-foreground">Toggle light / dark mode</p>
          </div>
          <ThemeToggle />
        </div>

        <div className="flex items-center justify-between border-t border-border/50 pt-6">
          <div>
            <p className="font-semibold">Two-Factor Authentication</p>
            <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
          </div>
          <button
            onClick={() => {
              setTwoFA(!twoFA);
              updateUser({ twoFactorEnabled: !twoFA });
              toast.success(twoFA ? "2FA disabled" : "2FA enabled");
            }}
            className={`relative h-7 w-12 rounded-full transition-colors ${twoFA ? "bg-emerald-600" : "bg-muted"}`}
            aria-label="Toggle 2FA"
          >
            <span
              className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                twoFA ? "translate-x-5" : ""
              }`}
            />
          </button>
        </div>

        <div className="border-t border-border/50 pt-6">
          <p className="font-semibold mb-2">Push Notifications</p>
          <p className="text-sm text-muted-foreground mb-3">
            Receive alerts for events, messages, and updates.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if ("Notification" in window) {
                Notification.requestPermission().then((p) =>
                  toast.success(p === "granted" ? "Notifications enabled" : "Permission denied")
                );
              } else {
                toast.info("Notifications not supported in this browser");
              }
            }}
          >
            Enable Push Notifications
          </Button>
        </div>

        <div className="border-t border-border/50 pt-6">
          <p className="font-semibold text-red-500 mb-2">Danger Zone</p>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => toast.error("Account deletion requires admin approval")}
          >
            Request Account Deletion
          </Button>
        </div>
      </div>
    </div>
  );
}
