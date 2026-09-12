import type { MenuLocale } from "@/domain/menu/MenuLocale";

/**
 * Extrait de la démo dans les 5 langues (section Démo, sélecteur CSS-only « La démo en 5
 * langues »). Copie VERBATIM de `scripts/seed-demo.ts` (`DEMO_DAILY_DISHES[0]` = Blanquette,
 * `DEMO_FORMULAS[0]` = Formule du midi) — re-synchroniser si le seed change.
 *
 * Contenu RESTAURANT codé en dur, comme les plats FR de `HeroLiveDemo` — jamais dans
 * `messages/*.json` (hors test de parité, hors chrome). Prix omis : contenu restaurant, aucun
 * nombre que le plan n'a pas demandé. Ni la Blanquette ni la formule ne font partie des 5 plats
 * épinglés du hero — le contrat hero ↔ seed est intact.
 */
export type DemoExcerptEntry = { name: string; description: string };
export type DemoExcerpt = { dish: DemoExcerptEntry; formula: DemoExcerptEntry };

export const DEMO_EXCERPT: Record<MenuLocale, DemoExcerpt> = {
  fr: {
    dish: {
      name: "Blanquette de veau à l'ancienne",
      description: "Veau fermier mijoté, sauce crémeuse aux champignons, riz pilaf.",
    },
    formula: {
      name: "Formule du midi",
      description:
        "Entrée au choix + plat du jour\nou plat du jour + dessert au choix\nCafé offert, du mardi au vendredi midi",
    },
  },
  en: {
    dish: {
      name: "Traditional veal blanquette",
      description: "Slow-cooked farm veal in a creamy mushroom sauce, pilaf rice.",
    },
    formula: {
      name: "Lunch set menu",
      description:
        "Starter of your choice + dish of the day\nor dish of the day + dessert of your choice\nCoffee included, Tuesday to Friday lunchtime",
    },
  },
  es: {
    dish: {
      name: "Blanqueta de ternera a la antigua",
      description: "Ternera de granja guisada, salsa cremosa de champiñones, arroz pilaf.",
    },
    formula: {
      name: "Menú del mediodía",
      description:
        "Entrante a elegir + plato del día\no plato del día + postre a elegir\nCafé incluido, de martes a viernes al mediodía",
    },
  },
  de: {
    dish: {
      name: "Kalbsblanquette nach alter Art",
      description: "Geschmortes Bauernkalb in cremiger Champignonsauce, Pilawreis.",
    },
    formula: {
      name: "Mittagsmenü",
      description:
        "Vorspeise nach Wahl + Tagesgericht\noder Tagesgericht + Dessert nach Wahl\nKaffee inklusive, Dienstag bis Freitag mittags",
    },
  },
  it: {
    dish: {
      name: "Blanquette di vitello all'antica",
      description: "Vitello di fattoria in umido, salsa cremosa ai funghi, riso pilaf.",
    },
    formula: {
      name: "Formula pranzo",
      description:
        "Antipasto a scelta + piatto del giorno\no piatto del giorno + dolce a scelta\nCaffè incluso, dal martedì al venerdì a pranzo",
    },
  },
};
