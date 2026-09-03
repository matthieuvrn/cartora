"use client";

import { useTranslations } from "next-intl";
import type { PlanTier } from "@/domain/billing/PlanPolicy";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PricingTiers } from "./billing/PricingTiers";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Formule courante — un abonné actif est renvoyé vers la page Abonnement (cf. PricingTiers). */
  currentTier?: PlanTier;
};

/** Upsell in-app : la grille des formules (`PricingTiers`) dans une Dialog. */
export function PricingModal({ open, onOpenChange, currentTier = "FREE" }: Props) {
  const t = useTranslations("Pricing");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <PricingTiers currentTier={currentTier} layout="modal" />
      </DialogContent>
    </Dialog>
  );
}
