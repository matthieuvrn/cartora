"use client";

import { useCallback, type ReactNode } from "react";
import { useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import { trackLandingEvent } from "@/interface/ui/landing/trackLandingEvent";

interface DemoDesignLinkProps {
  href: string;
  /** Code minuscule du design (valeur `?design=` et metadata du beacon). */
  design: string;
  /** 1-based, rendu « 01 ». */
  index: number;
  /** `PublicMenu.templateNames.<CODE>`, résolu par le PARENT serveur. */
  label: string;
  /** Design des deux captures (CLASSIC) : plus clair que le repos + hairline canard. */
  shown?: boolean;
  /** sr-only du parent (opensInNewTab, designShown). */
  children?: ReactNode;
}

/**
 * Lien deep-link d'un design de la démo (`/m/demo-cartora?design=<code>`, rendu dans le bon
 * skin dès le SSR), tracké `demo_link_click { surface: "tabs", design }`. Ce sont des LIENS vers
 * une autre page, pas des onglets APG (un `tablist` impliquerait un panneau qui change en place).
 * Libellés rendus par le PARENT serveur (`PublicMenu.templateNames` n'est pas embarqué côté
 * client — un `useTranslations` ici planterait en MISSING_MESSAGE sans que CI le voie) ; les
 * classes vivent ICI pour que le payload RSC transporte 9 booléens, pas 9 chaînes.
 * Hiérarchie nuit : repos sand-400, survol sand-50 ; design affiché canard-300 + hairline canard
 * (canard = structure ; marqueur non chromatique en plus de la teinte). `rounded-sm` : l'anneau
 * focus nuit (box-shadow) suit un petit rayon, comme LandingLocaleSwitch.
 */
export function DemoDesignLink({
  href,
  design,
  index,
  label,
  shown = false,
  children,
}: DemoDesignLinkProps) {
  const locale = useLocale();
  const onClick = useCallback(() => {
    trackLandingEvent({ event: "demo_link_click", locale, metadata: { surface: "tabs", design } });
  }, [locale, design]);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      data-design={design}
      onClick={onClick}
      className={cn(
        "group/tab inline-flex min-h-11 items-center gap-1.5 rounded-sm py-1 transition-colors md:min-h-0",
        shown ? "text-canard-300" : "text-sand-400 hover:text-sand-50",
      )}
    >
      <span
        className={cn(
          "tabular-nums",
          shown ? "text-canard-300/70" : "text-sand-500 group-hover/tab:text-sand-300",
        )}
      >
        {String(index).padStart(2, "0")}
      </span>
      <span
        className={cn(
          "border-b",
          shown ? "border-canard-300" : "border-transparent group-hover/tab:border-current",
        )}
      >
        {label}
      </span>
      {children}
    </a>
  );
}
