import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  /** Icône lucide décorative (canard = structure) — jamais porteuse d'information. */
  icon: LucideIcon;
  /** Phrase d'explication ou d'attente. */
  description: string;
  /** Titre court, uniquement quand le vide mérite une hiérarchie (page Statistiques). */
  title?: string;
  /** Action de sortie, fournie déjà stylée par l'appelant (`Button variant="outline" size="sm"`). */
  action?: ReactNode;
  /** `section` = vide DANS une carte ou une section ; `page` = vide de niveau page. */
  variant?: "section" | "page";
  className?: string;
};

/**
 * État vide pointillé — SOURCE UNIQUE du motif (bordure pointillée, icône canard-400, phrase
 * centrée). Le même bloc était recopié dans l'éditeur, les sous-blocs « Aujourd'hui » et la page
 * Statistiques, avec trois espacements différents.
 *
 * Deux gabarits seulement : `section` (imbriqué, `rounded-lg p-6`) et `page` (`rounded-xl
 * px-4 py-10`). Composant pur, sans `"use client"` ni `useTranslations` : il reçoit des chaînes
 * DÉJÀ traduites, ce qui le rend utilisable côté serveur comme depuis un composant client.
 *
 * Exclusions volontaires — ces blocs ne sont PAS des états vides :
 * - `TranslationUpsell` : paywall PRO (titre h2, pastille, bouton plein, PricingModal) ;
 * - le teaser FREE de `TodaySection` : bandeau horizontal d'incitation ;
 * - `/app/partage` sans menu publié : le vide EST le contenu unique de la page, il garde une
 *   Card pleine. Le pointillé est réservé au vide qui apparaît DANS une page ayant d'autres
 *   contenus.
 *
 * Pas de `data-slot` (réservé aux primitives de `src/components/ui/`, ciblées par des règles CSS
 * non-layered qui écraseraient le `className` des appelants) et pas de région live intégrée : une
 * région annoncée doit être montée AVANT son contenu, donc posée par l'appelant (cf. la recherche
 * de `MenuEditor`, où le compteur de résultats et ce bloc partagent un seul conteneur `status`).
 */
export function EmptyState({
  icon: Icon,
  description,
  title,
  action,
  variant = "section",
  className,
}: Props) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 border border-dashed text-center",
        variant === "section" ? "rounded-lg p-6" : "rounded-xl px-4 py-10",
        className,
      )}
    >
      <Icon className="size-8 text-canard-400" strokeWidth={1.75} aria-hidden="true" />
      {title ? (
        <div className="flex flex-col gap-1">
          <p className="text-body font-medium">{title}</p>
          <p className="max-w-md text-body-sm text-muted-foreground">{description}</p>
        </div>
      ) : (
        <p className="max-w-md text-body-sm text-muted-foreground">{description}</p>
      )}
      {action}
    </div>
  );
}
