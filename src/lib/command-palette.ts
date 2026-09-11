import { matchesQuery, normalizeForSearch } from "./text-search";

/**
 * Logique de la palette de commandes ⌘K de l'éditeur : construction des entrées, filtrage,
 * classement, plafonds et navigation d'index. Module PUR (aucun import framework, aucun accès
 * DOM) — c'est ce qui le rend testable unitairement (scope vitest `src/lib`) et ce qui a rendu
 * une dépendance `cmdk` inutile : la coquille visuelle vit dans `CommandPalette.tsx`.
 */

export type PaletteKind = "item" | "category" | "page";

/**
 * Données brutes de la palette. Les libellés d'items arrivent DÉJÀ résolus (`resolveText` est
 * appelé par le composant) : ce module ignore tout du multilingue S4.
 */
export type PaletteSource = {
  categories: readonly {
    id: string;
    name: string;
    items: readonly { id: string; name: string; description: string; isAvailable: boolean }[];
  }[];
  pages: readonly { key: string; href: string; label: string }[];
  /** Page courante, exclue des résultats (dans l'éditeur : "/app"). */
  currentPath: string;
};

/** `id` = `${kind}:${identifiant brut}` — unique tous genres confondus (clé React, id DOM). */
export type PaletteEntry =
  | {
      kind: "item";
      id: string;
      label: string;
      keywords: readonly string[];
      itemId: string;
      categoryId: string;
      categoryName: string;
      isAvailable: boolean;
    }
  | {
      kind: "category";
      id: string;
      label: string;
      keywords: readonly string[];
      categoryId: string;
      itemCount: number;
    }
  | {
      kind: "page";
      id: string;
      label: string;
      keywords: readonly string[];
      href: string;
      navKey: string;
    };

export type PaletteGroup = { kind: PaletteKind; entries: PaletteEntry[] };

/**
 * Plafonds par groupe. Les catégories montent à 12 (une carte peut en compter 50 et la liste à
 * requête vide n'affiche aucun indice de troncature) ; les items restent bas (jusqu'à 100 par
 * catégorie, la palette n'est pas une liste de navigation exhaustive).
 */
export const PALETTE_LIMITS: Readonly<Record<PaletteKind, number>> = {
  item: 8,
  category: 12,
  page: 7,
};

export type PaletteNavKey = "ArrowDown" | "ArrowUp" | "Home" | "End";

/**
 * Aplatit la source en entrées : catégories (ordre de la carte), puis items (ordre catégorie puis
 * ordre interne), puis pages en excluant la page courante.
 */
export function buildPaletteEntries(source: PaletteSource): PaletteEntry[] {
  const entries: PaletteEntry[] = [];

  for (const category of source.categories) {
    entries.push({
      kind: "category",
      id: `category:${category.id}`,
      label: category.name,
      keywords: [],
      categoryId: category.id,
      itemCount: category.items.length,
    });
  }

  for (const category of source.categories) {
    for (const item of category.items) {
      entries.push({
        kind: "item",
        id: `item:${item.id}`,
        label: item.name,
        // Mots-clés : la catégorie porteuse et la description — « entr » trouve les entrées.
        keywords: [category.name, item.description].filter((value) => value.trim().length > 0),
        itemId: item.id,
        categoryId: category.id,
        categoryName: category.name,
        isAvailable: item.isAvailable,
      });
    }
  }

  for (const page of source.pages) {
    if (page.href === source.currentPath) continue;
    entries.push({
      kind: "page",
      id: `page:${page.key}`,
      label: page.label,
      keywords: [],
      href: page.href,
      navKey: page.key,
    });
  }

  return entries;
}

const EMPTY_QUERY_KINDS: readonly PaletteKind[] = ["category", "page"];
const QUERY_KINDS: readonly PaletteKind[] = ["item", "category", "page"];

/**
 * Groupe et filtre les entrées pour une requête donnée.
 *
 * Requête vide ⇒ « Catégories » puis « Pages » (jamais tous les items : jusqu'à 50 × 100).
 * Requête non vide ⇒ « Plats », « Catégories », « Pages » ; une entrée matche sur son libellé ou
 * l'un de ses mots-clés (insensible aux accents, cf. `matchesQuery`). Dans chaque groupe, les
 * libellés qui COMMENCENT par la requête passent devant, l'ordre relatif étant préservé (deux
 * passes concaténées, jamais un `sort` à comparateur instable). Les groupes vides sont omis.
 */
export function filterPaletteEntries(
  entries: readonly PaletteEntry[],
  query: string,
): PaletteGroup[] {
  const q = normalizeForSearch(query);
  const kinds = q === "" ? EMPTY_QUERY_KINDS : QUERY_KINDS;

  const groups: PaletteGroup[] = [];
  for (const kind of kinds) {
    const matching = entries.filter(
      (entry) =>
        entry.kind === kind &&
        (q === "" ||
          matchesQuery(entry.label, query) ||
          entry.keywords.some((keyword) => matchesQuery(keyword, query))),
    );
    const ranked =
      q === ""
        ? matching
        : [
            ...matching.filter((entry) => normalizeForSearch(entry.label).startsWith(q)),
            ...matching.filter((entry) => !normalizeForSearch(entry.label).startsWith(q)),
          ];
    const capped = ranked.slice(0, PALETTE_LIMITS[kind]);
    if (capped.length > 0) groups.push({ kind, entries: capped });
  }

  return groups;
}

/**
 * Index de l'option active après une touche de navigation (pattern APG « combobox with listbox »).
 * Liste vide ⇒ -1 (aucune option active, donc pas d'`aria-activedescendant`).
 */
export function nextActiveIndex(current: number, key: PaletteNavKey, total: number): number {
  if (total <= 0) return -1;
  switch (key) {
    case "ArrowDown":
      return (current + 1) % total;
    case "ArrowUp":
      return current <= 0 ? total - 1 : current - 1;
    case "Home":
      return 0;
    case "End":
      return total - 1;
  }
}

/** Plateforme Apple ⇒ libellé « ⌘K » plutôt que « Ctrl K » (lu après montage, jamais au SSR). */
export function isApplePlatform(userAgent: string): boolean {
  return /\b(Mac|iPhone|iPad|iPod)\b/.test(userAgent);
}
