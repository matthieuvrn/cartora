"use client";

import { useTranslations } from "next-intl";
import { useConsent } from "./ConsentContext";

export function ManageCookiesButton() {
  const { withdraw } = useConsent();
  const t = useTranslations("Consent");

  return (
    <button
      type="button"
      onClick={withdraw}
      className="text-sm text-muted-foreground underline-offset-4 hover:underline"
    >
      {t("manageCookies")}
    </button>
  );
}
