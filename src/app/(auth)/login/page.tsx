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
import { loginAction, resendConfirmationAction, type AuthState } from "@/app/(auth)/actions";

const initialState: AuthState = { error: null };

function parseCallbackError(): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const hash = window.location.hash;

  let error: string | null = null;
  if (hash.includes("error_code=otp_expired")) {
    error = "otp_expired";
  } else if (params.get("error") === "auth_callback_failed") {
    error = "auth_callback_failed";
  }

  if (params.has("error") || hash.includes("error")) {
    window.history.replaceState(null, "", "/login");
  }

  return error;
}

export default function LoginPage() {
  const t = useTranslations("Auth");
  const [state, action, isPending] = useActionState(loginAction, initialState);
  const [resendState, resendAction, isResending] = useActionState(
    resendConfirmationAction,
    initialState,
  );
  const callbackError = parseCallbackError();

  const showResendForm = callbackError === "otp_expired";

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{t("login")}</CardTitle>
        <CardDescription>Cartora</CardDescription>
      </CardHeader>

      {showResendForm && (
        <form action={resendAction}>
          <CardContent className="space-y-4">
            <p role="alert" className="text-sm text-destructive">
              {t("error.otp_expired")}
            </p>

            {resendState.success && (
              <p role="status" className="text-sm text-green-600">
                {t("error.resend_success")}
              </p>
            )}

            {resendState.error && (
              <p role="alert" className="text-sm text-destructive">
                {t(`error.${resendState.error}`)}
              </p>
            )}

            <p className="text-sm text-muted-foreground">{t("resendEmail")}</p>

            <div className="space-y-1">
              <Label htmlFor="resend-email">{t("email")}</Label>
              <Input id="resend-email" name="email" type="email" autoComplete="email" required />
            </div>

            <Button type="submit" className="w-full" disabled={isResending}>
              {isResending ? "…" : t("resendLink")}
            </Button>
          </CardContent>
        </form>
      )}

      {!showResendForm && (
        <form action={action}>
          <CardContent className="space-y-4">
            {callbackError && (
              <p role="alert" className="text-sm text-destructive">
                {t(`error.${callbackError}`)}
              </p>
            )}

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
      )}
    </Card>
  );
}
