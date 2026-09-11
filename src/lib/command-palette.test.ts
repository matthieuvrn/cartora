import { describe, it, expect } from "vitest";
import {
  buildPaletteEntries,
  filterPaletteEntries,
  isApplePlatform,
  nextActiveIndex,
  type PaletteEntry,
  type PaletteSource,
} from "./command-palette";

const PAGES = [
  { key: "menu", href: "/app", label: "Ma carte" },
  { key: "stats", href: "/app/stats", label: "Statistiques" },
  { key: "apparence", href: "/app/apparence", label: "Apparence" },
  { key: "traductions", href: "/app/traductions", label: "Traductions" },
  { key: "partage", href: "/app/partage", label: "Partage" },
  { key: "abonnement", href: "/app/abonnement", label: "Abonnement" },
  { key: "reglages", href: "/app/reglages", label: "Réglages" },
];

const SOURCE: PaletteSource = {
  categories: [
    {
      id: "c1",
      name: "Entrées",
      items: [
        { id: "i1", name: "Salade César", description: "Poulet, parmesan", isAvailable: true },
        { id: "i2", name: "Crème de potiron", description: "", isAvailable: false },
      ],
    },
    {
      id: "c2",
      name: "Plats",
      items: [{ id: "i3", name: "Bœuf bourguignon", description: "", isAvailable: true }],
    },
  ],
  pages: PAGES,
  currentPath: "/app",
};

const CATEGORY_ENTRIES: PaletteEntry[] = [
  {
    kind: "category",
    id: "category:c1",
    label: "Entrées",
    keywords: [],
    categoryId: "c1",
    itemCount: 2,
  },
  {
    kind: "category",
    id: "category:c2",
    label: "Plats",
    keywords: [],
    categoryId: "c2",
    itemCount: 1,
  },
];

const ITEM_ENTRIES: PaletteEntry[] = [
  {
    kind: "item",
    id: "item:i1",
    label: "Salade César",
    keywords: ["Entrées", "Poulet, parmesan"],
    itemId: "i1",
    categoryId: "c1",
    categoryName: "Entrées",
    isAvailable: true,
  },
  {
    kind: "item",
    id: "item:i2",
    label: "Crème de potiron",
    keywords: ["Entrées"],
    itemId: "i2",
    categoryId: "c1",
    categoryName: "Entrées",
    isAvailable: false,
  },
  {
    kind: "item",
    id: "item:i3",
    label: "Bœuf bourguignon",
    keywords: ["Plats"],
    itemId: "i3",
    categoryId: "c2",
    categoryName: "Plats",
    isAvailable: true,
  },
];

const PAGE_ENTRIES: PaletteEntry[] = PAGES.filter((p) => p.href !== "/app").map((p) => ({
  kind: "page",
  id: `page:${p.key}`,
  label: p.label,
  keywords: [],
  href: p.href,
  navKey: p.key,
}));

describe("buildPaletteEntries", () => {
  it("returns categories, then items, then pages minus the current one", () => {
    expect(buildPaletteEntries(SOURCE)).toEqual([
      ...CATEGORY_ENTRIES,
      ...ITEM_ENTRIES,
      ...PAGE_ENTRIES,
    ]);
  });

  it("excludes the current page whatever it is", () => {
    const entries = buildPaletteEntries({ ...SOURCE, currentPath: "/app/stats" });
    const hrefs = entries.flatMap((entry) => (entry.kind === "page" ? [entry.href] : []));
    expect(hrefs).toEqual([
      "/app",
      "/app/apparence",
      "/app/traductions",
      "/app/partage",
      "/app/abonnement",
      "/app/reglages",
    ]);
  });
});

describe("filterPaletteEntries", () => {
  const entries = buildPaletteEntries(SOURCE);

  it("lists categories then pages (never items) on an empty query", () => {
    expect(filterPaletteEntries(entries, "")).toEqual([
      { kind: "category", entries: CATEGORY_ENTRIES },
      { kind: "page", entries: PAGE_ENTRIES },
    ]);
  });

  it("treats a blank query as empty", () => {
    expect(filterPaletteEntries(entries, "   ")).toEqual(filterPaletteEntries(entries, ""));
  });

  it("matches labels regardless of case and diacritics", () => {
    expect(filterPaletteEntries(entries, "creme")).toEqual([
      { kind: "item", entries: [ITEM_ENTRIES[1]] },
    ]);
  });

  it("matches items through their category keyword and orders groups item → category → page", () => {
    expect(filterPaletteEntries(entries, "entr")).toEqual([
      { kind: "item", entries: [ITEM_ENTRIES[0], ITEM_ENTRIES[1]] },
      { kind: "category", entries: [CATEGORY_ENTRIES[0]] },
    ]);
  });

  it("matches items through their description keyword", () => {
    expect(filterPaletteEntries(entries, "parmesan")).toEqual([
      { kind: "item", entries: [ITEM_ENTRIES[0]] },
    ]);
  });

  it("returns no group at all when nothing matches", () => {
    expect(filterPaletteEntries(entries, "zzz")).toEqual([]);
  });

  it("ranks prefix matches first while keeping a stable order", () => {
    const rankingEntries = buildPaletteEntries({
      categories: [
        {
          id: "c1",
          name: "Desserts",
          items: [
            { id: "i1", name: "Tarte aux poires", description: "", isAvailable: true },
            { id: "i2", name: "Poires pochées", description: "", isAvailable: true },
          ],
        },
      ],
      pages: [],
      currentPath: "/app",
    });

    expect(
      filterPaletteEntries(rankingEntries, "poir").flatMap((group) =>
        group.entries.map((entry) => entry.label),
      ),
    ).toEqual(["Poires pochées", "Tarte aux poires"]);

    // Aucun préfixe ne matche ⇒ ordre d'origine conservé (tri stable).
    expect(
      filterPaletteEntries(rankingEntries, "s").flatMap((group) =>
        group.entries.map((entry) => entry.label),
      ),
    ).toEqual(["Tarte aux poires", "Poires pochées", "Desserts"]);
  });

  it("caps each group at its limit", () => {
    const large = buildPaletteEntries({
      categories: Array.from({ length: 14 }, (_, i) => ({
        id: `c${i + 1}`,
        name: `Cat ${i + 1}`,
        items: [{ id: `i${i + 1}`, name: `Plat ${i + 1}`, description: "", isAvailable: true }],
      })),
      pages: PAGES,
      currentPath: "/app",
    });

    const groups = filterPaletteEntries(large, "a");
    expect(groups.map((group) => [group.kind, group.entries.length])).toEqual([
      ["item", 8],
      ["category", 12],
      // 7 pages moins la page courante : le plafond de 7 n'est jamais atteint ici.
      ["page", 6],
    ]);
    expect(groups[0].entries[0].label).toBe("Plat 1");
    expect(groups[1].entries[0].label).toBe("Cat 1");
  });
});

describe("nextActiveIndex", () => {
  it("moves down and wraps", () => {
    expect(nextActiveIndex(0, "ArrowDown", 3)).toBe(1);
    expect(nextActiveIndex(2, "ArrowDown", 3)).toBe(0);
    expect(nextActiveIndex(-1, "ArrowDown", 3)).toBe(0);
  });

  it("moves up and wraps", () => {
    expect(nextActiveIndex(0, "ArrowUp", 3)).toBe(2);
    expect(nextActiveIndex(1, "ArrowUp", 3)).toBe(0);
  });

  it("jumps to the first and last option", () => {
    expect(nextActiveIndex(2, "Home", 3)).toBe(0);
    expect(nextActiveIndex(0, "End", 3)).toBe(2);
  });

  it("returns -1 when there is no option", () => {
    expect(nextActiveIndex(0, "ArrowDown", 0)).toBe(-1);
    expect(nextActiveIndex(0, "End", 0)).toBe(-1);
  });
});

describe("isApplePlatform", () => {
  it("detects Apple user agents", () => {
    expect(isApplePlatform("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)")).toBe(true);
    expect(isApplePlatform("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)")).toBe(true);
    expect(isApplePlatform("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)")).toBe(true);
  });

  it("rejects the others", () => {
    expect(isApplePlatform("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toBe(false);
    expect(isApplePlatform("Mozilla/5.0 (X11; Linux x86_64)")).toBe(false);
    expect(isApplePlatform("")).toBe(false);
  });
});
