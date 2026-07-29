"use client";

import Link from "next/link";
import { Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: React.ElementType;
  actionHref?: string;
  actionLabel?: string;
  className?: string;
};

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  actionHref,
  actionLabel,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-card/40 px-6 py-14 text-center",
        className
      )}
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="text-lg font-bold tracking-tight">{title}</h3>
      {description && (
        <p className="mt-2 max-w-md text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      )}
      {actionHref && actionLabel && (
        <Link href={actionHref} className="mt-6">
          <Button size="sm">{actionLabel}</Button>
        </Link>
      )}
    </div>
  );
}
