"use client";

import * as React from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import type { LandingEventName } from "@/domain/analytics/LandingEventNames";

type Variant = "primary" | "secondary" | "ghost";
type Size = "default" | "lg";

interface TrackedCtaButtonProps {
  event: LandingEventName;
  href: string;
  external?: boolean;
  variant?: Variant;
  size?: Size;
  metadata?: Record<string, unknown>;
  className?: string;
  children: React.ReactNode;
}

const baseClasses =
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-all outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50";

const variantClasses: Record<Variant, string> = {
  primary: "bg-primary text-primary-foreground hover:bg-primary/90",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  ghost: "hover:bg-accent hover:text-accent-foreground",
};

const sizeClasses: Record<Size, string> = {
  default: "h-9 px-4 py-2",
  lg: "h-11 px-6 text-base",
};

function fireBeacon(payload: string) {
  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    const blob = new Blob([payload], { type: "application/json" });
    if (navigator.sendBeacon("/api/track", blob)) return;
  }
  void fetch("/api/track", {
    method: "POST",
    body: payload,
    keepalive: true,
    headers: { "Content-Type": "application/json" },
  }).catch(() => {});
}

export function TrackedCtaButton({
  event,
  href,
  external,
  variant = "primary",
  size = "default",
  metadata,
  className,
  children,
}: TrackedCtaButtonProps) {
  const locale = useLocale();

  const handleClick = React.useCallback(() => {
    const payload = JSON.stringify({
      type: "landing",
      event,
      locale: locale === "en" ? "en" : "fr",
      ...(metadata ? { metadata } : {}),
    });
    fireBeacon(payload);
  }, [event, locale, metadata]);

  const classes = cn(baseClasses, variantClasses[variant], sizeClasses[size], className);

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        className={classes}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} onClick={handleClick} className={classes}>
      {children}
    </Link>
  );
}
