"use client";

import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { Check, Loader2 } from "lucide-react";
import { createCheckoutAction } from "@/app/(app)/app/billing-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function PricingModal({ open, onOpenChange }: Props) {
  const t = useTranslations("Pricing");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-3">
          {/* Gratuit */}
          <Card className="flex flex-col border-muted">
            <CardHeader>
              <CardTitle className="text-lg">{t("free.name")}</CardTitle>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-bold tracking-tight">{t("free.price")}</span>
              </div>
            </CardHeader>

            <CardContent className="flex-1">
              <ul className="space-y-3 text-sm">
                {(t.raw("free.features") as string[]).map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <Check className="size-4 shrink-0 text-muted-foreground" />
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>

            <CardFooter>
              <Button className="w-full" variant="outline" disabled>
                {t("ctaCurrent")}
              </Button>
            </CardFooter>
          </Card>

          {/* Starter */}
          <Card className="flex flex-col border-muted">
            <CardHeader>
              <CardTitle className="text-lg">{t("starter.name")}</CardTitle>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-bold tracking-tight">{t("starter.price")}</span>
                {t("starter.period") && (
                  <span className="text-sm text-muted-foreground">{t("starter.period")}</span>
                )}
              </div>
            </CardHeader>

            <CardContent className="flex-1">
              <ul className="space-y-3 text-sm">
                {(t.raw("starter.features") as string[]).map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <Check className="size-4 shrink-0 text-muted-foreground" />
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>

            <CardFooter>
              <form action={createCheckoutAction} className="w-full">
                <input type="hidden" name="tier" value="STARTER" />
                <CheckoutButton label={t("ctaChoose")} variant="outline" />
              </form>
            </CardFooter>
          </Card>

          {/* Pro */}
          <Card className="relative flex flex-col border-primary shadow-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{t("pro.name")}</CardTitle>
                <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground">
                  {t("popular")}
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-bold tracking-tight">{t("pro.price")}</span>
                {t("pro.period") && (
                  <span className="text-sm text-muted-foreground">{t("pro.period")}</span>
                )}
              </div>
            </CardHeader>

            <CardContent className="flex-1">
              <ul className="space-y-3 text-sm">
                {(t.raw("pro.features") as string[]).map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <Check className="size-4 shrink-0 text-primary" />
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>

            <CardFooter>
              <form action={createCheckoutAction} className="w-full">
                <input type="hidden" name="tier" value="PRO" />
                <CheckoutButton label={t("ctaChoose")} variant="default" />
              </form>
            </CardFooter>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CheckoutButton({ label, variant }: { label: string; variant: "default" | "outline" }) {
  const { pending } = useFormStatus();
  return (
    <Button className="w-full" type="submit" disabled={pending} variant={variant}>
      {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
      {label}
    </Button>
  );
}
