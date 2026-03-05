"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
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
import { login, type AuthState } from "@/app/(auth)/actions";

const initialState: AuthState = { error: null };

export default function LoginPage() {
  const t = useTranslations("Auth");
  const [state, action, isPending] = useActionState(login, initialState);

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{t("login")}</CardTitle>
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
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="password">{t("password")}</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3 pt-4">
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "…" : t("loginAction")}
          </Button>
          <p className="text-sm text-muted-foreground">
            {t("noAccount")}{" "}
            <Link href="/signup" className="underline underline-offset-4">
              {t("signup")}
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
