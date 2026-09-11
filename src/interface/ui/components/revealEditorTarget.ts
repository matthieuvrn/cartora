import { prefersReducedMotion } from "@/lib/utils";
import { scrollToBelowStickyBars } from "./editorAnchors";

export type RevealMode = "item" | "category";

/** Nombre de frames d'attente — couvre la fin d'animation du dialog Radix et le re-rendu. */
const MAX_ATTEMPTS = 30;

/**
 * Amène une cible de l'éditeur à l'écran et lui donne le focus, en attendant qu'elle existe ET
 * soit visible : une rangée d'une catégorie repliée est dans le DOM mais `display:none` jusqu'au
 * re-rendu qui la déplie, et vider la recherche re-monte les ancres. On retente donc en rAF, au
 * plus {@link MAX_ATTEMPTS} frames.
 *
 * `onExhausted` est appelé si la cible n'est jamais apparue (rangée en fenêtre « Annuler »,
 * par exemple) : l'appelant y pose un focus de repli déterministe — jamais `<body>`.
 *
 * Renvoie une fonction d'annulation (démontage, nouvelle sélection).
 */
export function revealEditorTarget(
  elementId: string,
  mode: RevealMode,
  onExhausted?: () => void,
): () => void {
  let raf = 0;
  let attempts = 0;

  const tryReveal = () => {
    const el = document.getElementById(elementId);
    if (el && el.getClientRects().length > 0) {
      if (mode === "item") {
        el.scrollIntoView({
          block: "center",
          behavior: prefersReducedMotion() ? "auto" : "smooth",
        });
      } else {
        // Catégorie : défilement manuel sous les barres collantes (jamais `scrollIntoView`,
        // cf. le docblock d'`editorAnchors`).
        scrollToBelowStickyBars(el);
      }
      el.focus({ preventScroll: true });
      return;
    }
    if (attempts++ < MAX_ATTEMPTS) {
      raf = requestAnimationFrame(tryReveal);
      return;
    }
    onExhausted?.();
  };

  tryReveal();
  return () => cancelAnimationFrame(raf);
}
