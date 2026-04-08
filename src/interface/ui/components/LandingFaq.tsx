"use client";

import { useTranslations } from "next-intl";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ_KEYS = ["howItWorks", "techSkills", "commitment", "itemsLimit", "watermark"] as const;

export function LandingFaq() {
  const t = useTranslations("Landing.faq");

  return (
    <Accordion type="single" collapsible className="w-full">
      {FAQ_KEYS.map((key) => (
        <AccordionItem key={key} value={key}>
          <AccordionTrigger className="text-base">{t(`${key}.q`)}</AccordionTrigger>
          <AccordionContent className="text-muted-foreground">{t(`${key}.a`)}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
