"use client";

import { useActionState } from "react";
import Link from "next/link";
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

export default function SignupPage() {
  const t = useTranslations("Auth");
  const [state, action, isPending] = useActionState(signupAction, initialState);

  if (state.success) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t("checkEmailTitle")}</CardTitle>
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
        <CardTitle>{t("signup")}</CardTitle>
        <CardDescription>Cartora</CardDescription>
      </CardHeader>

      <form action={action}>
        <CardContent className="space-y-4">
          {state.error && (
            <p role="alert" className="text-sm text-destructive">
              {t(`error.${state.error}`)}
            </p>
          )}

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
                    className="relative flex cursor-pointer flex-col items-center gap-1 rounded-md border border-input bg-background p-3 text-center text-xs transition-colors hover:bg-accent has-[:checked]:border-primary has-[:checked]:bg-accent"
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
