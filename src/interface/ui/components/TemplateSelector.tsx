"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Check, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { setTemplateAction, type RenameActionState } from "@/app/(app)/app/actions";
import { createCheckoutAction } from "@/app/(app)/app/billing-actions";
import { MENU_TEMPLATE_VALUES, type MenuTemplate } from "@/domain/menu/MenuTypes";
import type { PlanTier } from "@/domain/billing/PlanPolicy";
import { PlanPolicy } from "@/domain/billing/PlanPolicy";
import { ErrorMessage } from "./ErrorMessage";

type Props = {
  currentTemplate: MenuTemplate;
  planTier: PlanTier;
};

const initialState: RenameActionState = { error: null };

export function TemplateSelector({ currentTemplate, planTier }: Props) {
  const t = useTranslations("Settings.template");
  const [state, formAction, isPending] = useActionState(setTemplateAction, initialState);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        {MENU_TEMPLATE_VALUES.map((template) => {
          const isCurrent = template === currentTemplate;
          const isAllowed = PlanPolicy.canUseTemplate(planTier, template);
          return (
            <Card
              key={template}
              className={`flex flex-col ${isCurrent ? "border-primary" : "border-muted"}`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{t(`names.${template}`)}</CardTitle>
                  {!isAllowed && (
                    <Badge variant="warning" className="uppercase tracking-wide">
                      <Lock aria-hidden="true" />
                      {t("lockedBadge")}
                    </Badge>
                  )}
                  {isCurrent && isAllowed && (
                    <Badge variant="canard" className="uppercase tracking-wide">
                      <Check aria-hidden="true" />
                      {t("currentBadge")}
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="flex-1 space-y-3">
                <TemplatePreview template={template} />
                <p className="text-xs text-muted-foreground">{t(`descriptions.${template}`)}</p>
                {!isAllowed && <p className="text-xs text-muted-foreground">{t("lockedHint")}</p>}
              </CardContent>

              <CardFooter>
                {isAllowed ? (
                  <form action={formAction} className="w-full">
                    <input type="hidden" name="template" value={template} />
                    <Button
                      type="submit"
                      className="w-full"
                      variant={isCurrent ? "outline" : "default"}
                      disabled={isPending || isCurrent}
                    >
                      {isCurrent ? t("currentBadge") : t("saveButton")}
                    </Button>
                  </form>
                ) : (
                  <form action={createCheckoutAction} className="w-full">
                    <input type="hidden" name="tier" value="PRO" />
                    <Button type="submit" variant="outline" className="w-full">
                      {t("upgradeCta")}
                    </Button>
                  </form>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      <ErrorMessage error={state.error} />

      {state.success && (
        <p role="status" className="text-sm text-success">
          {t("saveSuccess")}
        </p>
      )}
    </div>
  );
}

function TemplatePreview({ template }: { template: MenuTemplate }) {
  if (template === "ELEGANT") {
    return (
      <div
        aria-hidden="true"
        className="aspect-[4/3] w-full overflow-hidden rounded-md bg-stone-950 p-3 font-serif text-stone-100"
      >
        <div className="text-center text-[10px] italic tracking-wide">Aa</div>
        <div className="mx-auto mt-1 h-px w-6 bg-amber-400/80" />
        <div className="mt-2 text-center text-[7px] font-semibold uppercase tracking-[0.2em] text-amber-400">
          Entrées
        </div>
        <div className="mt-2 space-y-1.5">
          <PreviewElegantRow />
          <PreviewElegantRow />
        </div>
      </div>
    );
  }
  if (template === "MODERN") {
    return (
      <div
        aria-hidden="true"
        className="aspect-[4/3] w-full overflow-hidden rounded-md bg-orange-50 p-2"
      >
        <div className="text-[10px] font-extrabold text-orange-600">Aa</div>
        <div className="mt-1 inline-block rounded-full bg-orange-600 px-2 py-0.5 text-[7px] font-bold text-white">
          Entrées
        </div>
        <div className="mt-2 space-y-1.5">
          <PreviewModernRow />
          <PreviewModernRow />
        </div>
      </div>
    );
  }
  return (
    <div
      aria-hidden="true"
      className="aspect-[4/3] w-full overflow-hidden rounded-md border bg-background p-2"
    >
      <div className="text-[10px] font-bold">Aa</div>
      <div className="mt-2 text-[8px] font-semibold text-muted-foreground">Entrées</div>
      <div className="mt-1 space-y-1">
        <PreviewClassicRow />
        <PreviewClassicRow />
      </div>
    </div>
  );
}

function PreviewClassicRow() {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-muted/60 py-0.5">
      <span className="h-1.5 flex-1 rounded bg-muted" />
      <span className="h-1.5 w-6 rounded bg-muted-foreground/30" />
    </div>
  );
}

function PreviewElegantRow() {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-stone-800 py-0.5">
      <span className="h-1.5 flex-1 rounded bg-stone-700" />
      <span className="h-1.5 w-6 rounded bg-amber-400/70" />
    </div>
  );
}

function PreviewModernRow() {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-white p-1 shadow-sm">
      <span className="h-1.5 flex-1 rounded bg-zinc-200" />
      <span className="h-1.5 w-6 rounded-full bg-orange-500" />
    </div>
  );
}
