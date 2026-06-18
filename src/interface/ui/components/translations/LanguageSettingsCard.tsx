"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Languages } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
};

const initialState: RenameActionState = { error: null };

/**
 * Activation des langues cibles du menu public. Le quota par tier est affiché et
 * pré-appliqué côté UI (switches désactivés au-delà), mais la règle vit dans
 * `PlanPolicy`/`UpdateMenuLocales` — le serveur reste l'autorité.
 */
export function LanguageSettingsCard({ sourceLocale, enabledLocales, planTier }: Props) {
  const t = useTranslations("Translations");
  const [state, formAction, isPending] = useActionState(updateMenuLocalesAction, initialState);
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Languages className="size-4" aria-hidden="true" />
          {t("languagesTitle")}
        </CardTitle>
        <CardDescription>{t("languagesDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-5">
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

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={isPending}>
              {t("save")}
            </Button>
            {state.success && !isPending && (
              <p className="text-sm text-success" role="status">
                {t("saved")}
              </p>
            )}
          </div>
          <ErrorMessage error={state.error} />
        </form>
      </CardContent>
    </Card>
  );
}
