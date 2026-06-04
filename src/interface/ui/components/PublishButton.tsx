"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Send, Loader2, AlertTriangle, RefreshCw, Check } from "lucide-react";
import type { PlanTier } from "@/domain/billing/PlanPolicy";
import type { PublishActionState } from "@/app/(app)/app/actions";
import type { ActionState } from "@/lib/action-result";
import { Button } from "@/components/ui/button";
import { ErrorMessage } from "./ErrorMessage";
import { PricingModal } from "./PricingModal";

type RegenerateState = ActionState<{ success?: boolean }>;

type Props = {
  planTier: PlanTier;
  menuStatus: "DRAFT" | "PUBLISHED";
  publishAction: (_prev: PublishActionState) => Promise<PublishActionState>;
  regenerateQrAction: (_prev: RegenerateState) => Promise<RegenerateState>;
};

export function PublishButton({ planTier, menuStatus, publishAction, regenerateQrAction }: Props) {
  const t = useTranslations("Dashboard");
  const [pricingOpen, setPricingOpen] = useState(false);

  const [state, formAction, isPending] = useActionState(publishAction, {
    error: null,
  });

  const [regenState, regenAction, isRegenPending] = useActionState(regenerateQrAction, {
    error: null,
  });

  // FREE = pas de publication. Starter et Pro ont le droit de publier.
  // Le serveur (PublishMenu use case) re-vérifie via PlanPolicy.canPublish, qui
  // refuse aussi les status non-ACTIVE (PAST_DUE, CANCELED) — couvert par
  // le code `plan_inactive` côté state.error.
  if (planTier === "FREE") {
    return (
      <>
        <Button variant="default" size="sm" onClick={() => setPricingOpen(true)}>
          <Send className="mr-2 size-4" />
          {t("publish")}
        </Button>
        <PricingModal open={pricingOpen} onOpenChange={setPricingOpen} />
      </>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <form action={formAction}>
          <Button type="submit" size="sm" disabled={isPending || menuStatus === "PUBLISHED"}>
            {isPending ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Send className="mr-2 size-4" />
            )}
            {t("publish")}
          </Button>
        </form>
      </div>

      {state.error && <ErrorMessage error={state.error} namespace="Dashboard.publishError" />}

      {state.warning?.code === "qr_failed" && !regenState.success && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-foreground"
        >
          <AlertTriangle className="size-4 shrink-0 text-warning" aria-hidden="true" />
          <span className="flex-1">{t("publishWarning.qr_failed")}</span>
          <form action={regenAction}>
            <Button
              type="submit"
              size="sm"
              variant="outline"
              disabled={isRegenPending}
              className="h-7"
            >
              {isRegenPending ? (
                <Loader2 className="mr-1 size-3 animate-spin" />
              ) : (
                <RefreshCw className="mr-1 size-3" />
              )}
              {t("publishWarning.regenerate")}
            </Button>
          </form>
        </div>
      )}

      {regenState.success && (
        <p role="status" className="flex items-center gap-1 text-sm text-success">
          <Check className="size-4" aria-hidden="true" />
          {t("publishWarning.regenerated")}
        </p>
      )}

      {regenState.error && <ErrorMessage error={regenState.error} />}
    </div>
  );
}
