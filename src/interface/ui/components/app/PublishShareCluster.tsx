"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Copy, ExternalLink } from "lucide-react";
import { absoluteMenuUrl, menuPath } from "@/lib/public-menu-url";
import { Button } from "@/components/ui/button";

/**
 * Actions de partage du menu en ligne (le moment métier de Cartora) : « Copier le lien » +
 * « Voir ». Pas d'URL brute affichée — le domaine est du bruit (constant, `localhost` en dev)
 * et un troncage couperait justement le slug ; l'adresse complète vit sur la page Partage.
 * Deux formes : complète (barre desktop, boutons libellés) et `compact` (topbar mobile, icônes).
 * La copie passe par `navigator.clipboard` et confirme par un toast.
 *
 * `focusToken` : retour du focus après une publication (cf. `PublishControlCompact` / `PublishBar`).
 */
export function PublishShareCluster({
  slug,
  compact = false,
  focusToken,
}: {
  slug: string;
  compact?: boolean;
  /**
   * Jeton à usage unique (incrémenté par le parent après une publication réussie) : à chaque
   * nouvelle valeur, le focus est rendu au premier bouton (« Copier le lien »). Le CTA
   * « Publier » qui portait le focus est démonté par le refresh RSC — sans cela il tombe
   * sur `<body>`. Un booléen persistant revolerait le focus à chaque remontage du cluster.
   */
  focusToken?: number;
}) {
  const t = useTranslations("Dashboard");
  const firstButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!focusToken) return;
    // Le refresh RSC est asynchrone : ne reprendre le focus que s'il a réellement été perdu
    // (l'utilisateur a pu recliquer ailleurs entre-temps) et qu'aucun overlay Radix ne l'a
    // capturé — lui voler le focus casserait son piège.
    const active = document.activeElement;
    if (active && active !== document.body) return;
    if (document.querySelector('[role="dialog"][data-state="open"]')) return;
    firstButtonRef.current?.focus({ preventScroll: true });
  }, [focusToken]);

  const copy = async () => {
    try {
      // Presse-papier = adresse COMPLÈTE (la navigation, elle, reste relative via `menuPath`).
      await navigator.clipboard.writeText(absoluteMenuUrl(slug, window.location.origin));
      toast.success(t("linkCopied"));
    } catch {
      toast.error(t("copyLinkError"));
    }
  };

  if (compact) {
    return (
      <div className="flex items-center">
        <Button
          ref={firstButtonRef}
          variant="ghost"
          size="icon-sm"
          onClick={copy}
          aria-label={t("copyLink")}
        >
          <Copy />
        </Button>
        <Button asChild variant="ghost" size="icon-sm">
          <a href={menuPath(slug)} target="_blank" rel="noopener noreferrer">
            <ExternalLink />
            {/* Nom accessible porté par le texte (pas d'`aria-label`, qui écraserait la
                mention d'ouverture dans un nouvel onglet — WCAG 3.2.5/G201). */}
            <span className="sr-only">
              {t("viewMyMenu")} {t("opensInNewTab")}
            </span>
          </a>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button ref={firstButtonRef} variant="outline" size="sm" onClick={copy}>
        <Copy />
        {t("copyLink")}
      </Button>
      <Button asChild variant="outline" size="sm">
        <a href={menuPath(slug)} target="_blank" rel="noopener noreferrer">
          <ExternalLink />
          {t("viewMyMenu")}
          {/* WCAG 3.2.5/G201 : annoncer l'ouverture dans un nouvel onglet. */}
          <span className="sr-only">{t("opensInNewTab")}</span>
        </a>
      </Button>
    </div>
  );
}
