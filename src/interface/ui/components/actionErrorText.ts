import type { useTranslations } from "next-intl";
// `ActionError` est un type pur — l'`import type` évite de tirer
// `@sentry/nextjs` et `next/navigation` dans le bundle client.
import type { ActionError } from "@/lib/action-result";

type Translator = ReturnType<typeof useTranslations>;

/**
 * Résout un `ActionError` en message localisé — logique partagée entre
 * l'affichage inline (`ErrorMessage`) et les toasts (sonner). Tombe sur
 * `generic` si la clé `${namespace}.${code}` n'existe pas (sécurité contre
 * les codes ajoutés sans clé i18n correspondante).
 *
 * Codes paramétrés (`max_categories`, `locale_quota_exceeded`) : tente d'abord la
 * clé enrichie `${code}_with_limit` avec les `metadata` injectées comme variables ICU.
 */
export function actionErrorText(t: Translator, error: ActionError): string {
  if (
    (error.code === "max_categories" || error.code === "locale_quota_exceeded") &&
    error.metadata?.limit !== undefined
  ) {
    const richKey = `${error.code}_with_limit`;
    if (t.has(richKey)) {
      return t(richKey, {
        limit: error.metadata.limit,
        tier: error.metadata.tier ?? "",
      });
    }
  }

  return t(t.has(error.code) ? error.code : "generic");
}
