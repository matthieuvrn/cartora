"use client";

import { useLocale, useTranslations } from "next-intl";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { LandingSection } from "@/interface/ui/landing/LandingSection";
import { FAQ_ITEMS } from "@/interface/ui/landing/faqItems";
import { trackLandingEvent } from "@/interface/ui/landing/trackLandingEvent";

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
        <h2 className="text-h1 md:text-h2">{t("title")}</h2>
      </header>
      <Accordion
        type="single"
        collapsible
        onValueChange={handleValueChange}
        className="mx-auto max-w-2xl"
      >
        {FAQ_ITEMS.map((key) => (
          <AccordionItem key={key} value={key} className="data-[state=open]:border-sapin-500">
            <AccordionTrigger className="font-display text-h3 hover:text-canard-700">
              {t(`items.${key}.q`)}
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-6 text-body leading-relaxed text-sand-700">
              {t(`items.${key}.a`)}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </LandingSection>
  );
}
