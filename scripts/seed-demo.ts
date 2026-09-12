import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { readFileSync } from "node:fs";
import path from "node:path";
import { PrismaClient, type Allergen, type ItemBadge } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { PrismaRestaurantRepository } from "../src/infrastructure/restaurant/PrismaRestaurantRepository";
import { PrismaMenuRepository } from "../src/infrastructure/menu/PrismaMenuRepository";
import { PrismaSnapshotRepository } from "../src/infrastructure/snapshot/PrismaSnapshotRepository";
import { PublishMenu } from "../src/application/use-cases/PublishMenu";
import { hashSourceText } from "../src/domain/menu/textHash";
import { DEMO_MENU_SLUG } from "../src/lib/demo";

const DEMO_EMAIL = "demo@cartora.app";
const DEMO_SLUG = DEMO_MENU_SLUG;
const DEMO_DISPLAY_NAME = "Le Bistrot Démo";
const DEMO_LOGO_FILE = path.join(__dirname, "assets", "demo-logo.webp");
const LOGO_BUCKET = "restaurant-logos";

// La démo vitrine est PRO : multilingue (toutes les langues de contenu supportées),
// plats du jour + formules (STARTER+), et `PublishMenu` exige tier ≥ STARTER — sans
// ce champ, un seed sur base vierge créait un resto FREE et la publication échouait.
const DEMO_PLAN_TIER = "PRO" as const;
const DEMO_TARGET_LOCALES = ["en", "es", "de", "it"] as const;
type TargetLocale = (typeof DEMO_TARGET_LOCALES)[number];
type Localized = { fr: string } & Record<TargetLocale, string>;

// Plats du jour / formules : `valid_until` à +2 ans, écrit en Prisma brut. C'est un
// bypass ASSUMÉ de la policy domaine (≤ 14 jours, DailyDishPolicy/FormulaPolicy) :
// la démo doit rester en ligne en permanence, le rendu public n'affiche pas la date,
// et les vrais restaurateurs passent par les use cases qui, eux, appliquent la règle.
const DEMO_VALID_UNTIL = new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000);

type DemoItem = {
  priceCents: number;
  badge: ItemBadge;
  allergens: Allergen[];
  name: Localized;
  description: Localized;
};

type DemoCategory = {
  name: Localized;
  items: DemoItem[];
};

type DemoDailyDish = {
  priceCents: number;
  badge: ItemBadge;
  allergens: Allergen[];
  name: Localized;
  description: Localized;
};

type DemoFormula = {
  priceCents: number;
  name: Localized;
  description: Localized;
};

// ⚠️ Contrat avec les fac-similés de la landing (src/interface/ui/landing/) :
// — HeroLiveDemo.tsx : les 5 plats référencés gardent noms FR + prix — Velouté de potimarron 9,50 /
//   Burrata fumée 14,00 / Magret de canard 24,00 / Risotto aux cèpes 21,00 (édité 19,50 dans
//   l'animation) / Bar en croûte de sel 26,00 — ET le plat du jour DEMO_DAILY_DISHES[0]
//   (TODAY_DISH) : « Blanquette de veau à l'ancienne » 18,50 / POPULAR / MILK, CELERY, SULPHITES.
// — LandingFeatures.tsx : la paire « Burrata fumée » → « Smoked burrata » (nom EN aussi épinglé).
// — LandingProblem.tsx (ARTEFACT_SEED) / LandingHowItWorks.tsx : Blanquette 18,50, Risotto 21,00,
//   Burrata 14,00 + MILK.
// — demoExcerpt.ts (« La démo en 5 langues ») : copie VERBATIM de DEMO_DAILY_DISHES[0] et
//   DEMO_FORMULAS[0] — nom ET description dans les 5 locales. Toute retouche de ces deux entrées
//   doit être répercutée là-bas.
// Ajouter autour est libre.
const DEMO_MENU: DemoCategory[] = [
  {
    name: { fr: "Entrées", en: "Starters", es: "Entrantes", de: "Vorspeisen", it: "Antipasti" },
    items: [
      {
        priceCents: 650,
        badge: "NONE",
        allergens: ["EGGS", "MUSTARD"],
        name: {
          fr: "Œufs mayonnaise",
          en: "Eggs mayonnaise",
          es: "Huevos con mayonesa",
          de: "Eier mit Mayonnaise",
          it: "Uova con maionese",
        },
        description: {
          fr: "Œufs fermiers, mayonnaise maison à la moutarde de Dijon.",
          en: "Free-range eggs, homemade Dijon mustard mayonnaise.",
          es: "Huevos camperos, mayonesa casera con mostaza de Dijon.",
          de: "Freilandeier, hausgemachte Mayonnaise mit Dijon-Senf.",
          it: "Uova di fattoria, maionese fatta in casa alla senape di Digione.",
        },
      },
      {
        priceCents: 950,
        badge: "POPULAR",
        allergens: ["GLUTEN", "MILK", "NUTS"],
        name: {
          fr: "Velouté de potimarron",
          en: "Roasted squash velouté",
          es: "Crema de calabaza",
          de: "Kürbiscremesuppe",
          it: "Vellutata di zucca",
        },
        description: {
          fr: "Crème de potimarron rôti, huile de noisette et croûtons maison.",
          en: "Roasted squash cream with hazelnut oil and homemade croutons.",
          es: "Crema de calabaza asada, aceite de avellana y picatostes caseros.",
          de: "Cremesuppe vom gerösteten Kürbis, Haselnussöl und hausgemachte Croûtons.",
          it: "Crema di zucca arrostita, olio di nocciola e crostini fatti in casa.",
        },
      },
      {
        priceCents: 900,
        badge: "NONE",
        allergens: ["GLUTEN", "SULPHITES"],
        name: {
          fr: "Terrine de campagne",
          en: "Country terrine",
          es: "Terrina campestre",
          de: "Landterrine",
          it: "Terrina di campagna",
        },
        description: {
          fr: "Terrine maison au poivre noir, cornichons et pain de campagne grillé.",
          en: "Homemade terrine with black pepper, gherkins and toasted country bread.",
          es: "Terrina casera a la pimienta negra, pepinillos y pan de payés tostado.",
          de: "Hausgemachte Terrine mit schwarzem Pfeffer, Cornichons und geröstetem Landbrot.",
          it: "Terrina fatta in casa al pepe nero, cetriolini e pane casereccio tostato.",
        },
      },
      {
        priceCents: 1200,
        badge: "NONE",
        allergens: ["MILK", "NUTS", "MUSTARD"],
        name: {
          fr: "Tartare de betterave",
          en: "Beetroot tartare",
          es: "Tartar de remolacha",
          de: "Rote-Bete-Tatar",
          it: "Tartare di barbabietola",
        },
        description: {
          fr: "Betteraves rouges, chèvre frais, noisettes torréfiées et pousses de moutarde.",
          en: "Red beetroot, fresh goat cheese, toasted hazelnuts and mustard sprouts.",
          es: "Remolacha roja, queso fresco de cabra, avellanas tostadas y brotes de mostaza.",
          de: "Rote Bete, frischer Ziegenkäse, geröstete Haselnüsse und Senfsprossen.",
          it: "Barbabietola rossa, caprino fresco, nocciole tostate e germogli di senape.",
        },
      },
      {
        priceCents: 1400,
        badge: "NEW",
        allergens: ["MILK"],
        name: {
          fr: "Burrata fumée",
          en: "Smoked burrata",
          es: "Burrata ahumada",
          de: "Geräucherte Burrata",
          it: "Burrata affumicata",
        },
        description: {
          fr: "Burrata fumée au bois de hêtre, tomates anciennes et basilic.",
          en: "Beechwood-smoked burrata, heirloom tomatoes and basil.",
          es: "Burrata ahumada con madera de haya, tomates antiguos y albahaca.",
          de: "Über Buchenholz geräucherte Burrata, alte Tomatensorten und Basilikum.",
          it: "Burrata affumicata al legno di faggio, pomodori antichi e basilico.",
        },
      },
    ],
  },
  {
    name: {
      fr: "Plats",
      en: "Main courses",
      es: "Platos principales",
      de: "Hauptgerichte",
      it: "Piatti principali",
    },
    items: [
      {
        priceCents: 2400,
        badge: "POPULAR",
        allergens: ["CELERY"],
        name: {
          fr: "Magret de canard",
          en: "Duck breast",
          es: "Magret de pato",
          de: "Entenbrust",
          it: "Petto d'anatra",
        },
        description: {
          fr: "Magret rôti, sauce au miel et romarin, pommes grenailles.",
          en: "Roasted duck breast, honey-rosemary jus and baby potatoes.",
          es: "Magret asado, salsa de miel y romero, patatas baby.",
          de: "Gebratene Entenbrust, Honig-Rosmarin-Jus und Drillinge.",
          it: "Petto d'anatra arrosto, salsa al miele e rosmarino, patate novelle.",
        },
      },
      {
        priceCents: 1950,
        badge: "NONE",
        allergens: ["EGGS", "MUSTARD", "SULPHITES"],
        name: {
          fr: "Tartare de bœuf au couteau",
          en: "Hand-cut beef tartare",
          es: "Tartar de ternera al cuchillo",
          de: "Rindertatar, handgeschnitten",
          it: "Tartare di manzo al coltello",
        },
        description: {
          fr: "Bœuf charolais coupé au couteau, condiments maison, frites et jeunes pousses.",
          en: "Hand-cut Charolais beef, house condiments, fries and baby greens.",
          es: "Ternera charolesa cortada a cuchillo, condimentos caseros, patatas fritas y brotes tiernos.",
          de: "Handgeschnittenes Charolais-Rind, hausgemachte Würzzutaten, Pommes frites und junge Blattsalate.",
          it: "Manzo charolais tagliato al coltello, condimenti della casa, patatine fritte e germogli.",
        },
      },
      {
        priceCents: 2100,
        badge: "NONE",
        allergens: ["MILK", "CELERY", "SULPHITES"],
        name: {
          fr: "Risotto aux cèpes",
          en: "Porcini risotto",
          es: "Risotto de boletus",
          de: "Steinpilz-Risotto",
          it: "Risotto ai porcini",
        },
        description: {
          fr: "Riz carnaroli crémeux, cèpes sauvages et copeaux de parmesan.",
          en: "Creamy carnaroli rice, wild porcini and parmesan shavings.",
          es: "Arroz carnaroli cremoso, boletus silvestres y lascas de parmesano.",
          de: "Cremiger Carnaroli-Reis, wilde Steinpilze und Parmesanspäne.",
          it: "Riso carnaroli cremoso, porcini selvatici e scaglie di parmigiano.",
        },
      },
      {
        priceCents: 2600,
        badge: "NEW",
        allergens: ["FISH", "MILK"],
        name: {
          fr: "Bar en croûte de sel",
          en: "Salt-crusted sea bass",
          es: "Lubina en costra de sal",
          de: "Wolfsbarsch in Salzkruste",
          it: "Branzino in crosta di sale",
        },
        description: {
          fr: "Bar de ligne cuit en croûte de sel, légumes de saison et beurre citronné.",
          en: "Line-caught sea bass in salt crust, seasonal vegetables and lemon butter.",
          es: "Lubina de anzuelo en costra de sal, verduras de temporada y mantequilla de limón.",
          de: "Wolfsbarsch aus Leinenfang in Salzkruste, Saisongemüse und Zitronenbutter.",
          it: "Branzino pescato all'amo in crosta di sale, verdure di stagione e burro al limone.",
        },
      },
      {
        priceCents: 2550,
        badge: "NONE",
        allergens: ["MILK"],
        name: {
          fr: "Entrecôte, beurre maître d'hôtel",
          en: "Rib-eye steak, maître d'hôtel butter",
          es: "Entrecot con mantequilla maître d'hôtel",
          de: "Entrecôte mit Kräuterbutter",
          it: "Entrecôte al burro maître d'hôtel",
        },
        description: {
          fr: "Entrecôte française grillée, beurre maître d'hôtel, frites maison et salade.",
          en: "Grilled French rib-eye, maître d'hôtel butter, homemade fries and salad.",
          es: "Entrecot francés a la parrilla, mantequilla maître d'hôtel, patatas fritas caseras y ensalada.",
          de: "Gegrilltes französisches Entrecôte, Maître-d'hôtel-Butter, hausgemachte Pommes frites und Salat.",
          it: "Entrecôte francese alla griglia, burro maître d'hôtel, patatine fritte fatte in casa e insalata.",
        },
      },
    ],
  },
  {
    name: { fr: "Fromages", en: "Cheese", es: "Quesos", de: "Käse", it: "Formaggi" },
    items: [
      {
        priceCents: 1100,
        badge: "NONE",
        allergens: ["MILK", "GLUTEN", "NUTS"],
        name: {
          fr: "Assiette de fromages affinés",
          en: "Selection of matured cheeses",
          es: "Tabla de quesos curados",
          de: "Auswahl gereifter Käse",
          it: "Selezione di formaggi stagionati",
        },
        description: {
          fr: "Trois fromages affinés de nos régions, pain aux noix et confiture de cerises noires.",
          en: "Three matured regional cheeses, walnut bread and black cherry jam.",
          es: "Tres quesos curados de nuestras regiones, pan de nueces y mermelada de cereza negra.",
          de: "Drei gereifte Käse aus unseren Regionen, Walnussbrot und schwarze Kirschkonfitüre.",
          it: "Tre formaggi stagionati delle nostre regioni, pane alle noci e confettura di ciliegie nere.",
        },
      },
      {
        priceCents: 950,
        badge: "NONE",
        allergens: ["MILK", "GLUTEN"],
        name: {
          fr: "Saint-Marcellin rôti",
          en: "Roasted Saint-Marcellin",
          es: "Saint-Marcellin asado",
          de: "Gebackener Saint-Marcellin",
          it: "Saint-Marcellin al forno",
        },
        description: {
          fr: "Saint-Marcellin rôti au four, miel de montagne et pain de campagne grillé.",
          en: "Oven-roasted Saint-Marcellin, mountain honey and toasted country bread.",
          es: "Saint-Marcellin asado al horno, miel de montaña y pan de payés tostado.",
          de: "Im Ofen gebackener Saint-Marcellin, Berghonig und geröstetes Landbrot.",
          it: "Saint-Marcellin arrostito al forno, miele di montagna e pane casereccio tostato.",
        },
      },
    ],
  },
  {
    name: { fr: "Desserts", en: "Desserts", es: "Postres", de: "Nachspeisen", it: "Dolci" },
    items: [
      {
        priceCents: 850,
        badge: "NONE",
        allergens: ["EGGS", "MILK"],
        name: {
          fr: "Crème brûlée à la vanille",
          en: "Vanilla crème brûlée",
          es: "Crème brûlée de vainilla",
          de: "Crème brûlée mit Vanille",
          it: "Crème brûlée alla vaniglia",
        },
        description: {
          fr: "Crème à la vanille Bourbon de Madagascar, caramel croquant.",
          en: "Madagascar Bourbon vanilla custard with a crisp caramel top.",
          es: "Crema de vainilla Bourbon de Madagascar, caramelo crujiente.",
          de: "Creme mit Bourbon-Vanille aus Madagaskar, knackige Karamellkruste.",
          it: "Crema alla vaniglia Bourbon del Madagascar, caramello croccante.",
        },
      },
      {
        priceCents: 900,
        badge: "POPULAR",
        allergens: ["GLUTEN", "EGGS", "MILK"],
        name: {
          fr: "Tarte au citron revisitée",
          en: "Lemon tart, revisited",
          es: "Tarta de limón revisitada",
          de: "Zitronentarte, neu interpretiert",
          it: "Crostata al limone rivisitata",
        },
        description: {
          fr: "Crème de citron de Menton, meringue italienne et sablé breton.",
          en: "Menton lemon curd, Italian meringue and Breton shortbread.",
          es: "Crema de limón de Menton, merengue italiano y sablé bretón.",
          de: "Zitronencreme aus Menton, italienische Meringue und bretonischer Mürbeteig.",
          it: "Crema di limone di Mentone, meringa italiana e frolla bretone.",
        },
      },
      {
        priceCents: 950,
        badge: "NONE",
        allergens: ["GLUTEN", "EGGS", "MILK", "SOYBEANS"],
        name: {
          fr: "Moelleux chocolat noir",
          en: "Dark chocolate fondant",
          es: "Coulant de chocolate negro",
          de: "Schokoladenküchlein",
          it: "Tortino al cioccolato fondente",
        },
        description: {
          fr: "Fondant au chocolat noir 70%, cœur coulant et glace vanille bourbon.",
          en: "70% dark chocolate fondant with molten heart and bourbon vanilla ice cream.",
          es: "Coulant de chocolate negro 70 %, corazón fundente y helado de vainilla bourbon.",
          de: "Küchlein aus 70 % Zartbitterschokolade mit flüssigem Kern und Bourbon-Vanilleeis.",
          it: "Tortino al cioccolato fondente 70 % dal cuore morbido, gelato alla vaniglia bourbon.",
        },
      },
      {
        priceCents: 850,
        badge: "NEW",
        allergens: ["EGGS", "MILK"],
        name: {
          fr: "Pavlova aux fruits rouges",
          en: "Red berry pavlova",
          es: "Pavlova de frutos rojos",
          de: "Pavlova mit roten Früchten",
          it: "Pavlova ai frutti rossi",
        },
        description: {
          fr: "Meringue croquante, chantilly vanillée et fruits rouges de saison.",
          en: "Crisp meringue, vanilla whipped cream and seasonal red berries.",
          es: "Merengue crujiente, chantilly de vainilla y frutos rojos de temporada.",
          de: "Knuspriges Baiser, Vanillesahne und rote Früchte der Saison.",
          it: "Meringa croccante, panna alla vaniglia e frutti rossi di stagione.",
        },
      },
    ],
  },
  {
    name: { fr: "Boissons", en: "Drinks", es: "Bebidas", de: "Getränke", it: "Bevande" },
    items: [
      {
        priceCents: 650,
        badge: "POPULAR",
        allergens: ["SULPHITES"],
        name: {
          fr: "Verre de Côtes du Rhône",
          en: "Glass of Côtes du Rhône",
          es: "Copa de Côtes du Rhône",
          de: "Glas Côtes du Rhône",
          it: "Calice di Côtes du Rhône",
        },
        description: {
          fr: "Rouge fruité, notes de fruits noirs et épices douces.",
          en: "Fruity red with black fruit and mild spice notes.",
          es: "Tinto afrutado, notas de frutos negros y especias dulces.",
          de: "Fruchtiger Rotwein mit Noten von dunklen Beeren und milden Gewürzen.",
          it: "Rosso fruttato, note di frutti neri e spezie dolci.",
        },
      },
      {
        priceCents: 600,
        badge: "NONE",
        allergens: ["GLUTEN"],
        name: {
          fr: "Bière blonde artisanale",
          en: "Craft blonde ale",
          es: "Cerveza rubia artesanal",
          de: "Blondes Craft-Bier",
          it: "Birra bionda artigianale",
        },
        description: {
          fr: "Blonde de la brasserie du quartier, 33 cl.",
          en: "Blonde ale from the neighbourhood brewery, 33 cl.",
          es: "Rubia de la cervecería del barrio, 33 cl.",
          de: "Helles aus der Brauerei im Viertel, 33 cl.",
          it: "Bionda del birrificio di quartiere, 33 cl.",
        },
      },
      {
        priceCents: 450,
        badge: "NONE",
        allergens: [],
        name: {
          fr: "Limonade artisanale",
          en: "Artisan lemonade",
          es: "Limonada artesanal",
          de: "Hausgemachte Limonade",
          it: "Limonata artigianale",
        },
        description: {
          fr: "Limonade maison au citron de Sicile et menthe fraîche.",
          en: "House lemonade with Sicilian lemon and fresh mint.",
          es: "Limonada casera con limón de Sicilia y menta fresca.",
          de: "Limonade aus sizilianischen Zitronen mit frischer Minze.",
          it: "Limonata fatta in casa con limone di Sicilia e menta fresca.",
        },
      },
      {
        priceCents: 400,
        badge: "NONE",
        allergens: [],
        name: {
          fr: "Café expresso",
          en: "Espresso",
          es: "Café expreso",
          de: "Espresso",
          it: "Caffè espresso",
        },
        description: {
          fr: "Pure Arabica torréfié en France, servi court.",
          en: "Pure Arabica roasted in France, served short.",
          es: "Arábica puro tostado en Francia, servido corto.",
          de: "Reiner Arabica, in Frankreich geröstet, kurz serviert.",
          it: "Puro arabica tostato in Francia, servito ristretto.",
        },
      },
    ],
  },
];

const DEMO_DAILY_DISHES: DemoDailyDish[] = [
  {
    priceCents: 1850,
    badge: "POPULAR",
    allergens: ["MILK", "CELERY", "SULPHITES"],
    name: {
      fr: "Blanquette de veau à l'ancienne",
      en: "Traditional veal blanquette",
      es: "Blanqueta de ternera a la antigua",
      de: "Kalbsblanquette nach alter Art",
      it: "Blanquette di vitello all'antica",
    },
    description: {
      fr: "Veau fermier mijoté, sauce crémeuse aux champignons, riz pilaf.",
      en: "Slow-cooked farm veal in a creamy mushroom sauce, pilaf rice.",
      es: "Ternera de granja guisada, salsa cremosa de champiñones, arroz pilaf.",
      de: "Geschmortes Bauernkalb in cremiger Champignonsauce, Pilawreis.",
      it: "Vitello di fattoria in umido, salsa cremosa ai funghi, riso pilaf.",
    },
  },
];

const DEMO_FORMULAS: DemoFormula[] = [
  {
    priceCents: 1990,
    name: {
      fr: "Formule du midi",
      en: "Lunch set menu",
      es: "Menú del mediodía",
      de: "Mittagsmenü",
      it: "Formula pranzo",
    },
    description: {
      fr: "Entrée au choix + plat du jour\nou plat du jour + dessert au choix\nCafé offert, du mardi au vendredi midi",
      en: "Starter of your choice + dish of the day\nor dish of the day + dessert of your choice\nCoffee included, Tuesday to Friday lunchtime",
      es: "Entrante a elegir + plato del día\no plato del día + postre a elegir\nCafé incluido, de martes a viernes al mediodía",
      de: "Vorspeise nach Wahl + Tagesgericht\noder Tagesgericht + Dessert nach Wahl\nKaffee inklusive, Dienstag bis Freitag mittags",
      it: "Antipasto a scelta + piatto del giorno\no piatto del giorno + dolce a scelta\nCaffè incluso, dal martedì al venerdì a pranzo",
    },
  },
  {
    priceCents: 2590,
    name: {
      fr: "Menu complet",
      en: "Full menu",
      es: "Menú completo",
      de: "Komplettes Menü",
      it: "Menù completo",
    },
    description: {
      fr: "Entrée + plat + dessert au choix sur la carte\nHors plats du jour et boissons",
      en: "Starter + main + dessert of your choice from the menu\nExcludes daily specials and drinks",
      es: "Entrante + plato + postre a elegir de la carta\nNo incluye platos del día ni bebidas",
      de: "Vorspeise + Hauptgericht + Dessert nach Wahl von der Karte\nOhne Tagesgerichte und Getränke",
      it: "Antipasto + piatto + dolce a scelta dalla carta\nEsclusi piatti del giorno e bevande",
    },
  },
];

type TranslationRow = {
  entityType: string;
  entityId: string;
  restaurantId: string;
  field: "name" | "description";
  locale: string;
  value: string;
  sourceTextHash: string | null;
};

// Lignes fr (source, hash null) + cibles (hash du texte fr ⇒ statut "fresh").
function translationRows(
  entityType: "ITEM" | "DAILY_DISH" | "FORMULA",
  entityId: string,
  restaurantId: string,
  field: "name" | "description",
  text: Localized,
): TranslationRow[] {
  const sourceHash = hashSourceText(text.fr);
  return [
    {
      entityType,
      entityId,
      restaurantId,
      field,
      locale: "fr",
      value: text.fr,
      sourceTextHash: null,
    },
    ...DEMO_TARGET_LOCALES.map((locale) => ({
      entityType,
      entityId,
      restaurantId,
      field,
      locale,
      value: text[locale],
      sourceTextHash: sourceHash,
    })),
  ];
}

// Catégories : le nom source vit sur categories.name — seules les cibles vont en translations.
function categoryTranslationRows(
  categoryId: string,
  restaurantId: string,
  name: Localized,
): TranslationRow[] {
  const sourceHash = hashSourceText(name.fr);
  return DEMO_TARGET_LOCALES.map((locale) => ({
    entityType: "CATEGORY",
    entityId: categoryId,
    restaurantId,
    field: "name" as const,
    locale,
    value: name[locale],
    sourceTextHash: sourceHash,
  }));
}

function createAdminClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  }
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function ensureDemoAuthUser(admin: SupabaseClient): Promise<string> {
  // Look up existing user by email via paginated listUsers
  let page = 1;
  const perPage = 200;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const found = data.users.find((u) => u.email === DEMO_EMAIL);
    if (found) return found.id;
    if (data.users.length < perPage) break;
    page += 1;
  }

  // Create a new demo user (random password — never used for login)
  const randomPassword = `demo-${Math.random().toString(36).slice(2)}-${Date.now()}`;
  const { data, error } = await admin.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: randomPassword,
    email_confirm: true,
  });
  if (error) throw error;
  if (!data.user) throw new Error("Failed to create demo auth user");
  return data.user.id;
}

// Upload direct service-role vers le bucket (upsert : chemin stable <id>/logo.webp,
// même convention que le flux signé de l'app). L'asset est généré hors-ligne — voir
// scripts/assets/. Doit précéder la publication : le snapshot embarque logoPath.
async function uploadDemoLogo(admin: SupabaseClient, restaurantId: string): Promise<string> {
  const bytes = readFileSync(DEMO_LOGO_FILE);
  const logoPath = `${restaurantId}/logo.webp`;
  const { error } = await admin.storage
    .from(LOGO_BUCKET)
    .upload(logoPath, bytes, { contentType: "image/webp", upsert: true });
  if (error) throw new Error(`Logo upload failed: ${error.message}`);
  return logoPath;
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const admin = createAdminClient();
  const demoOwnerUserId = await ensureDemoAuthUser(admin);

  const adapter = new PrismaPg({ connectionString: url });
  const prisma = new PrismaClient({ adapter });

  try {
    // 1. Upsert restaurant (slug is the stable key)
    const restaurant = await prisma.restaurant.upsert({
      where: { slug: DEMO_SLUG },
      update: {
        displayName: DEMO_DISPLAY_NAME,
        planTier: DEMO_PLAN_TIER,
        planStatus: "ACTIVE",
        sourceLocale: "fr",
        menuLocales: [...DEMO_TARGET_LOCALES],
      },
      create: {
        ownerUserId: demoOwnerUserId,
        displayName: DEMO_DISPLAY_NAME,
        slug: DEMO_SLUG,
        planTier: DEMO_PLAN_TIER,
        planStatus: "ACTIVE",
        sourceLocale: "fr",
        menuLocales: [...DEMO_TARGET_LOCALES],
      },
      select: { id: true },
    });

    // 2. Logo (avant publication — le snapshot embarque restaurantLogoPath)
    const logoPath = await uploadDemoLogo(admin, restaurant.id);
    await prisma.restaurant.update({
      where: { id: restaurant.id },
      data: { logoPath },
    });

    // 3. Upsert menu (one per restaurant)
    const menu = await prisma.menu.upsert({
      where: { restaurantId: restaurant.id },
      update: {},
      create: { restaurantId: restaurant.id },
      select: { id: true },
    });

    // 4. Upsert categories by source name + drop any stale ones (deterministic re-seed)
    const categoryIds: string[] = [];
    for (let order = 0; order < DEMO_MENU.length; order++) {
      const name = DEMO_MENU[order].name.fr;
      const existing = await prisma.category.findFirst({
        where: { menuId: menu.id, name },
        select: { id: true },
      });

      const category = existing
        ? await prisma.category.update({
            where: { id: existing.id },
            data: { name, order },
            select: { id: true },
          })
        : await prisma.category.create({
            data: {
              menuId: menu.id,
              restaurantId: restaurant.id,
              name,
              order,
            },
            select: { id: true },
          });

      categoryIds.push(category.id);
    }
    await prisma.category.deleteMany({
      where: { menuId: menu.id, id: { notIn: categoryIds } },
    });

    // 5. Replace items, daily dishes, formulas + ALL translations (deterministic re-seed)
    await prisma.$transaction(async (tx) => {
      await tx.translation.deleteMany({ where: { restaurantId: restaurant.id } });
      await tx.item.deleteMany({ where: { restaurantId: restaurant.id } });
      await tx.dailyDish.deleteMany({ where: { restaurantId: restaurant.id } });
      await tx.formula.deleteMany({ where: { restaurantId: restaurant.id } });

      const rows: TranslationRow[] = [];

      for (let catIdx = 0; catIdx < DEMO_MENU.length; catIdx++) {
        const { name, items } = DEMO_MENU[catIdx];
        const categoryId = categoryIds[catIdx];
        rows.push(...categoryTranslationRows(categoryId, restaurant.id, name));

        for (let order = 0; order < items.length; order++) {
          const item = items[order];
          const created = await tx.item.create({
            data: {
              categoryId,
              restaurantId: restaurant.id,
              priceCents: item.priceCents,
              badge: item.badge,
              allergens: item.allergens,
              isAvailable: true,
              order,
            },
            select: { id: true },
          });
          rows.push(
            ...translationRows("ITEM", created.id, restaurant.id, "name", item.name),
            ...translationRows("ITEM", created.id, restaurant.id, "description", item.description),
          );
        }
      }

      for (let order = 0; order < DEMO_DAILY_DISHES.length; order++) {
        const dish = DEMO_DAILY_DISHES[order];
        const created = await tx.dailyDish.create({
          data: {
            restaurantId: restaurant.id,
            menuId: menu.id,
            priceCents: dish.priceCents,
            badge: dish.badge,
            allergens: dish.allergens,
            validUntil: DEMO_VALID_UNTIL,
            order,
          },
          select: { id: true },
        });
        rows.push(
          ...translationRows("DAILY_DISH", created.id, restaurant.id, "name", dish.name),
          ...translationRows(
            "DAILY_DISH",
            created.id,
            restaurant.id,
            "description",
            dish.description,
          ),
        );
      }

      for (let order = 0; order < DEMO_FORMULAS.length; order++) {
        const formula = DEMO_FORMULAS[order];
        const created = await tx.formula.create({
          data: {
            restaurantId: restaurant.id,
            menuId: menu.id,
            priceCents: formula.priceCents,
            validUntil: DEMO_VALID_UNTIL,
            order,
          },
          select: { id: true },
        });
        rows.push(
          ...translationRows("FORMULA", created.id, restaurant.id, "name", formula.name),
          ...translationRows(
            "FORMULA",
            created.id,
            restaurant.id,
            "description",
            formula.description,
          ),
        );
      }

      await tx.translation.createMany({ data: rows });
    });

    // 6. Publish the menu via the existing use case (builds and upserts the snapshot)
    const restaurantRepo = new PrismaRestaurantRepository(prisma);
    const menuRepo = new PrismaMenuRepository(prisma);
    const snapshotRepo = new PrismaSnapshotRepository(prisma);
    const clock = { nowISO: () => new Date().toISOString() };

    const publishMenu = new PublishMenu(menuRepo, restaurantRepo, snapshotRepo, clock);
    const { slug } = await publishMenu.execute({ restaurantId: restaurant.id });

    const itemCount = DEMO_MENU.reduce((sum, cat) => sum + cat.items.length, 0);
    console.log(
      `Demo seeded: /m/${slug} — ${DEMO_MENU.length} catégories, ${itemCount} items, ` +
        `${DEMO_DAILY_DISHES.length} plats du jour, ${DEMO_FORMULAS.length} formules, ` +
        `locales fr+${DEMO_TARGET_LOCALES.join("+")}, logo ${logoPath}`,
    );
  } catch (error) {
    console.error("Demo seed FAILED:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
