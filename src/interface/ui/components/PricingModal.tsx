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

        <div className="grid gap-4 sm:grid-cols-3 sm:items-center">
          {/* Gratuit */}
          <Card className="flex flex-col border-canard-100">
            <CardHeader>
              <CardTitle className="text-lg">{t("free.name")}</CardTitle>
              <div className="mt-2 flex items-baseline gap-1">
                <Price value={t("free.price")} />
              </div>
            </CardHeader>

            <CardContent className="flex-1">
              <ul className="space-y-3 text-sm">
                {(t.raw("free.features") as string[]).map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-canard-400" />
                    <span>{feature}</span>
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

          {/* Starter — carte INVERSÉE calquée sur la featured de LandingPricing : le remap
              `.section-nuit` rend le CTA primaire automatiquement porcelaine, `bg-background`
              (→ nuit-900) écrase le bg-card de la primitive. `shadow-frame!` : important requis,
              la règle non-layered `[data-slot=card]` (globals.css) écrase sinon tout shadow-*. */}
          <Card className="section-nuit texture-grain relative z-10 flex flex-col overflow-hidden bg-background text-foreground shadow-frame! sm:scale-[1.02]">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{t("starter.name")}</CardTitle>
                {/* Badge corail mono (pattern landing) — LE point corail du viewport. */}
                <span className="rounded-full bg-corail-500 px-2.5 py-0.5 font-mono text-micro tracking-wider text-white uppercase">
                  {t("recommended")}
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <Price value={t("starter.price")} />
                {t("starter.period") && (
                  <span className="text-sm text-muted-foreground">{t("starter.period")}</span>
                )}
              </div>
            </CardHeader>

            <CardContent className="flex-1">
              <ul className="space-y-3 text-sm">
                {(t.raw("starter.features") as string[]).map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-sapin-300" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>

            <CardFooter>
              <form action={createCheckoutAction} className="w-full">
                <input type="hidden" name="tier" value="STARTER" />
                <CheckoutButton label={t("ctaChoose")} variant="cta" />
              </form>
            </CardFooter>
          </Card>

          {/* Pro */}
          <Card className="flex flex-col border-canard-100">
            <CardHeader>
              <CardTitle className="text-lg">{t("pro.name")}</CardTitle>
              <div className="mt-2 flex items-baseline gap-1">
                <Price value={t("pro.price")} />
                {t("pro.period") && (
                  <span className="text-sm text-muted-foreground">{t("pro.period")}</span>
                )}
              </div>
            </CardHeader>

            <CardContent className="flex-1">
              <ul className="space-y-3 text-sm">
                {(t.raw("pro.features") as string[]).map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-canard-400" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>

            <CardFooter>
              <form action={createCheckoutAction} className="w-full">
                <input type="hidden" name="tier" value="PRO" />
                <CheckoutButton label={t("ctaChoose")} variant="outline" />
              </form>
            </CardFooter>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Prix en Fraunces (calqué sur LandingPricing) — `font-display` éditorial, pas `font-mono`
// (le mono est réservé aux prix/data inline : items, KPI). `tabular-nums` pour l'alignement des chiffres.
// `text-h1` (40px) plutôt que le `text-display-lg` (52px) de la landing : la modale est plus dense
// (3 colonnes ~180px au breakpoint sm), display-lg ferait déborder « 29,90 € ». Même esprit éditorial.
function Price({ value }: { value: string }) {
  return (
    <span className="font-display text-h1 font-medium tracking-[-0.04em] tabular-nums">
      {value}
    </span>
  );
}

function CheckoutButton({
  label,
  variant,
}: {
  label: string;
  variant: "cta" | "default" | "outline";
}) {
  const { pending } = useFormStatus();
  return (
    <Button className="w-full" type="submit" disabled={pending} variant={variant}>
      {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
      {label}
    </Button>
  );
}
