"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { cn, prefersReducedMotion } from "@/lib/utils";

/** Ancre stable par catégorie — posée par CategorySection, ciblée par les chips. */
export function categoryAnchorId(categoryId: string): string {
  return `cat-${categoryId}`;
}

type Props = {
  categories: { id: string; name: string }[];
  className?: string;
};

// Décalage haut (px) : hauteur approximative des barres collantes (topbar mobile
// + chips, ou toolbar desktop) sous lesquelles une catégorie doit se poser.
// SERT À LA FOIS de cible de défilement au clic ET de ligne de détection du
// scroll-spy — c'est le fait de partager la même valeur qui garantit que la
// catégorie sur laquelle on vient de cliquer est bien celle qui s'active
// (indépendamment de sa valeur exacte, qui ne change que le rendu cosmétique).
const HEADER_OFFSET = 116;

/**
 * Navigation par chips avec scroll-spy. Le défilement au clic est fait « à la
 * main » (`window.scrollTo` avec décalage explicite) plutôt que via
 * `scrollIntoView`, pour NE PAS empiler le `scroll-padding-top: 4rem` global
 * avec un `scroll-mt` — combinaison qui posait la catégorie trop bas et faisait
 * détecter la catégorie précédente. Actif = dernière catégorie dont le haut a
 * franchi `HEADER_OFFSET`.
 */
export function CategoryChipBar({ categories, className }: Props) {
  const t = useTranslations("Dashboard");
  const [activeId, setActiveId] = useState<string | null>(categories[0]?.id ?? null);
  const chipRefs = useRef(new Map<string, HTMLButtonElement>());
  // Verrou le temps d'un défilement déclenché par un clic : empêche l'actif de
  // « traverser » les catégories intermédiaires (et la rangée de chips de sauter).
  const scrollLock = useRef(false);
  const lockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => clearTimeout(lockTimer.current ?? undefined), []);

  useEffect(() => {
    let raf = 0;
    function computeActive() {
      raf = 0;
      if (scrollLock.current) return;
      // Ancres dans l'ordre du DOM : on garde la dernière dont le haut est
      // au-dessus de la ligne, puis on s'arrête à la première encore en dessous.
      let current = categories[0]?.id ?? null;
      for (const c of categories) {
        const el = document.getElementById(categoryAnchorId(c.id));
        if (!el) continue;
        if (el.getBoundingClientRect().top <= HEADER_OFFSET + 2) current = c.id;
        else break;
      }
      if (current) setActiveId(current);
    }
    function onScroll() {
      if (raf) return;
      raf = requestAnimationFrame(computeActive);
    }
    computeActive();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [categories]);

  // Garde la chip active visible dans sa rangée horizontale scrollable.
  useEffect(() => {
    if (!activeId) return;
    chipRefs.current.get(activeId)?.scrollIntoView({ inline: "nearest", block: "nearest" });
  }, [activeId]);

  function handleChipClick(id: string) {
    const el = document.getElementById(categoryAnchorId(id));
    if (!el) return;
    setActiveId(id);
    // Verrouille le scroll-spy pendant l'animation (~700 ms) pour figer l'actif
    // sur la cible sans clignoter à travers les intermédiaires.
    scrollLock.current = true;
    clearTimeout(lockTimer.current ?? undefined);
    lockTimer.current = setTimeout(() => {
      scrollLock.current = false;
    }, 700);
    const top = el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
    window.scrollTo({ top, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }

  if (categories.length < 2) return null;

  return (
    <nav aria-label={t("categoryNav.label")} className={cn("min-w-0", className)}>
      <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {categories.map((c) => {
          const isActive = activeId === c.id;
          return (
            <button
              key={c.id}
              ref={(el) => {
                if (el) chipRefs.current.set(c.id, el);
                else chipRefs.current.delete(c.id);
              }}
              type="button"
              onClick={() => handleChipClick(c.id)}
              aria-current={isActive ? "true" : undefined}
              className={cn(
                "shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-sm transition-colors",
                isActive
                  ? "border-transparent bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              {c.name}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
