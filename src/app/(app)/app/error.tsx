"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("Error");

  useEffect(() => {
    // `digest` permet à Sentry de corréler le rapport client avec le log serveur
    // (le digest est généré côté serveur en App Router pour les erreurs throws).
    Sentry.captureException(error, { tags: { digest: error.digest ?? null } });
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <h1 className="mb-2 text-h1">{t("title")}</h1>
      <p className="mb-6 text-body text-muted-foreground">{t("description")}</p>
      <Button onClick={reset}>{t("retry")}</Button>
    </main>
  );
}
