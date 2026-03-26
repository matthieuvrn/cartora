"use client";

import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function PricingModal({ open, onOpenChange }: Props) {
  const t = useTranslations("Pricing");

  const freePlan = {
    name: t("free.name"),
    price: t("free.price"),
    features: t.raw("free.features") as string[],
    current: true,
  };

  const proPlan = {
    name: t("pro.name"),
    price: t("pro.price"),
    features: t.raw("pro.features") as string[],
    current: false,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          {[freePlan, proPlan].map((plan) => (
            <Card
              key={plan.name}
              className={`flex flex-col ${plan.current ? "border-muted" : "border-primary"}`}
            >
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <p className="text-2xl font-bold">{plan.price}</p>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col">
                <ul className="space-y-2 text-sm">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <Check className="size-4 text-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-auto w-full pt-4"
                  variant={plan.current ? "outline" : "default"}
                  disabled
                >
                  {plan.current ? t("cta") : t("comingSoon")}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
