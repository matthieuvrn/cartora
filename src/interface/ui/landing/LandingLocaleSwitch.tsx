"use client";

import { Fragment } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { trackLandingEvent } from "@/interface/ui/landing/trackLandingEvent";
import { cn } from "@/lib/utils";

const LOCALES = [
  { value: "fr", href: "/", label: "FR" },
  { value: "en", href: "/en", label: "EN" },
] as const;

/**
 * Sélecteur de langue de la landing statique — deux LIENS (`/` fr, `/en` en) en registre mono,
 * même vocabulaire que la barre FR · EN du footer : pas de menu déroulant.
 *
 * Remplace le `LocaleSwitcher` partagé (globe + Radix DropdownMenu) dans le header landing
 * (passe landing 2026-09-06) : le dropdown tirait ~26 KB gz de Radix/floating-ui dans le bundle
 * initial de « / » (≈ 10 % de la mesure `perf:landing`) pour deux entrées, et son portail
 * s'ouvrait en thème CLAIR au-dessus de la scène nuit du hero. Le `LocaleSwitcher` partagé reste
 * tel quel pour les pages légales et le dashboard.
 *
 * Cookie : posé DIRECTEMENT côté client (même cookie fonctionnel `locale` que `setLocaleAction`,
 * sans httpOnly — `LandingLocaleSync` l'écrit déjà ainsi). La landing est statique, aucune
 * revalidation serveur n'a de sens ; signup, login et l'app relisent le cookie à chaque requête.
 * Le clic navigue par le Link ; l'événement `locale_switched` part avant (sendBeacon survit à la
 * navigation). Un clic sur la langue courante ne fait rien de plus que le Link (`/` ou `/en`).
 *
 * Placement (passe 2026-09) : dans la barre du header à partir de `lg` seulement ; sous `lg` il
 * vit dans la carte menu mobile (`LandingHeader`), toujours avec les deux langues. Cibles
 * `min-h-11` partout (44 px tiennent dans la barre de 56/64 px comme dans la carte) ; aucune
 * utility `focus-visible:ring-*` — les règles globales font le focus (cf. docblock du header).
 */
export function LandingLocaleSwitch({ className }: { className?: string }) {
  const locale = useLocale();
  const t = useTranslations("Landing.header");

  return (
    <nav
      aria-label={t("localeNavLabel")}
      className={cn("flex items-center font-mono text-caption tracking-wide", className)}
    >
      {LOCALES.map(({ value, href, label }, i) => {
        const active = locale === value;
        return (
          <Fragment key={value}>
            {i > 0 && (
              <span aria-hidden="true" className="px-1 text-foreground/35">
                ·
              </span>
            )}
            <Link
              href={href}
              lang={value}
              hrefLang={value}
              aria-current={active ? "page" : undefined}
              onClick={() => {
                if (active) return;
                trackLandingEvent({
                  event: "locale_switched",
                  locale,
                  metadata: { from: locale, to: value },
                });
                document.cookie = `locale=${value}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
              }}
              className={cn(
                "inline-flex min-h-11 items-center rounded-sm px-1 transition-colors",
                active ? "text-foreground" : "text-foreground/70 hover:text-foreground",
              )}
            >
              {label}
            </Link>
          </Fragment>
        );
      })}
    </nav>
  );
}
