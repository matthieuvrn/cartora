"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Send, Loader2 } from "lucide-react";
import type { PlanStatus } from "@/domain/menu/PublicationPolicy";
import type { PublishActionState } from "@/app/(app)/app/actions";
import { Button } from "@/components/ui/button";
import { PricingModal } from "./PricingModal";

type Props = {
  planStatus: PlanStatus;
  menuStatus: "DRAFT" | "PUBLISHED";
  publishAction: (_prev: PublishActionState) => Promise<PublishActionState>;
};

export function PublishButton({ planStatus, menuStatus, publishAction }: Props) {
  const t = useTranslations("Dashboard");
  const [pricingOpen, setPricingOpen] = useState(false);

  const [state, formAction, isPending] = useActionState(publishAction, {
    error: null,
  });

  if (planStatus !== "ACTIVE") {
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

      {state.error && <p className="text-sm text-destructive">{t("error.publishFailed")}</p>}
    </div>
  );
}
