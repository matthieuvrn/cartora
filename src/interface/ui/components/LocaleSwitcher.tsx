"use client";

import { useLocale } from "next-intl";
import { useTransition } from "react";
import { setLocaleAction } from "@/app/actions";
import { Button } from "@/components/ui/button";

export function LocaleSwitcher() {
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();

  const toggle = () => {
    const next = locale === "fr" ? "en" : "fr";
    startTransition(() => {
      setLocaleAction(next);
    });
  };

  return (
    <Button variant="ghost" size="sm" onClick={toggle} disabled={isPending}>
      {locale === "fr" ? "EN" : "FR"}
    </Button>
  );
}
