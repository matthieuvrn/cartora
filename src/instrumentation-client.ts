// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

function hasConsent(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split(";").some((c) => c.trim().startsWith("cartora-consent=accepted"));
}

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1,
  environment: process.env.NODE_ENV ?? "development",
  release: process.env.VERCEL_GIT_COMMIT_SHA,
  sendDefaultPii: false,
  beforeSend(event) {
    return hasConsent() ? event : null;
  },
  beforeSendTransaction(event) {
    return hasConsent() ? event : null;
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
