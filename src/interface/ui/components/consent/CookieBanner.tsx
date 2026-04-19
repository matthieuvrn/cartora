"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useConsent } from "./ConsentContext";

export function CookieBanner() {
  const { status, accept, refuse } = useConsent();
  const t = useTranslations("Consent");

  if (status !== "pending") return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t bg-background p-4 shadow-lg sm:p-6">
      <div className="mx-auto flex max-w-3xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1 text-sm">
          <p className="font-medium">{t("bannerTitle")}</p>
          <p className="text-muted-foreground">
            {t.rich("bannerDescription", {
              privacyLink: (chunks) => (
                <Link href="/confidentialite" className="underline underline-offset-4">
                  {chunks}
                </Link>
              ),
            })}
          </p>
        </div>
        <div className="flex shrink-0 gap-3">
          <Button variant="outline" size="sm" onClick={refuse} className="flex-1 sm:flex-none">
            {t("refuse")}
          </Button>
          <Button size="sm" onClick={accept} className="flex-1 sm:flex-none">
            {t("accept")}
          </Button>
        </div>
      </div>
    </div>
  );
}
