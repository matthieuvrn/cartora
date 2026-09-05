"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useHydrated } from "@/hooks/use-hydrated";
import { useConsent } from "./ConsentContext";
import { COOKIE_BANNER_HEIGHT_VAR } from "./cookieBannerOffset";

/**
 * Bandeau de consentement CNIL. Rendu UNIQUEMENT après hydratation (`useHydrated`) : le HTML
 * serveur est vide dans TOUS les modes de rendu (statique, dynamique, dev Turbopack) et le
 * premier rendu client aussi → aucune divergence d'hydratation possible, ni par le timing,
 * ni par l'état du cookie, ni par une extension anti-bandeau qui retirerait le nœud.
 *
 * PAS de `useSearchParams` ici : sur la landing statique, il suspendait la boundary côté
 * client en dev (Turbopack, next 16.2.12) sans jamais se résoudre — la boundary restait
 * déshydratée et la première mise à jour du store consentement (cookie déjà posé) forçait
 * React à jeter le HTML serveur → « Hydration failed » récupérable à chaque chargement.
 * On lit `location.search` après montage : même service (?noBanner=1 pour les captures),
 * zéro dépendance au router, et plus besoin de <Suspense> chez les consommateurs.
 *
 * Tant qu'elle est visible, la bannière publie sa hauteur dans `--cookie-banner-h` sur <html>
 * (cf. cookieBannerOffset.ts) : les overlays `fixed bottom-*` (sélecteur de designs de la
 * démo) et les footers (liens FR/EN, « Gérer mes cookies ») s'en décalent au lieu d'être
 * recouverts — focus clavier masqué sinon, WCAG 2.4.11 (recette 2026-09-04). Retirée au
 * démontage : sans bannière, la variable n'existe pas et `var(--cookie-banner-h, 0px)` vaut 0.
 */
export function CookieBanner() {
  const { status, accept, refuse } = useConsent();
  const t = useTranslations("Consent");
  const hydrated = useHydrated();
  const ref = useRef<HTMLDivElement>(null);

  // Escape hatch captures/e2e : ?noBanner=1 masque la bannière sans toucher au consentement.
  // Lu via location (client-only — sous le garde hydrated), volontairement non réactif aux
  // navigations : la bannière est un état de session, pas une vue routée.
  const visible =
    hydrated &&
    status === "pending" &&
    new URLSearchParams(window.location.search).get("noBanner") !== "1";

  useEffect(() => {
    const el = ref.current;
    if (!visible || !el) return;
    const root = document.documentElement;
    const publish = () => root.style.setProperty(COOKIE_BANNER_HEIGHT_VAR, `${el.offsetHeight}px`);
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(el);
    return () => {
      observer.disconnect();
      root.style.removeProperty(COOKIE_BANNER_HEIGHT_VAR);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      ref={ref}
      className="fixed inset-x-0 bottom-0 z-50 border-t bg-background p-4 shadow-lg sm:p-6"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1 text-sm">
          <p className="font-medium">{t("bannerTitle")}</p>
          <p className="text-muted-foreground">
            {t.rich("bannerDescription", {
              privacyLink: (chunks) => (
                <Link href="/confidentialite" className="underline underline-offset-4">
                  {chunks}
                </Link>
              ),
            })}
          </p>
        </div>
        <div className="flex shrink-0 gap-3">
          <Button variant="outline" size="sm" onClick={refuse} className="flex-1 sm:flex-none">
            {t("refuse")}
          </Button>
          <Button size="sm" onClick={accept} className="flex-1 sm:flex-none">
            {t("accept")}
          </Button>
        </div>
      </div>
    </div>
  );
}
