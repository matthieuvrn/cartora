"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Languages, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PricingModal } from "@/interface/ui/components/PricingModal";

/**
 * État PRO-lock de `/app/traductions` (S4, refonte 2026). Le multilingue est
 * PRO-only et entièrement auto (DeepL) : un FREE/STARTER voit ce pitch d'upsell
 * plutôt qu'un gestionnaire de langues qu'il ne pourrait pas remplir. CTA ouvre
 * la `PricingModal` — pas de langue activable tant que le forfait n'est pas PRO.
 */
export function TranslationUpsell() {
  const t = useTranslations("Translations");
  const [pricingOpen, setPricingOpen] = useState(false);

  return (
    <div className="rounded-xl border border-dashed py-16 text-center">
      <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-canard-50 text-canard-500">
        <Languages className="size-6" strokeWidth={1.75} aria-hidden />
      </span>
      <h2 className="mt-4 text-h3">{t("upsellTitle")}</h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{t("upsellBody")}</p>
      <div className="mt-5 flex justify-center">
        <Button onClick={() => setPricingOpen(true)}>
          <Sparkles className="size-4" aria-hidden />
          {t("upsellCta")}
        </Button>
      </div>
      <PricingModal open={pricingOpen} onOpenChange={setPricingOpen} />
    </div>
  );
}
