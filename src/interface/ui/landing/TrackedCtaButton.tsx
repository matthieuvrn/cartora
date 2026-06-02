"use client";

import * as React from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import type { LandingEventName } from "@/domain/analytics/LandingEventNames";
import { trackLandingEvent } from "@/interface/ui/landing/trackLandingEvent";

type Variant = "primary" | "secondary" | "ghost" | "outline";
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
  outline: "border border-canard-200 text-canard-700 hover:bg-canard-50",
};

const sizeClasses: Record<Size, string> = {
  default: "h-9 px-4 py-2",
  lg: "h-11 px-6 text-base",
};

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
    trackLandingEvent({ event, locale, metadata });
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
