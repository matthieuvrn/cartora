"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Sparkles, Loader2, CircleCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MENU_LOCALE_LABELS, type MenuLocale } from "@/domain/menu/MenuLocale";
import type { LocaleCoverage } from "@/domain/menu/translationStatus";
import { autoTranslateMenuAction, type AutoTranslateActionState } from "@/app/(app)/app/actions";

type Props = {
  enabledLocales: MenuLocale[];
  coverage: LocaleCoverage[];
};

/**
 * Panneau de traduction (S4, refonte 2026 — flux full-auto, PRO uniquement).
 * En lecture seule : progression de couverture par langue + une seule action
 * « Traduire automatiquement » (DeepL), qui boucle sur toutes les langues activées
 * ayant des champs manquants/obsolètes. Plus aucune saisie manuelle. N'est rendu
 * que pour un PRO (la page gate en amont), donc pas de garde de tier ici.
 */
export function TranslationPanel({ enabledLocales, coverage }: Props) {
  const t = useTranslations("Translations");
  const tErrors = useTranslations("Errors");
  const router = useRouter();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [progress, setProgress] = useState<{
    locale: MenuLocale;
    done: number;
    total: number;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const countByLocale = new Map(coverage.map((c) => [c.locale, c]));
  const totalTodo = coverage.reduce((acc, c) => acc + c.stale + c.missing, 0);

  // Langues avec au moins un champ manquant/obsolète — cibles de l'auto-traduction.
  const targets = enabledLocales.filter((locale) => {
    const c = countByLocale.get(locale);
    return c ? c.stale + c.missing > 0 : false;
  });

  const runAutoTranslate = () => {
    startTransition(async () => {
      let translated = 0;
      for (let i = 0; i < targets.length; i++) {
        const locale = targets[i];
        setProgress({ locale, done: i + 1, total: targets.length });
        const prev: AutoTranslateActionState = { error: null };
        const formData = new FormData();
        formData.set("targetLocale", locale);
        const result = await autoTranslateMenuAction(prev, formData);
        if (result.error !== null) {
          toast.error(tErrors(tErrors.has(result.error.code) ? result.error.code : "generic"));
          break;
        }
        translated += result.translatedCount ?? 0;
      }
      setProgress(null);
      if (translated > 0) {
        toast.success(t("autoTranslateAllResult", { translated }));
      }
      // Recharge les données serveur (couverture) : chaque champ est déjà persisté.
      router.refresh();
    });
  };

  const busy = isPending || progress !== null;

  return (
    <section className="space-y-4 rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="flex items-center gap-2 text-body font-medium">
            {totalTodo === 0 ? (
              <>
                <CircleCheck className="size-5 text-success" aria-hidden />
                {t("allUpToDate")}
              </>
            ) : (
              <>
                <span className="inline-flex size-2 rounded-full bg-warning" aria-hidden />
                {t("remaining", { count: totalTodo })}
              </>
            )}
          </p>
          <p className="text-caption text-muted-foreground">{t("freshnessHint")}</p>
        </div>

        <Button
          type="button"
          size="sm"
          disabled={busy || targets.length === 0}
          onClick={() => setConfirmOpen(true)}
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Sparkles className="size-4" aria-hidden />
          )}
          {progress
            ? t("autoTranslateProgress", {
                lang: MENU_LOCALE_LABELS[progress.locale],
                done: progress.done,
                total: progress.total,
              })
            : t("autoTranslateMissing")}
        </Button>
      </div>

      <ul className="flex flex-wrap gap-x-4 gap-y-2">
        {coverage.map((c) => {
          const remaining = c.stale + c.missing;
          const pct = c.total === 0 ? 100 : Math.round((c.fresh / c.total) * 100);
          return (
            <li key={c.locale} className="flex min-w-40 flex-1 items-center gap-2">
              <span className="w-6 shrink-0 text-caption font-semibold text-muted-foreground uppercase">
                {c.locale}
              </span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-300 ease-[var(--ease-out-expo)]"
                  style={{ width: `${pct}%` }}
                  aria-hidden
                />
              </div>
              <span className="w-14 shrink-0 text-right text-caption text-muted-foreground tabular-nums">
                {remaining === 0 ? t("status.fresh") : `${pct}%`}
              </span>
            </li>
          );
        })}
      </ul>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("autoTranslateAllConfirmTitle")}</DialogTitle>
            <DialogDescription>
              {t("autoTranslateAllConfirmBody", {
                count: totalTodo,
                langs: targets.map((l) => MENU_LOCALE_LABELS[l]).join(", "),
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              {t("cancel")}
            </Button>
            <Button
              disabled={targets.length === 0}
              onClick={() => {
                setConfirmOpen(false);
                runAutoTranslate();
              }}
            >
              <Sparkles className="size-4" aria-hidden />
              {t("autoTranslateConfirmCta")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
