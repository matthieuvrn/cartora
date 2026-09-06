import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  /** Sous-titre en `text-lead` (registre éditorial, cf. docs/da-propagation-app-2026.md ét. 6). */
  description?: string;
  /**
   * Kicker mono au-dessus du titre — réservé aux pages « data » (stats, partage) : troisième
   * registre typographique de la DA. Sans point corail : le climax du viewport reste le CTA de
   * la barre de publication.
   */
  eyebrow?: string;
  /** Actions alignées à droite du titre (desktop), sous le titre en étroit. */
  actions?: ReactNode;
  className?: string;
};

/**
 * En-tête de page du shell `/app` — source unique de la hiérarchie titre/sous-titre/kicker
 * (Server Component, aucun état). Les pages ne posent plus leur `<h1>` à la main.
 */
export function PageHeader({ title, description, eyebrow, actions, className }: Props) {
  return (
    <header className={cn("space-y-1.5", className)}>
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <h1 className="text-h2">{title}</h1>
        {actions}
      </div>
      {description && <p className="max-w-prose text-lead text-muted-foreground">{description}</p>}
    </header>
  );
}
