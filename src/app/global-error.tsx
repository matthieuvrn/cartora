"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

/**
 * Boundary d'erreur top-level. Rendu en dehors du tree i18n, donc on ne peut pas
 * utiliser `useTranslations`. Fallback bilingue FR/EN minimaliste, brandé Cartora.
 *
 * Ne s'affiche que pour les erreurs non rattrapées par les error boundaries
 * intermédiaires (`(app)/app/error.tsx`, etc.). En pratique : crash de layout root,
 * de provider, ou erreur côté `proxy.ts` / `instrumentation`.
 */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    // `digest` est la clé de dédup Sentry pour corréler client ↔ serveur en App Router.
    Sentry.captureException(error, { tags: { digest: error.digest ?? null } });
  }, [error]);

  return (
    <html lang="fr">
      <body
        style={{
          minHeight: "100vh",
          margin: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, -apple-system, sans-serif",
          background: "#fafafa",
          color: "#111",
          padding: "1.5rem",
        }}
      >
        <main style={{ maxWidth: "32rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>
            Une erreur inattendue est survenue
          </h1>
          <p style={{ fontSize: "0.95rem", color: "#555", marginBottom: "1rem" }}>
            An unexpected error occurred. Notre équipe a été notifiée — our team has been notified.
          </p>
          {error.digest && (
            <p style={{ fontSize: "0.75rem", color: "#888", fontFamily: "monospace" }}>
              ref: {error.digest}
            </p>
          )}
          <div style={{ marginTop: "1.5rem" }}>
            {/* `global-error` est rendu en dehors du tree Next, donc `next/link`
                ne fonctionne pas (pas de Router). Un `<a>` natif est correct ici —
                on désactive la règle ESLint locale. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              style={{
                display: "inline-block",
                padding: "0.5rem 1rem",
                background: "#111",
                color: "#fff",
                borderRadius: "0.375rem",
                textDecoration: "none",
                fontSize: "0.875rem",
              }}
            >
              Retour à l&apos;accueil — Back home
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
