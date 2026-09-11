import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type BaseProps = {
  /** Sous-titre en `text-lead` (registre éditorial, cf. docs/da-propagation-app-2026.md ét. 6). */
  description?: string;
  /**
   * Kicker mono au-dessus du titre — registre « data » de la DA, réservé aux pages de données
   * (stats, partage) et, depuis le lot 2, aux libellés de groupe du rail. Toujours SANS point
   * corail : le climax du viewport reste le CTA de la barre de publication.
   */
  eyebrow?: string;
  /** Actions alignées à droite du titre (desktop), sous le titre en étroit. */
  actions?: ReactNode;
  /** Visuel de 40 px posé à gauche du bloc titre (logo ou monogramme de l'établissement). */
  media?: ReactNode;
  /** Rangée de chips / liens secondaires sous le titre (template courant, lien public…). */
  meta?: ReactNode;
  className?: string;
};

/**
 * `title` et `headingSlot` sont exclusifs : soit l'en-tête pose lui-même le `<h1>`, soit
 * l'appelant fournit un nœud qui le pose.
 */
type Props = BaseProps &
  ({ title: string; headingSlot?: never } | { headingSlot: ReactNode; title?: never });

/**
 * En-tête de page du shell `/app` — source unique de la hiérarchie titre/sous-titre/kicker.
 * Les pages ne posent jamais leur `<h1>` à la main.
 *
 * `headingSlot` accepte un nœud qui fournit LUI-MÊME son `<h1 className="text-h2">` : le seul
 * consommateur autorisé est `EditorIdentityHeader`, dont le nom d'établissement bascule en
 * `<form>` d'édition — un formulaire ne peut pas vivre à l'intérieur d'un `<h1>`.
 *
 * Sans `media`, le DOM rendu est strictement celui d'avant l'ajout des slots : les six
 * consommateurs existants (stats, partage, apparence, traductions, réglages et la page
 * Abonnement) sont inchangés. Aucun état, aucun hook : le composant est rendu aussi bien depuis
 * une page serveur que depuis un composant client (`SubscriptionPageBody`).
 */
export function PageHeader({
  title,
  headingSlot,
  description,
  eyebrow,
  actions,
  media,
  meta,
  className,
}: Props) {
  const body = (
    <>
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        {headingSlot ?? <h1 className="text-h2">{title}</h1>}
        {actions}
      </div>
      {description && <p className="max-w-prose text-lead text-muted-foreground">{description}</p>}
      {meta && <div className="flex flex-wrap items-center gap-2 pt-1">{meta}</div>}
    </>
  );

  return (
    <header className={cn("space-y-1.5", className)}>
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      {media ? (
        <div className="flex items-center gap-3">
          <div className="shrink-0">{media}</div>
          <div className="min-w-0 flex-1 space-y-1.5">{body}</div>
        </div>
      ) : (
        body
      )}
    </header>
  );
}
