import { cn } from "@/lib/utils";

interface LandingSectionProps {
  id?: string;
  /** Relie la section à son titre (`<h2 id>`) — nom accessible de la région. */
  ariaLabelledBy?: string;
  className?: string;
  innerClassName?: string;
  children: React.ReactNode;
}

/**
 * Conteneur de section landing. Plus de `border-t` systématique (le « zèbre » de la v1) :
 * les sections claires partagent un canvas sand-50 continu, les frontières visuelles sont
 * les bascules de scène nuit — coupes franches et assumées (DA « Nuit de service »).
 * Rythme vertical par défaut py-12/16 (densité Linear, itéré avec Matt 2026-08-24) — généreux sans creuser de « trous » entre deux
 * sections claires adjacentes (leurs paddings s'additionnent) ; ajustable via innerClassName.
 */
export function LandingSection({
  id,
  ariaLabelledBy,
  className,
  innerClassName,
  children,
}: LandingSectionProps) {
  return (
    <section id={id} aria-labelledby={ariaLabelledBy} className={className}>
      <div className={cn("mx-auto max-w-6xl px-6 py-12 md:py-16", innerClassName)}>{children}</div>
    </section>
  );
}
