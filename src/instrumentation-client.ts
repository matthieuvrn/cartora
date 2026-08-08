// This file configures the initialization of Sentry on the client.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/
//
// Le SDK (~145 KB gzip — le plus gros poste JS de la landing) est chargé PARESSEUSEMENT
// via import() : il ne rejoint jamais le bundle initial. Sans consentement cookie,
// beforeSend droppait déjà tout événement ; on ne télécharge donc le SDK qu'une fois le
// consentement « accepted » (au idle si le cookie est déjà posé, sinon dès que la bannière
// émet CONSENT_CHANGE_EVENT). Les erreurs survenues avant l'init sont bufferisées via des
// listeners window et rejouées après, pour ne rien perdre pendant la fenêtre de chargement.

import { CONSENT_CHANGE_EVENT, CONSENT_COOKIE_NAME } from "@/domain/consent/ConsentTypes";

type SentryModule = typeof import("@sentry/nextjs");

let sentry: SentryModule | null = null;
let loading = false;

function hasConsent(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split(";")
    .some((c) => c.trim().startsWith(`${CONSENT_COOKIE_NAME}=accepted`));
}

// Buffer borné des erreurs pré-init (rejouées après le chargement du SDK).
const MAX_BUFFERED_ERRORS = 10;
const bufferedErrors: unknown[] = [];
function onWindowError(event: ErrorEvent) {
  if (bufferedErrors.length < MAX_BUFFERED_ERRORS)
    bufferedErrors.push(event.error ?? event.message);
}
function onUnhandledRejection(event: PromiseRejectionEvent) {
  if (bufferedErrors.length < MAX_BUFFERED_ERRORS) bufferedErrors.push(event.reason);
}
window.addEventListener("error", onWindowError);
window.addEventListener("unhandledrejection", onUnhandledRejection);

async function loadSentry() {
  if (sentry !== null || loading) return;
  loading = true;
  const mod = await import("@sentry/nextjs");
  mod.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1,
    environment: process.env.NODE_ENV ?? "development",
    release: process.env.VERCEL_GIT_COMMIT_SHA,
    sendDefaultPii: false,
    // Garde le double verrou : le consentement peut être retiré après le chargement du SDK.
    beforeSend(event) {
      return hasConsent() ? event : null;
    },
    beforeSendTransaction(event) {
      return hasConsent() ? event : null;
    },
  });
  // Les handlers globaux de Sentry prennent le relais : on retire les buffers pour
  // ne pas capturer deux fois, puis on rejoue ce qui s'est produit avant l'init.
  window.removeEventListener("error", onWindowError);
  window.removeEventListener("unhandledrejection", onUnhandledRejection);
  for (const error of bufferedErrors.splice(0)) mod.captureException(error);
  sentry = mod;
}

function scheduleLoadIfConsented() {
  if (!hasConsent()) return;
  const schedule =
    typeof window.requestIdleCallback === "function"
      ? window.requestIdleCallback.bind(window)
      : (cb: () => void) => window.setTimeout(cb, 2000);
  schedule(() => void loadSentry());
}

scheduleLoadIfConsented();
window.addEventListener(CONSENT_CHANGE_EVENT, scheduleLoadIfConsented);

export function onRouterTransitionStart(href: string, navigationType: string) {
  sentry?.captureRouterTransitionStart(href, navigationType);
}
