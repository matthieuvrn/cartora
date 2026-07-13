"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { MenuLocale } from "@/domain/menu/MenuLocale";
import { autoTranslateMenuAction, type AutoTranslateActionState } from "@/app/(app)/app/actions";

export type AutoTranslateProgress = { locale: MenuLocale; done: number; total: number };

/**
 * Boucle d'auto-traduction partagée (carte « Traductions » + nudge à la publication).
 * Traduit séquentiellement chaque langue cible — une action = une langue, Vercel-safe
 * (pas de job de fond). `autoTranslateMenuAction` est cost-aware côté serveur : seuls
 * les champs `missing`/`stale` sont envoyés à DeepL. Émet les toasts (succès agrégé /
 * erreur par code) et renvoie une Promise<boolean> pour que l'appelant enchaîne
 * (ex. publier après avoir traduit). Ne rafraîchit PAS lui-même — à la charge de
 * l'appelant (`router.refresh()` sur la carte, `publish` pour le nudge).
 */
export function useAutoTranslate() {
  const t = useTranslations("Translations");
  const tErrors = useTranslations("Errors");
  const [progress, setProgress] = useState<AutoTranslateProgress | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);

  const run = useCallback(
    async (targetLocales: MenuLocale[]): Promise<boolean> => {
      setIsTranslating(true);
      let translated = 0;
      let ok = true;
      try {
        for (let i = 0; i < targetLocales.length; i++) {
          const locale = targetLocales[i];
          setProgress({ locale, done: i + 1, total: targetLocales.length });
          const prev: AutoTranslateActionState = { error: null };
          const formData = new FormData();
          formData.set("targetLocale", locale);
          const result = await autoTranslateMenuAction(prev, formData);
          if (result.error !== null) {
            toast.error(tErrors(tErrors.has(result.error.code) ? result.error.code : "generic"));
            ok = false;
            break;
          }
          translated += result.translatedCount ?? 0;
        }
      } finally {
        setProgress(null);
        setIsTranslating(false);
      }
      if (translated > 0) toast.success(t("autoTranslateAllResult", { translated }));
      return ok;
    },
    [t, tErrors],
  );

  return { run, progress, isTranslating };
}
