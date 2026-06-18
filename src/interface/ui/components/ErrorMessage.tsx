"use client";

import { useTranslations } from "next-intl";
// `ActionError` est un type pur — l'`import type` évite de tirer
// `@sentry/nextjs` et `next/navigation` dans le bundle client de ce composant.
import type { ActionError } from "@/lib/action-result";

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
 * Mappe un `ActionError` vers une string i18n. Tombe sur `generic` si la clé
 * `${namespace}.${code}` n'existe pas (sécurité contre les codes ajoutés
 * sans clé i18n correspondante).
 *
 * Pour les codes paramétrés (`max_categories`, `max_photos`), tente la clé
 * enrichie `${code}_with_limit` avec les `metadata` injectées comme variables ICU.
 */
export function ErrorMessage({ error, namespace = "Errors", className }: Props) {
  // ⚠️ useTranslations doit être appelé inconditionnellement.
  const t = useTranslations(namespace);
  if (!error) return null;

  // Codes paramétrés : on tente d'abord la clé enrichie avec metadata.
  if (
    (error.code === "max_categories" ||
      error.code === "max_photos" ||
      error.code === "locale_quota_exceeded") &&
    error.metadata?.limit !== undefined
  ) {
    const richKey = `${error.code}_with_limit`;
    if (t.has(richKey)) {
      return (
        <p role="alert" className={className ?? "text-sm text-destructive"}>
          {t(richKey, {
            limit: error.metadata.limit,
            tier: error.metadata.tier ?? "",
          })}
        </p>
      );
    }
  }

  const key = t.has(error.code) ? error.code : "generic";
  return (
    <p role="alert" className={className ?? "text-sm text-destructive"}>
      {t(key)}
    </p>
  );
}
