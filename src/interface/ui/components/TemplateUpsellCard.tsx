"use client";

import { useId } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { PlanTier } from "@/domain/billing/PlanPolicy";
import { PREMIUM_MENU_TEMPLATES } from "@/domain/menu/MenuTemplateMeta";
import { createCheckoutAction } from "@/app/(app)/app/billing-actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BillingSubmitButton } from "./billing/BillingSubmitButton";
import { Price } from "./billing/PricingTiers";

/** Formules qui voient le bloc : un PRO n'a rien à débloquer (la page ne le rend pas). */
export type TemplateUpsellTier = Exclude<PlanTier, "PRO">;

type Props = { planTier: TemplateUpsellTier };

/**
 * Bloc UNIQUE d'upsell PRO de la page Apparence : remplace (2026-09) les sept boutons
 * « Passer à PRO » posés sur chaque carte verrouillée du `TemplateSelector`.
 *
 * Ordre DOM réel de la section : grille des 9 templates → `ErrorMessage` / message de succès
 * du `TemplateSelector` → ce bloc. Il arrive donc juste après les cartes cadenassées, sans
 * repousser les templates utilisables par un FREE/STARTER.
 *
 * Carte nuit calquée sur la Starter de `PricingTiers` (`section-nuit texture-grain` + `bg-background`
 * + `shadow-frame!`) mais SANS `scale` : pleine largeur, dominance par le padding. Grammaire
 * couleur in-app respectée — AUCUN corail ici (le badge est un contour porcelaine en mono) et le
 * CTA est `variant="default"` (pilule porcelaine via le remap `--primary` de la scène nuit) : le
 * seul climax `cta` d'une page /app reste « Publier » dans la PublishBar. Surface sans overlay
 * porté : ne jamais monter de Dialog/Sheet/Dropdown depuis ce bloc (le contenu porté resterait clair).
 *
 * Le `planTier` n'est ici qu'un proxy d'affichage : la vraie garde est portée côté serveur par
 * `CreateCheckoutSession`, qui refuse un second Checkout à un abonné actif (`use_portal_to_change_plan`)
 * en lisant `planStatus`. Un STARTER est donc envoyé vers `/app/abonnement`, seule surface de
 * décision (prorata annoncé) — et c'est aussi elle qui arbitre les statuts PAST_DUE / résiliation
 * programmée, jamais ce bloc.
 *
 * Le cadenas des cartes (Badge `warning` + `Lock`) est conservé TEL QUEL : existant hors périmètre,
 * pas une validation de sa conformité à la grammaire couleur.
 */
export function TemplateUpsellCard({ planTier }: Props) {
  const t = useTranslations("Settings.template");
  const tPricing = useTranslations("Pricing");
  const titleId = useId();
  const count = PREMIUM_MENU_TEMPLATES.length;

  return (
    <Card
      role="region"
      aria-labelledby={titleId}
      className="section-nuit texture-grain relative z-10 gap-0 overflow-hidden bg-background p-6 text-foreground shadow-frame! lg:p-8"
    >
      {/* Bascule 2 colonnes à `lg` seulement : la zone main du shell (app) ne fait que ~480 px à `md`. */}
      <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="space-y-3">
          <span className="inline-flex w-fit rounded-full border border-white/15 px-2.5 py-0.5 font-mono text-micro tracking-wider text-sand-100 uppercase">
            {t("upsell.badge")}
          </span>
          <h3 id={titleId} className="display text-h3 text-sand-50">
            {t("upsell.title", { count })}
          </h3>
          <p className="max-w-prose text-body-sm text-muted-foreground">{t("upsell.body")}</p>
        </div>
        <div className="flex flex-col gap-3 lg:items-end">
          <div className="flex flex-wrap items-baseline gap-x-1">
            <Price value={tPricing("pro.price")} />
            <span className="text-body-sm text-muted-foreground">{tPricing("pro.period")}</span>
          </div>
          {planTier === "FREE" ? (
            <form action={createCheckoutAction} className="w-full lg:w-auto">
              <input type="hidden" name="tier" value="PRO" />
              <BillingSubmitButton
                label={t("upgradeCta")}
                variant="default"
                className="w-full lg:w-auto"
              />
            </form>
          ) : (
            // Abonné actif (STARTER) : le passage en PRO se fait depuis la page Abonnement
            // (prorata annoncé), jamais un second Checkout.
            <Button asChild variant="default" className="w-full lg:w-auto">
              <Link href="/app/abonnement">{t("upgradeCta")}</Link>
            </Button>
          )}
          <p className="font-mono text-caption text-muted-foreground">
            {planTier === "FREE" ? t("upsell.noteFree") : t("upsell.noteStarter")}
          </p>
        </div>
      </div>
    </Card>
  );
}
