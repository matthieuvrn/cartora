"use client";

import { Suspense, useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  UtensilsCrossed,
  Pizza,
  Beer,
  Wine,
  Coffee,
  CookingPot,
  Beef,
  Croissant,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { signupAction, type AuthState } from "@/app/(auth)/actions";
import { RESTAURANT_TYPES, type RestaurantType } from "@/domain/restaurant/RestaurantInitPolicy";

const initialState: AuthState = { error: null };

const TYPE_ICONS: Record<RestaurantType, LucideIcon> = {
  TRADITIONAL: UtensilsCrossed,
  PIZZERIA: Pizza,
  BRASSERIE: Beer,
  BAR: Wine,
  CAFE: Coffee,
  CREPERIE: CookingPot,
  FASTFOOD: Beef,
  BAKERY: Croissant,
};

// Plans annonçables depuis la landing (?plan=…). Toute autre valeur est ignorée :
// on n'affiche jamais de rappel pour un plan inconnu et on ne persiste rien.
const PLAN_PARAM_VALUES = ["free", "starter", "pro"] as const;
type PlanParam = (typeof PLAN_PARAM_VALUES)[number];

function parsePlan(value: string | null): PlanParam | null {
  return PLAN_PARAM_VALUES.includes(value as PlanParam) ? (value as PlanParam) : null;
}

// Emplacement CTA d'origine (?src=hero|header|sticky|final|pricing) — attribution
// clic→inscription. Whitelist stricte : jamais de chaîne libre dans les metadata.
function parseSrc(value: string | null): string | null {
  return value !== null && /^[a-z0-9_-]{1,32}$/.test(value) ? value : null;
}

export default function SignupPage() {
  return (
    // useSearchParams impose une frontière Suspense pour garder la route prerender-able ;
    // le fallback rend le même formulaire sans le rappel de plan (aucun flash visible).
    <Suspense fallback={<SignupCard plan={null} src={null} />}>
      <SignupCardWithParams />
    </Suspense>
  );
}

function SignupCardWithParams() {
  const searchParams = useSearchParams();
  return (
    <SignupCard
      plan={parsePlan(searchParams.get("plan"))}
      src={parseSrc(searchParams.get("src"))}
    />
  );
}

function SignupCard({ plan, src }: { plan: PlanParam | null; src: string | null }) {
  const t = useTranslations("Auth");
  const [state, action, isPending] = useActionState(signupAction, initialState);

  if (state.success) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="display">{t("checkEmailTitle")}</CardTitle>
          <CardDescription>{t("checkEmailDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t("hasAccount")}{" "}
            <Link href="/login" className="underline underline-offset-4">
              {t("login")}
            </Link>
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="display">{t("signup")}</CardTitle>
        <CardDescription>Cartora</CardDescription>
      </CardHeader>

      <form action={action}>
        <CardContent className="space-y-4">
          {/* Rappel du plan choisi sur la landing — le clic pricing le plus chaud de la
              page ne doit pas atterrir sur un formulaire qui a oublié son choix. */}
          {(plan === "starter" || plan === "pro") && (
            <p className="flex items-start gap-2 rounded-md border border-primary/25 bg-primary/5 px-3 py-2.5 text-sm">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
              <span>{t(plan === "starter" ? "planReminderStarter" : "planReminderPro")}</span>
            </p>
          )}

          {state.error && (
            <p role="alert" className="text-sm text-destructive">
              {t(`error.${state.error}`)}
            </p>
          )}

          {plan && <input type="hidden" name="plan" value={plan} />}
          {src && <input type="hidden" name="src" value={src} />}

          <div className="space-y-1">
            <Label htmlFor="email">{t("email")}</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>

          <div className="space-y-1">
            <Label htmlFor="password">{t("password")}</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
            />
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">{t("restaurantType.label")}</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {RESTAURANT_TYPES.map((type) => {
                const Icon = TYPE_ICONS[type];
                return (
                  <label
                    key={type}
                    className="relative flex cursor-pointer flex-col items-center gap-1 rounded-md border border-input bg-background p-3 text-center text-xs transition-colors hover:bg-accent has-[:checked]:border-primary has-[:checked]:bg-accent has-[:focus-visible]:border-primary has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-background"
                  >
                    <input type="radio" name="restaurantType" value={type} className="sr-only" />
                    <Icon className="h-5 w-5" aria-hidden="true" />
                    <span>{t(`restaurantType.${type}`)}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        </CardContent>

        <CardFooter className="flex flex-col gap-3 pt-4">
          <p className="text-xs text-muted-foreground">
            {t.rich("consentText", {
              cguLink: (chunks) => (
                <Link href="/cgu" className="underline underline-offset-4">
                  {chunks}
                </Link>
              ),
              privacyLink: (chunks) => (
                <Link href="/confidentialite" className="underline underline-offset-4">
                  {chunks}
                </Link>
              ),
            })}
          </p>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "…" : t("signupAction")}
          </Button>
          <p className="text-sm text-muted-foreground">
            {t("hasAccount")}{" "}
            <Link href="/login" className="underline underline-offset-4">
              {t("login")}
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
