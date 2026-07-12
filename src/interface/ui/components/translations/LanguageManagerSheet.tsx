"use client";

import { useActionState, useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Languages, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import {
  MENU_LOCALE_LABELS,
  SUPPORTED_MENU_LOCALES,
  type MenuLocale,
} from "@/domain/menu/MenuLocale";
import { PlanPolicy, type PlanTier } from "@/domain/billing/PlanPolicy";
import { updateMenuLocalesAction, type RenameActionState } from "@/app/(app)/app/actions";
import { ErrorMessage } from "@/interface/ui/components/ErrorMessage";

type Props = {
  sourceLocale: MenuLocale;
  enabledLocales: MenuLocale[];
  planTier: PlanTier;
  /** Rend le déclencheur en variante « ajouter » (état vide onboarding). */
  variant?: "manage" | "add";
};

const initialState: RenameActionState = { error: null };

/**
 * Gestion des langues cibles (activation/désactivation) dans un Sheet, ouvert depuis
 * le header ou l'état vide. Sorti du flux quotidien de revue : l'activation d'une
 * langue est un choix délibéré (bouton « Enregistrer » explicite), qui ne concurrence
 * plus l'autosave des champs. Le quota par tier est pré-appliqué côté UI, mais la
 * règle vit dans `PlanPolicy`/`UpdateMenuLocales` — le serveur reste l'autorité.
 */
export function LanguageManagerSheet({
  sourceLocale,
  enabledLocales,
  planTier,
  variant = "manage",
}: Props) {
  const t = useTranslations("Translations");
  const [open, setOpen] = useState(false);
  const wrappedAction = useCallback(
    async (prev: RenameActionState, formData: FormData) => {
      const result = await updateMenuLocalesAction(prev, formData);
      if (result.error === null) toast.success(t("saved"));
      return result;
    },
    [t],
  );
  const [state, formAction, isPending] = useActionState(wrappedAction, initialState);
  const [selected, setSelected] = useState<ReadonlySet<MenuLocale>>(new Set(enabledLocales));

  const targets = SUPPORTED_MENU_LOCALES.filter((locale) => locale !== sourceLocale);
  const maxExtra = PlanPolicy.maxExtraMenuLocalesFor(planTier);
  const quotaReached = selected.size >= maxExtra;

  const toggle = (locale: MenuLocale, on: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(locale);
      else next.delete(locale);
      return next;
    });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant={variant === "add" ? "default" : "outline"} size="sm">
          <Languages className="size-4" aria-hidden />
          {variant === "add" ? t("addLanguage") : t("manageLanguages")}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full gap-0 sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Languages className="size-4" aria-hidden />
            {t("languagesTitle")}
          </SheetTitle>
          <SheetDescription>{t("languagesDescription")}</SheetDescription>
        </SheetHeader>

        <form
          action={formAction}
          className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-6"
        >
          <div className="flex items-center justify-between rounded-md border bg-muted/40 px-4 py-3">
            <div>
              <p className="text-sm font-medium">{MENU_LOCALE_LABELS[sourceLocale]}</p>
              <p className="text-xs text-muted-foreground">{t("sourceHint")}</p>
            </div>
            <Badge variant="outline">{t("sourceBadge")}</Badge>
          </div>

          <ul className="space-y-1">
            {targets.map((locale) => {
              const checked = selected.has(locale);
              const disabled = isPending || (!checked && quotaReached);
              return (
                <li
                  key={locale}
                  className="flex items-center justify-between rounded-md px-4 py-2.5 hover:bg-accent/40"
                >
                  <label htmlFor={`locale-${locale}`} className="text-sm font-medium">
                    {MENU_LOCALE_LABELS[locale]}
                  </label>
                  <Switch
                    id={`locale-${locale}`}
                    checked={checked}
                    disabled={disabled}
                    onCheckedChange={(on) => toggle(locale, on)}
                  />
                  {checked && <input type="hidden" name="locales" value={locale} />}
                </li>
              );
            })}
          </ul>

          <p className="text-xs text-muted-foreground">
            {maxExtra === Infinity
              ? t("quotaUnlimited")
              : t("quotaLimited", { limit: maxExtra, tier: planTier })}
          </p>

          <div className="mt-auto space-y-3">
            <ErrorMessage error={state.error} />
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" aria-hidden />}
              {t("save")}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
