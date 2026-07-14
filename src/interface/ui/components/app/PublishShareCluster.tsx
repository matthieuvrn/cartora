"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

const menuPath = (slug: string) => `/m/${slug}`;

/** URL absolue destinée au presse-papier. Fallback sur l'origine courante si l'env public manque. */
function absoluteMenuUrl(slug: string): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}${menuPath(slug)}`;
}

/**
 * Actions de partage du menu en ligne (le moment métier de Cartora) : « Copier le lien » +
 * « Voir ». Pas d'URL brute affichée — le domaine est du bruit (constant, `localhost` en dev)
 * et un troncage couperait justement le slug ; l'adresse complète vit sur la page Partage.
 * Deux formes : complète (barre desktop, boutons libellés) et `compact` (topbar mobile, icônes).
 * La copie passe par `navigator.clipboard` et confirme par un toast.
 */
export function PublishShareCluster({ slug, compact = false }: { slug: string; compact?: boolean }) {
  const t = useTranslations("Dashboard");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(absoluteMenuUrl(slug));
      toast.success(t("linkCopied"));
    } catch {
      toast.error(t("copyLinkError"));
    }
  };

  if (compact) {
    return (
      <div className="flex items-center">
        <Button variant="ghost" size="icon-sm" onClick={copy} aria-label={t("copyLink")}>
          <Copy />
        </Button>
        <Button asChild variant="ghost" size="icon-sm" aria-label={t("viewMyMenu")}>
          <a href={menuPath(slug)} target="_blank" rel="noopener noreferrer">
            <ExternalLink />
          </a>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={copy}>
        <Copy />
        {t("copyLink")}
      </Button>
      <Button asChild variant="outline" size="sm">
        <a href={menuPath(slug)} target="_blank" rel="noopener noreferrer">
          <ExternalLink />
          {t("viewMyMenu")}
        </a>
      </Button>
    </div>
  );
}
