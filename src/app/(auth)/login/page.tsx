"use client";

import { useActionState, useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Logo } from "@/interface/ui/components/Logo";
import { loginAction, resendConfirmationAction, type AuthState } from "@/app/(auth)/actions";

const initialState: AuthState = { error: null };

type CallbackError = "otp_expired" | "auth_callback_failed";

/** `?error=auth_callback_failed` (posé par /auth/callback) ou `#error_code=otp_expired` (Supabase). */
function readCallbackError(): CallbackError | null {
  const params = new URLSearchParams(window.location.search);
  const hash = window.location.hash;
  if (hash.includes("error_code=otp_expired")) return "otp_expired";
  if (params.get("error") === "auth_callback_failed") return "auth_callback_failed";
  return null;
}

/**
 * Store minimal pour `useSyncExternalStore` : l'URL est lue UNE fois côté client et la valeur
 * figée pour toute la vie du montage — le nettoyage d'URL qui suit ne fait donc pas
 * disparaître l'alerte. Snapshot serveur = null : le HTML SSR et le premier rendu client
 * coïncident, React re-rend ensuite avec la valeur réelle (zéro divergence d'hydratation).
 */
function createCallbackErrorStore() {
  let value: CallbackError | null | undefined;
  return {
    subscribe: () => () => {},
    getSnapshot: () => {
      if (value === undefined) value = readCallbackError();
      return value;
    },
    getServerSnapshot: (): CallbackError | null => null,
  };
}

/**
 * Même recette que `useHydrated` (store externe, pas de setState-in-effect) et que
 * `BillingUrlFeedback` pour le nettoyage d'URL. Surtout pas de lecture pendant le rendu
 * avec `replaceState` en effet de bord : le double rendu StrictMode consommait le paramètre
 * avant le rendu commité → l'erreur n'était jamais affichée (recette 2026-09-04).
 */
function useCallbackError(): CallbackError | null {
  const [store] = useState(createCallbackErrorStore);
  const error = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);

  useEffect(() => {
    const { search, hash } = window.location;
    if (new URLSearchParams(search).has("error") || hash.includes("error")) {
      window.history.replaceState(null, "", "/login");
    }
  }, []);

  return error;
}

export default function LoginPage() {
  const t = useTranslations("Auth");
  const [state, action, isPending] = useActionState(loginAction, initialState);
  const [resendState, resendAction, isResending] = useActionState(
    resendConfirmationAction,
    initialState,
  );
  const callbackError = useCallbackError();

  const showResendForm = callbackError === "otp_expired";

  return (
    // `shadow-frame!` : cadre élévation+halo des scènes nuit ; important requis car la règle
    // non-layered `[data-slot="card"]` (globals.css) écrase sinon toute utility shadow-*.
    <Card className="w-full max-w-sm shadow-frame!">
      <CardHeader>
        {/* Lockup (mark canard-300 + wordmark porcelaine via les tokens de la scène nuit) à la
            place de l'ancien eyebrow « ● Cartora » : le point corail du mark reprend celui de
            l'eyebrow. Lien vers la landing, comme le header. */}
        <Link href="/" aria-label="Cartora" className="mb-1 inline-flex w-fit rounded-sm">
          <Logo className="h-6" />
        </Link>
        <CardTitle className="display">{t("login")}</CardTitle>
      </CardHeader>

      {showResendForm && (
        <form action={resendAction}>
          <CardContent className="space-y-4">
            <p role="alert" className="text-sm text-destructive">
              {t("error.otp_expired")}
            </p>

            {resendState.success && (
              <p role="status" className="text-sm text-success">
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
            <Button type="submit" variant="cta" className="w-full" disabled={isPending}>
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
