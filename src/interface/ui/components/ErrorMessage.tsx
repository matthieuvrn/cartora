"use client";

import { useTranslations } from "next-intl";
// `ActionError` est un type pur — l'`import type` évite de tirer
// `@sentry/nextjs` et `next/navigation` dans le bundle client de ce composant.
import type { ActionError } from "@/lib/action-result";
import { actionErrorText } from "./actionErrorText";

type Props = {
  error: ActionError | null | undefined;
  /**
   * Namespace i18n à utiliser pour résoudre `error.code`.
   * Par défaut `"Errors"` — namespace partagé par tous les composants.
   * Override pour un message contextualisé (ex: `"Dashboard.publishError"`).
   */
  namespace?: string;
  className?: string;
};

/**
 * Affichage inline d'un `ActionError`. La résolution code→message (clé enrichie
 * `_with_limit`, fallback `generic`) vit dans `actionErrorText`, partagée avec
 * les toasts.
 */
export function ErrorMessage({ error, namespace = "Errors", className }: Props) {
  // ⚠️ useTranslations doit être appelé inconditionnellement.
  const t = useTranslations(namespace);
  if (!error) return null;

  return (
    <p role="alert" className={className ?? "text-sm text-destructive"}>
      {actionErrorText(t, error)}
    </p>
  );
}
