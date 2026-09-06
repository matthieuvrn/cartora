"use client";

import * as React from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LandingEventName } from "@/domain/analytics/LandingEventNames";
import { trackLandingEvent } from "@/interface/ui/landing/trackLandingEvent";

type Variant = "primary" | "secondary" | "ghost" | "outline";
type Size = "default" | "lg" | "xl";

interface TrackedCtaButtonProps {
  event: LandingEventName;
  href: string;
  external?: boolean;
  variant?: Variant;
  size?: Size;
  /** Flèche → animée au hover (CTA de conversion). */
  arrow?: boolean;
  metadata?: Record<string, unknown>;
  className?: string;
  children: React.ReactNode;
}

/**
 * CTA signature de la landing (DA « Nuit de service ») : pilule, ombre teintée qui
 * s'INTENSIFIE au hover (jamais remplacée par un gris), pressed `active:scale`.
 * `primary` est 100 % sémantique : canard en section claire, porcelaine sur `.section-nuit`
 * (le remap --primary/--cta-shadow de globals.css fait tout le travail — ne pas surcharger
 * les ombres au call-site).
 */
const baseClasses =
  "group inline-flex items-center justify-center gap-2 rounded-full font-medium " +
  "transition-[transform,box-shadow,background-color,border-color,color] duration-200 " +
  "ease-[var(--ease-snappy)] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 " +
  "active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-primary text-primary-foreground shadow-[var(--cta-shadow)] " +
    "hover:shadow-[var(--cta-shadow-hover)] hover:-translate-y-px",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  ghost: "text-foreground/80 hover:bg-accent hover:text-accent-foreground",
  // Hairline sémantique : sand-200 en clair, blanc/9 % sur nuit — s'adapte sans variante.
  outline:
    "border border-foreground/20 text-foreground hover:border-foreground/40 " +
    "hover:bg-foreground/[0.04]",
};

const sizeClasses: Record<Size, string> = {
  default: "h-10 px-5 text-sm",
  lg: "h-12 px-7 text-sm",
  xl: "h-13 px-8 text-base",
};

export function TrackedCtaButton({
  event,
  href,
  external,
  variant = "primary",
  size = "default",
  arrow = false,
  metadata,
  className,
  children,
}: TrackedCtaButtonProps) {
  const locale = useLocale();
  const t = useTranslations("Landing");

  const handleClick = React.useCallback(() => {
    trackLandingEvent({ event, locale, metadata });
  }, [event, locale, metadata]);

  const classes = cn(baseClasses, variantClasses[variant], sizeClasses[size], className);

  const content = (
    <>
      {children}
      {/* Nouvel onglet : jusqu'ici seul le span sr-only l'annonçait — l'œil n'avait aucun signal
          (passe landing 2026-09-06). Le CTA `arrow` garde sa flèche → de conversion. */}
      {external && !arrow && (
        <ArrowUpRight
          aria-hidden="true"
          className="size-4 stroke-[1.75] opacity-80 transition-transform duration-200 ease-[var(--ease-snappy)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
        />
      )}
      {arrow && (
        <span
          aria-hidden="true"
          className="transition-transform duration-200 ease-[var(--ease-snappy)] group-hover:translate-x-0.5"
        >
          →
        </span>
      )}
    </>
  );

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        className={classes}
      >
        {content}
        {/* WCAG 3.2.5/G201 : annoncer l'ouverture dans un nouvel onglet aux lecteurs d'écran. */}
        <span className="sr-only">{t("opensInNewTab")}</span>
      </a>
    );
  }

  return (
    <Link href={href} onClick={handleClick} className={classes}>
      {content}
    </Link>
  );
}
