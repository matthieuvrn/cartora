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
import { TEMPLATE_REGISTRY } from "./menu-template/registry";
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

/**
 * Vignette palette pilotée par le registry : teinte une mini-maquette commune avec les
 * `defaultTokens` (primary/accent/bg) du template — seules les 3 couleurs changent d'une
 * carte à l'autre. Lire `defaultTokens` n'invoque AUCUN loader `dynamic()` du registry, donc
 * aucun chunk de skin ni woff2 premium n'est chargé par cette page de réglages (cf. docblock
 * registry.tsx). Toutes les couleurs de texte/bandes dérivent des tokens pour rester lisibles
 * sur fond clair ET foncé (NOIR/NEON) — ne jamais s'appuyer sur le foreground hérité.
 */
function TemplatePreview({ template }: { template: MenuTemplate }) {
  const { primary, accent, bg } = TEMPLATE_REGISTRY[template].defaultTokens;
  const hairline = `color-mix(in srgb, ${primary} 22%, transparent)`;
  return (
    <div
      aria-hidden="true"
      className="aspect-[4/3] w-full overflow-hidden rounded-md border p-2.5"
      style={{ backgroundColor: bg }}
    >
      <div className="text-[11px] font-bold leading-none" style={{ color: primary }}>
        Aa
      </div>
      <div
        className="mt-2 text-[8px] font-semibold uppercase tracking-wide"
        style={{ color: primary, opacity: 0.6 }}
      >
        Entrées
      </div>
      <div className="mt-1.5 space-y-1.5">
        <PreviewRow primary={primary} accent={accent} hairline={hairline} />
        <PreviewRow primary={primary} accent={accent} hairline={hairline} />
      </div>
    </div>
  );
}

function PreviewRow({
  primary,
  accent,
  hairline,
}: {
  primary: string;
  accent: string;
  hairline: string;
}) {
  return (
    <div
      className="flex items-center justify-between gap-2 pb-1"
      style={{ borderBottom: `1px solid ${hairline}` }}
    >
      <span className="h-1.5 flex-1 rounded" style={{ backgroundColor: primary, opacity: 0.7 }} />
      <span className="h-1.5 w-5 rounded" style={{ backgroundColor: accent }} />
    </div>
  );
}
