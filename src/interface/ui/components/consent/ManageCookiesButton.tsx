"use client";

import { useTranslations } from "next-intl";
import { useConsent } from "./ConsentContext";
import { cn } from "@/lib/utils";

/** `className` : le footer landing l'aligne sur ses liens (même registre que la colonne Légal). */
export function ManageCookiesButton({ className }: { className?: string }) {
  const { withdraw } = useConsent();
  const t = useTranslations("Consent");

  return (
    <button
      type="button"
      onClick={withdraw}
      className={cn("text-sm text-muted-foreground underline-offset-4 hover:underline", className)}
    >
      {t("manageCookies")}
    </button>
  );
}
