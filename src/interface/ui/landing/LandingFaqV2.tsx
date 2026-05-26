"use client";

import { useLocale, useTranslations } from "next-intl";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { LandingSection } from "@/interface/ui/landing/LandingSection";
import { trackLandingEvent } from "@/interface/ui/landing/trackLandingEvent";

export type FaqItemKey =
  | "noCc"
  | "commitment"
  | "qrAgeingClients"
  | "allergens"
  | "bilingual"
  | "dataHosting"
  | "cancel"
  | "supportFr"
  | "multiRestaurants"
  | "qrPrinting";

export const FAQ_ITEMS: readonly FaqItemKey[] = [
  "noCc",
  "commitment",
  "qrAgeingClients",
  "allergens",
  "bilingual",
  "dataHosting",
  "cancel",
  "supportFr",
  "multiRestaurants",
  "qrPrinting",
] as const;

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

  return (
    <LandingSection id="faq">
      <header className="mx-auto mb-12 max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight">{t("title")}</h2>
      </header>
      <Accordion
        type="single"
        collapsible
        onValueChange={handleValueChange}
        className="mx-auto max-w-3xl"
      >
        {FAQ_ITEMS.map((key) => (
          <AccordionItem key={key} value={key}>
            <AccordionTrigger className="text-left">{t(`items.${key}.q`)}</AccordionTrigger>
            <AccordionContent>{t(`items.${key}.a`)}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </LandingSection>
  );
}
