"use client";

import { useLocale, useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { LandingSection } from "@/interface/ui/landing/LandingSection";
import { FAQ_ITEMS } from "@/interface/ui/landing/faqItems";
import { trackLandingEvent } from "@/interface/ui/landing/trackLandingEvent";

/**
 * FAQ éditoriale 2 colonnes (DA 2026) : colonne gauche sticky (kicker + titre display +
 * issue de secours contact), accordéon à droite en hairlines — plus de « mur » monotone
 * centré. Le chevron shadcn par défaut est masqué au profit d'une pastille « + » qui pivote
 * à 45° (registre système, pas de hover:underline hérité).
 */
export function LandingFaqV2() {
  const t = useTranslations("Landing.faq");
  const locale = useLocale();

  const handleValueChange = (value: string) => {
    if (!value) return;
    trackLandingEvent({
      event: "faq_opened",
      locale,
      metadata: { question: value },
    });
  };

  // Issue de secours (mailto) : dans la colonne sticky dès lg, mais APRÈS les questions sous lg —
  // proposer le contact avant même d'avoir lu la FAQ inversait l'ordre de lecture mobile.
  const contact = (
    <p className="text-body text-sand-700">
      {t("contactLabel")}{" "}
      <a
        href="mailto:contact@cartora.app"
        className="font-mono text-body-sm text-canard-700 underline-offset-4 hover:text-canard-900 hover:underline"
      >
        contact@cartora.app
      </a>
    </p>
  );

  return (
    <LandingSection id="faq">
      <div className="grid gap-12 lg:grid-cols-12">
        <header className="self-start lg:sticky lg:top-24 lg:col-span-5">
          <span aria-hidden="true" className="eyebrow-thread" />
          <p className="eyebrow">
            <span className="eyebrow-dot" aria-hidden="true" />
            {t("kicker")}
          </p>
          <h2 className="mt-5 text-display-lg">{t("title")}</h2>
          <p className="mt-5 max-w-[28rem] text-lead text-sand-700">{t("subtitle")}</p>
          <div className="mt-8 hidden lg:block">{contact}</div>
        </header>

        <Accordion
          type="single"
          collapsible
          onValueChange={handleValueChange}
          className="lg:col-span-7"
        >
          {FAQ_ITEMS.map((key) => (
            <AccordionItem key={key} value={key} className="border-sand-200">
              <AccordionTrigger className="group items-center py-5 font-display text-h3 text-canard-950 hover:no-underline hover:text-canard-800 [&>svg]:hidden">
                {t(`items.${key}.q`)}
                {/* Pastille +/× : remplace le chevron par défaut (masqué ci-dessus). */}
                <span
                  aria-hidden="true"
                  className="flex size-8 shrink-0 items-center justify-center rounded-full border border-sand-200 text-sand-500 transition-transform duration-200 ease-[var(--ease-snappy)] group-hover:border-canard-300 group-data-[state=open]:rotate-45"
                >
                  <Plus className="size-4 stroke-[1.75]" />
                </span>
              </AccordionTrigger>
              <AccordionContent className="max-w-prose pt-1 pb-6 text-body leading-relaxed text-sand-700">
                {t(`items.${key}.a`)}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        <div className="-mt-4 lg:hidden">{contact}</div>
      </div>
    </LandingSection>
  );
}
