"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { LandingLocaleSwitch } from "@/interface/ui/landing/LandingLocaleSwitch";
import { TrackedCtaButton } from "@/interface/ui/landing/TrackedCtaButton";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "#pricing", labelKey: "navTarifs" },
  { href: "#demo", labelKey: "navDemo" },
] as const;

/**
 * Header adaptatif deux mondes (DA « Nuit de service ») : posé sur le hero nuit il porte
 * `section-nuit` (transparent, texte porcelaine, CTA pilule claire — tout suit le remap
 * sémantique) ; dès 80px de scroll il bascule en verre porcelaine (fond clair blurré,
 * hairline, texte encre) pour survoler les sections claires. Un seul état booléen, deux
 * peaux complètes — aucune classe morte entre les deux.
 *
 * `logo` : le lockup est rendu par le PARENT serveur (`LandingPageContent`) et passé en prop —
 * `Logo.tsx` embarque le wordmark Fraunces outliné (~2,4 Ko gz de tracés) et ce header est un
 * composant client : le rendre ici l'aurait ajouté au bundle initial de la landing (mesuré
 * 291 → 298 Ko gz sur le budget `perf:landing`). Côté serveur, ces tracés ne coûtent que du HTML.
 *
 * Langue : `LandingLocaleSwitch` (deux liens mono FR · EN) et non le `LocaleSwitcher` partagé —
 * son DropdownMenu Radix pesait ~26 KB gz sur le bundle initial de la landing (cf. docblock).
 */
export function LandingHeader({ logo }: { logo: React.ReactNode }) {
  const t = useTranslations("Landing.header");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 transition-[background-color,border-color,color] duration-300 ease-out",
        scrolled
          ? "border-b border-sand-200/80 bg-sand-50/85 backdrop-blur-xl"
          : "section-nuit border-b border-transparent bg-transparent",
      )}
    >
      {/* Géométrie < sm (passe landing 2026-09-06) : à 360 px (Galaxy A, très répandu), lockup
          h-5.5 (134 px) + 12 + switcher 36 + 6 + CTA « Créer ma carte » nowrap px-4 (≈ 132 px)
          = 320 px ≤ 328 px de contenu (px-4). Avant : le flex écrasait la pilule et le libellé
          court wrappait quand même sur 2 lignes dans un h-10 (défaut visible dès 390 px). */}
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:gap-4 sm:px-6">
        <Link
          href="/"
          aria-label="Cartora"
          className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          {logo}
        </Link>

        <nav aria-label={t("navLabel")} className="ml-8 hidden items-center gap-7 md:flex">
          {NAV_LINKS.map(({ href, labelKey }) => (
            <Link
              key={href}
              href={href}
              className="group inline-flex min-h-[44px] items-center rounded-sm text-sm font-medium text-foreground/70 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <span className="relative">
                {t(labelKey)}
                <span className="absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 bg-current transition-transform duration-200 ease-[var(--ease-out-expo)] group-hover:scale-x-100" />
              </span>
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <LandingLocaleSwitch className="mr-1" />
          <TrackedCtaButton
            event="cta_header_login"
            href="/login"
            variant="ghost"
            className="hidden sm:inline-flex"
          >
            {t("loginCta")}
          </TrackedCtaButton>
          <TrackedCtaButton
            event="cta_header_signup"
            href="/signup?src=header"
            variant="primary"
            className="shrink-0 px-4 whitespace-nowrap sm:px-5"
          >
            {/* Libellé court < sm (le CTA complet wrappait sur 2 lignes à 390 px) ; `shrink-0` +
                nowrap : la pilule ne se fait plus écraser par le flex — cf. note de géométrie. */}
            <span className="sm:hidden">{t("signupCtaShort")}</span>
            <span className="hidden sm:inline">{t("signupCta")}</span>
          </TrackedCtaButton>
        </div>
      </div>
    </header>
  );
}
