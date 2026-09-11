import { describe, expect, it } from "vitest";
import {
  APP_NAV_GROUP_ORDER,
  APP_NAV_ITEMS,
  MOBILE_TAB_ITEMS,
  groupAppNavItems,
  isAppNavItemActive,
  isMoreSectionActive,
  type AppNavItem,
} from "./app-nav";

describe("APP_NAV_ITEMS", () => {
  it("fige l'ordre et la forme exacte des sept entrées", () => {
    expect(APP_NAV_ITEMS).toEqual([
      { key: "menu", href: "/app", group: "carte", exact: true, mobileTab: true },
      { key: "stats", href: "/app/stats", group: "diffusion", exact: false, mobileTab: true },
      {
        key: "apparence",
        href: "/app/apparence",
        group: "diffusion",
        exact: false,
        mobileTab: false,
      },
      {
        key: "traductions",
        href: "/app/traductions",
        group: "diffusion",
        exact: false,
        mobileTab: false,
      },
      { key: "partage", href: "/app/partage", group: "diffusion", exact: false, mobileTab: true },
      {
        key: "abonnement",
        href: "/app/abonnement",
        group: "compte",
        exact: false,
        mobileTab: false,
      },
      { key: "reglages", href: "/app/reglages", group: "compte", exact: false, mobileTab: false },
    ]);
  });

  it("ne marque `exact` que sur l'accueil de l'éditeur", () => {
    expect(APP_NAV_ITEMS.filter((i) => i.exact).map((i) => i.key)).toEqual(["menu"]);
  });

  it("expose des routes uniques, toutes sous /app", () => {
    const hrefs = APP_NAV_ITEMS.map((i) => i.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    expect(hrefs.every((href) => href === "/app" || href.startsWith("/app/"))).toBe(true);
  });
});

describe("MOBILE_TAB_ITEMS", () => {
  it("retient Carte, Statistiques et Partage, dans l'ordre de la nav", () => {
    expect(MOBILE_TAB_ITEMS.map((i) => i.key)).toEqual(["menu", "stats", "partage"]);
  });

  it("ne contient que des entrées de APP_NAV_ITEMS (mêmes références)", () => {
    expect(MOBILE_TAB_ITEMS.filter((i) => !APP_NAV_ITEMS.includes(i))).toEqual([]);
  });
});

describe("isAppNavItemActive", () => {
  const menu = { href: "/app", exact: true };
  const stats = { href: "/app/stats", exact: false };

  it("allume une entrée exacte sur sa seule route", () => {
    expect(isAppNavItemActive("/app", menu)).toBe(true);
    expect(isAppNavItemActive("/app/stats", menu)).toBe(false);
  });

  it("allume une entrée non exacte sur ses sous-chemins", () => {
    expect(isAppNavItemActive("/app/stats", stats)).toBe(true);
    expect(isAppNavItemActive("/app/stats/details", stats)).toBe(true);
  });

  it("exige une frontière de segment (pas de préfixe nu)", () => {
    expect(isAppNavItemActive("/app/statsX", stats)).toBe(false);
    expect(isAppNavItemActive("/app/", menu)).toBe(false);
  });
});

describe("isMoreSectionActive", () => {
  it("est vrai sur une section absente des onglets", () => {
    expect(isMoreSectionActive("/app/reglages")).toBe(true);
    expect(isMoreSectionActive("/app/abonnement")).toBe(true);
    expect(isMoreSectionActive("/app/traductions")).toBe(true);
  });

  it("est faux sur une section portée par un onglet", () => {
    expect(isMoreSectionActive("/app")).toBe(false);
    expect(isMoreSectionActive("/app/stats")).toBe(false);
    expect(isMoreSectionActive("/app/partage")).toBe(false);
  });
});

describe("groupAppNavItems", () => {
  it("range les sept entrées dans les trois groupes, ordre de nav conservé", () => {
    expect(groupAppNavItems(APP_NAV_ITEMS)).toEqual([
      { group: "carte", items: [APP_NAV_ITEMS[0]] },
      {
        group: "diffusion",
        items: [APP_NAV_ITEMS[1], APP_NAV_ITEMS[2], APP_NAV_ITEMS[3], APP_NAV_ITEMS[4]],
      },
      { group: "compte", items: [APP_NAV_ITEMS[5], APP_NAV_ITEMS[6]] },
    ]);
  });

  it("suit APP_NAV_GROUP_ORDER quel que soit l'ordre d'entrée, et omet les groupes vides", () => {
    const entries: Pick<AppNavItem, "group">[] = [{ group: "compte" }, { group: "carte" }];
    expect(groupAppNavItems(entries)).toEqual([
      { group: "carte", items: [{ group: "carte" }] },
      { group: "compte", items: [{ group: "compte" }] },
    ]);
    expect(APP_NAV_GROUP_ORDER).toEqual(["carte", "diffusion", "compte"]);
  });
});
