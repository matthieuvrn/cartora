"use client";

import { useEffect } from "react";
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
    // import() différé : un import statique embarquerait le SDK dans le bundle initial
    // du dashboard alors qu'il ne sert qu'en cas de crash (cf. global-error.tsx).
    void import("@sentry/nextjs")
      .then((Sentry) => {
        Sentry.captureException(error, { tags: { digest: error.digest ?? null } });
      })
      .catch(() => {});
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <h1 className="mb-2 text-h1">{t("title")}</h1>
      <p className="mb-6 text-body text-muted-foreground">{t("description")}</p>
      <Button onClick={reset}>{t("retry")}</Button>
    </main>
  );
}
