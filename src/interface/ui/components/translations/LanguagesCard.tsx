"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { CircleCheck, Loader2, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  MENU_LOCALE_LABELS,
  SUPPORTED_MENU_LOCALES,
  type MenuLocale,
} from "@/domain/menu/MenuLocale";
import type { LocaleCoverage } from "@/domain/menu/translationStatus";
import {
  autoTranslateMenuAction,
  updateMenuLocalesAction,
  type AutoTranslateActionState,
} from "@/app/(app)/app/actions";

type Props = {
  sourceLocale: MenuLocale;
  enabledLocales: MenuLocale[];
  /** Couverture par langue activée (vide tant qu'aucune cible n'est activée). */
  coverage: LocaleCoverage[];
};

/**
 * Carte unique « Langues du menu » (S4, refonte 2026). Fusionne l'ancien Sheet de
 * gestion et le panneau de couverture en une seule surface en ligne — le pattern des
 * autres pages réglages (apparence/reglages). Chaque langue cible = un interrupteur à
 * enregistrement instantané (`useOptimistic` + `updateMenuLocalesAction`, qui remplace
 * la liste complète) ; les langues activées montrent leur barre de couverture ; un
 * unique bouton lance la traduction automatique (DeepL). N'est rendue que pour un PRO
 * (la page gate en amont) — pas de garde de tier ni de quota ici.
 */
export function LanguagesCard({ sourceLocale, enabledLocales, coverage }: Props) {
  const t = useTranslations("Translations");
  const tErrors = useTranslations("Errors");
  const router = useRouter();

  const [optimisticEnabled, addOptimistic] = useOptimistic(
    new Set<MenuLocale>(enabledLocales),
    (prev, { locale, on }: { locale: MenuLocale; on: boolean }) => {
      const next = new Set(prev);
      if (on) next.add(locale);
      else next.delete(locale);
      return next;
    },
  );
  const [isSaving, startSaveTransition] = useTransition();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [progress, setProgress] = useState<{
    locale: MenuLocale;
    done: number;
    total: number;
  } | null>(null);
  const [isTranslating, startTranslateTransition] = useTransition();

  const busy = isSaving || isTranslating || progress !== null;

  const targets = SUPPORTED_MENU_LOCALES.filter((locale) => locale !== sourceLocale);
  const countByLocale = new Map(coverage.map((c) => [c.locale, c]));
  const totalTodo = coverage.reduce((acc, c) => acc + c.stale + c.missing, 0);
  // Langues activées avec au moins un champ manquant/obsolète — cibles de l'auto-trad.
  const translateTargets = coverage.filter((c) => c.stale + c.missing > 0).map((c) => c.locale);
  const hasEnabled = optimisticEnabled.size > 0;

  // Bascule d'une langue : enregistrement instantané. `updateMenuLocalesAction`
  // remplace la liste complète, donc on lui renvoie l'ensemble résultant. Les switches
  // sont désactivés pendant `busy` ⇒ une seule bascule en vol (pas de course).
  const toggle = (locale: MenuLocale, on: boolean) => {
    startSaveTransition(async () => {
      addOptimistic({ locale, on });
      const next = new Set(enabledLocales);
      if (on) next.add(locale);
      else next.delete(locale);
      const formData = new FormData();
      for (const l of next) formData.append("locales", l);
      const result = await updateMenuLocalesAction({ error: null }, formData);
      if (result.error !== null) {
        toast.error(tErrors(tErrors.has(result.error.code) ? result.error.code : "generic"));
        return; // `useOptimistic` revient seul à l'état serveur.
      }
      toast.success(
        t(on ? "localeEnabled" : "localeDisabled", { lang: MENU_LOCALE_LABELS[locale] }),
      );
      router.refresh(); // recharge la couverture (langue nouvellement activée → missing).
    });
  };

  const runAutoTranslate = () => {
    startTranslateTransition(async () => {
      let translated = 0;
      for (let i = 0; i < translateTargets.length; i++) {
        const locale = translateTargets[i];
        setProgress({ locale, done: i + 1, total: translateTargets.length });
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
      if (translated > 0) toast.success(t("autoTranslateAllResult", { translated }));
      router.refresh();
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("languagesTitle")}</CardTitle>
        <CardDescription>{t("languagesDescription")}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-1">
        <div className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2.5">
          <div>
            <p className="text-sm font-medium">{MENU_LOCALE_LABELS[sourceLocale]}</p>
            <p className="text-xs text-muted-foreground">{t("sourceHint")}</p>
          </div>
          <Badge variant="outline">{t("sourceBadge")}</Badge>
        </div>

        <div className="my-1 border-t" />

        {targets.map((locale) => {
          const checked = optimisticEnabled.has(locale);
          const c = countByLocale.get(locale);
          const pct = c ? (c.total === 0 ? 100 : Math.round((c.fresh / c.total) * 100)) : 0;
          const remaining = c ? c.stale + c.missing : 0;
          return (
            <div
              key={locale}
              className="flex items-center gap-3 rounded-md px-3 py-2.5 hover:bg-accent/40"
            >
              <label htmlFor={`locale-${locale}`} className="w-24 shrink-0 text-sm font-medium">
                {MENU_LOCALE_LABELS[locale]}
              </label>
              {checked && c ? (
                <div className="flex flex-1 items-center gap-2">
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
                </div>
              ) : (
                <div className="flex-1" />
              )}
              <Switch
                id={`locale-${locale}`}
                checked={checked}
                disabled={busy}
                onCheckedChange={(on) => toggle(locale, on)}
              />
            </div>
          );
        })}
      </CardContent>

      <CardFooter className="flex-wrap items-center justify-between gap-3 border-t pt-4">
        {hasEnabled ? (
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
        ) : (
          <p className="max-w-md text-sm text-muted-foreground">{t("noLocalesHint")}</p>
        )}

        <Button
          type="button"
          size="sm"
          disabled={busy || translateTargets.length === 0}
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
      </CardFooter>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("autoTranslateAllConfirmTitle")}</DialogTitle>
            <DialogDescription>
              {t("autoTranslateAllConfirmBody", {
                count: totalTodo,
                langs: translateTargets.map((l) => MENU_LOCALE_LABELS[l]).join(", "),
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              {t("cancel")}
            </Button>
            <Button
              disabled={translateTargets.length === 0}
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
    </Card>
  );
}
