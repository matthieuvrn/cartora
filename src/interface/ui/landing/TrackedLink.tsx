"use client";

import * as React from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import type { LandingEventName } from "@/domain/analytics/LandingEventNames";
import { trackLandingEvent } from "@/interface/ui/landing/trackLandingEvent";

interface TrackedLinkProps {
  event: LandingEventName;
  href: string;
  /** target=_blank + rel + mention sr-only « (s’ouvre dans un nouvel onglet) ». */
  external?: boolean;
  metadata?: Record<string, unknown>;
  className?: string;
  children: React.ReactNode;
}

/**
 * Ancre trackée NON stylée (le pendant « lien » de TrackedCtaButton, qui est une pilule) : pour
 * envelopper un objet — chevalet QR de la clôture — sans en faire un bouton. Aucune classe par
 * défaut : le call-site fournit la mise en page.
 * FOCUS — rien à fournir : l'anneau de marque vient de globals.css dans les deux scènes (règle
 * `@layer base` `:is(.theme-cartora,.theme-app) :focus-visible` en clair, règle non-layered
 * `.section-nuit :focus-visible` en nuit). Ne pas ajouter `outline-none` (la base le pose déjà)
 * ni `focus-visible:ring-*` (une utility remplacerait l'anneau de marque). Ne JAMAIS poser
 * `shadow-*` / `ring-*` sur l'ANCRE : en section claire l'utility battrait la règle base et
 * supprimerait l'anneau (en nuit la règle non-layered gagne encore — le piège n'apparaît qu'à
 * l'adoption sur Démo/Features) ; l'ombre vit sur un span enfant (recette du chevalet QR).
 * Les children sont des ReactNodes rendus par le parent serveur (jamais un import de
 * qrPath/Logo ici) ; ils sont sérialisés dans le payload RSC (flight) en plus du markup — un
 * tracé SVG passé en enfant apparaît donc deux fois dans le HTML (compressé par référence par
 * gzip).
 */
export function TrackedLink({
  event,
  href,
  external,
  metadata,
  className,
  children,
}: TrackedLinkProps) {
  const locale = useLocale();
  const t = useTranslations("Landing");
  const handleClick = React.useCallback(() => {
    trackLandingEvent({ event, locale, metadata });
  }, [event, locale, metadata]);

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        className={className}
      >
        {children}
        {/* WCAG 3.2.5/G201 : annoncer l'ouverture dans un nouvel onglet aux lecteurs d'écran. */}
        <span className="sr-only">{t("opensInNewTab")}</span>
      </a>
    );
  }
  return (
    <Link href={href} onClick={handleClick} className={className}>
      {children}
    </Link>
  );
}
