"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ExternalLink, Palette } from "lucide-react";
import type { MenuOverview, MenuTemplate } from "@/domain/menu/MenuTypes";
import { menuPath } from "@/lib/public-menu-url";
import { restaurantLogoUrl } from "@/lib/storage-url";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "./app/PageHeader";
import { publishView } from "./app/PublishStatusBadge";
import { EditableRestaurantName } from "./EditableRestaurantName";
import { LogoMonogram } from "./logo/LogoMonogram";
import { TemplateLogo } from "./menu-template/TemplateLogo";

type Props = {
  restaurantName: string;
  logoPath: string | null;
  template: MenuTemplate;
  status: MenuOverview["status"];
  publishedAt: string | null;
  slug: string;
};

/**
 * En-tête d'identité de l'éditeur — l'« objet » de la page : logo (ou monogramme), nom éditable
 * (SEUL `<h1>` de /app, posé via le slot `headingSlot` de PageHeader), chip mono du template
 * courant vers Apparence, et lien secondaire vers la version en ligne quand elle existe.
 *
 * AUCUN statut ni bouton « Publier » ici : ils vivent dans la barre de publication globale du
 * shell. Aucun « Aperçu » non plus (déjà dans MenuActionBar en desktop et dans la rangée mobile de
 * MenuEditor). Rendu par `app/page.tsx` AVANT `<MenuEditor>` — jamais à l'intérieur de l'éditeur,
 * dont la branche « recherche active » masquerait le h1 de la page.
 *
 * Le lien public est borné à `md:hidden` : en desktop la barre de publication porte déjà « Voir
 * mon menu » / « Voir la version en ligne » ; le seul trou réel est mobile + modifications non
 * publiées, où la barre compacte ne montre que le CTA « Publier ».
 */
export function EditorIdentityHeader({
  restaurantName,
  logoPath,
  template,
  status,
  publishedAt,
  slug,
}: Props) {
  const t = useTranslations("Dashboard");
  const tTemplates = useTranslations("Settings.template.names");

  const logoUrl = logoPath ? restaurantLogoUrl(logoPath) : null;
  const templateName = tTemplates(template);
  const templateLink = t("identity.templateLink", { template: templateName });
  const view = publishView(status, publishedAt);

  return (
    <PageHeader
      className="mb-6 border-b pb-4"
      media={
        logoUrl ? (
          // `alt=""` : le nom est lu juste après dans le h1 — pas de double annonce.
          <TemplateLogo src={logoUrl} alt="" className="size-10" sizes="40px" />
        ) : (
          <LogoMonogram name={restaurantName} className="size-10 text-sm" />
        )
      }
      headingSlot={<EditableRestaurantName currentName={restaurantName} />}
      meta={
        <>
          <Badge
            asChild
            variant="outline"
            className="py-1 font-mono uppercase transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            {/* `aria-label` commence par le nom VISIBLE du template (WCAG 2.5.3 label-in-name). */}
            <Link href="/app/apparence" aria-label={templateLink}>
              <Palette aria-hidden="true" />
              {templateName}
            </Link>
          </Badge>
          {publishedAt !== null && (
            <Button asChild variant="ghost" size="sm" className="md:hidden">
              <a href={menuPath(slug)} target="_blank" rel="noopener noreferrer">
                <ExternalLink aria-hidden="true" />
                {view === "published" ? t("viewMyMenu") : t("viewLiveVersion")}
                {/* WCAG 3.2.5/G201 : annoncer l'ouverture dans un nouvel onglet, comme les
                    autres sorties vers le menu public (barre de publication, cluster de partage). */}
                <span className="sr-only">{t("opensInNewTab")}</span>
              </a>
            </Button>
          )}
        </>
      }
    />
  );
}
