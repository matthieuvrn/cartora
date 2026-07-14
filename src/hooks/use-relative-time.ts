"use client";

import { useEffect, useState } from "react";
import { formatRelativeTime } from "@/lib/relative-time";

/**
 * Libellé relatif (« il y a 2 h ») rafraîchi chaque minute. Calculé APRÈS le mount
 * pour éviter tout mismatch d'hydratation (serveur et client n'ont pas la même horloge
 * à la milliseconde). Renvoie `null` au 1er paint — l'appelant affiche alors un
 * placeholder discret, ou rien. `iso === null` ⇒ toujours `null` (état sans date, ex.
 * brouillon jamais publié).
 */
export function useRelativeTime(iso: string | null, locale: string): string | null {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    const update = () => setLabel(iso ? formatRelativeTime(iso, locale) : null);
    update();
    if (!iso) return;
    const id = window.setInterval(update, 60_000);
    return () => window.clearInterval(id);
  }, [iso, locale]);

  return label;
}
