import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * 404 globale. IMPORTANT : ce fallback est embarqué dans le flight payload de TOUTES les
 * routes (boundary not-found d'App Router) — le moindre appel dynamique ici redynamifie
 * chaque route du site. L'ancien `getTranslations("NotFound")` lisait les headers via
 * next-intl et cassait à lui seul le prerender de la landing statique (constaté au build).
 * Donc : zéro next-intl, zéro cookies/headers — texte bilingue en dur, comme global-error.
 */
export default function NotFound() {
  return (
    <main className="theme-app flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center text-foreground">
      <h1 className="mb-2 text-h1">404</h1>
      <p className="display mb-1 text-h3">Page introuvable — Page not found</p>
      <p className="mb-6 text-body text-muted-foreground">
        Cette page n&apos;existe pas ou a été déplacée. — This page doesn&apos;t exist or has moved.
      </p>
      <Button asChild>
        <Link href="/">Retour à l&apos;accueil — Back home</Link>
      </Button>
    </main>
  );
}
