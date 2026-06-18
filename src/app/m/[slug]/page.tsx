import type { Metadata } from "next";
import { cache } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { GetPublicMenu } from "@/application/use-cases/GetPublicMenu";
import type { GetPublicMenuOutput } from "@/application/use-cases/GetPublicMenu";
import type { PublicMenuSnapshot } from "@/domain/menu/PublicMenuTypes";
import { resolveText, type MenuLocale } from "@/domain/menu/MenuLocale";
import { ALLERGEN_VALUES, type Allergen } from "@/domain/menu/ItemPolicy";
import { PlanPolicy } from "@/domain/billing/PlanPolicy";
import type { AllergenLabels } from "@/interface/ui/components/AllergenIcons";
import { prisma } from "@/infrastructure/db/prisma";
import { PrismaSnapshotRepository } from "@/infrastructure/snapshot/PrismaSnapshotRepository";
import { SystemClock } from "@/infrastructure/clock/SystemClock";
import { TrackingBeacon } from "@/interface/ui/components/menu-template";
import {
  PublicMenuClient,
  type PublicMenuLabels,
} from "@/interface/ui/components/menu-template/PublicMenuClient";
import frMessages from "../../../../messages/fr.json";
import enMessages from "../../../../messages/en.json";
import esMessages from "../../../../messages/es.json";
import deMessages from "../../../../messages/de.json";
import itMessages from "../../../../messages/it.json";

type Props = {
  params: Promise<{ slug: string }>;
};

/**
 * Forme minimale d'un bundle de messages utilisée pour le menu public. fr/en sont
 * complets, es/de/it partiels (PublicMenu + Allergen). `as unknown` au boundary :
 * la structure est garantie par les fichiers messages (vérifiée au build via les
 * accès typés ci-dessous).
 */
type PublicMenuMessages = {
  PublicMenu: {
    badge: { NEW: string; POPULAR: string };
    allergenLegendTitle: string;
    watermark: string;
    todayMenu: string;
    todayMenuDescription: string;
    todaySectionDishesSubtitle: string;
    todaySectionFormulasSubtitle: string;
    categoriesNav: string;
  };
  Allergen: { sectionTitle: string } & Record<Allergen, { short: string; legal: string }>;
};

const MESSAGES_BY_LOCALE: Record<MenuLocale, PublicMenuMessages> = {
  fr: frMessages as unknown as PublicMenuMessages,
  en: enMessages as unknown as PublicMenuMessages,
  es: esMessages as unknown as PublicMenuMessages,
  de: deMessages as unknown as PublicMenuMessages,
  it: itMessages as unknown as PublicMenuMessages,
};

function publicMenuLabelsFor(locale: MenuLocale): PublicMenuLabels {
  const m = MESSAGES_BY_LOCALE[locale];
  const allergenLabels = {} as AllergenLabels;
  for (const a of ALLERGEN_VALUES) {
    const entry = m.Allergen[a];
    allergenLabels[a] = { short: entry.short, legal: entry.legal };
  }
  return {
    badgeLabels: { NEW: m.PublicMenu.badge.NEW, POPULAR: m.PublicMenu.badge.POPULAR },
    allergenLabels,
    allergenSectionLabel: m.Allergen.sectionTitle,
    allergenLegendTitle: m.PublicMenu.allergenLegendTitle,
    watermarkText: m.PublicMenu.watermark,
    todaySectionTitle: m.PublicMenu.todayMenu,
    todaySectionDescription: m.PublicMenu.todayMenuDescription,
    todaySectionDishesSubtitle: m.PublicMenu.todaySectionDishesSubtitle,
    todaySectionFormulasSubtitle: m.PublicMenu.todaySectionFormulasSubtitle,
    categoriesNavLabel: m.PublicMenu.categoriesNav,
  };
}

// React.cache dedupes within a single request (generateMetadata + page render share the result),
// but does NOT persist across requests. After a publish, the next request always fetches fresh
// from DB — no stale-while-revalidate window like unstable_cache had.
const getPublicMenuBySlug = cache(async (slug: string): Promise<GetPublicMenuOutput> => {
  const snapshotRepo = new PrismaSnapshotRepository(prisma);
  // Clock injecté pour le filtrage à la lecture des daily entries (S3.1).
  const getPublicMenu = new GetPublicMenu(snapshotRepo, new SystemClock());
  return getPublicMenu.execute({ slug });
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const result = await getPublicMenuBySlug(slug);

  if (!result || result.planStatus === "CANCELED") {
    return {
      title: "Menu",
      robots: { index: false, follow: false },
    };
  }

  const { restaurantName, categories } = result.snapshot;
  // Métadonnées dans la langue du CHROME (cookie fr/en) — la page est dynamique
  // par requête, pas de risque de cache empoisonné.
  const t = await getTranslations("PublicMenu");
  const categoryList = categories.map((c) => c.name).join(", ");
  const description = categoryList
    ? t("metaDescription", { name: restaurantName, categories: categoryList })
    : t("metaDescriptionNoCategories", { name: restaurantName });

  return {
    title: restaurantName,
    description,
    openGraph: {
      title: restaurantName,
      description,
      url: `/m/${slug}`,
      type: "website",
    },
    robots: { index: true, follow: false },
  };
}

// JSON-LD émis UNE fois dans la langue SOURCE du menu (contenu canonique). `inLanguage`
// annonce cette langue ; dupliquer le JSON-LD par locale sur une URL unique serait du bruit.
function buildMenuJsonLd(snapshot: PublicMenuSnapshot, slug: string, todayLabel: string) {
  const menuUrl = `${process.env.NEXT_PUBLIC_APP_URL}/m/${slug}`;
  const src = snapshot.sourceLocale;
  const text = (map: Parameters<typeof resolveText>[0]) => resolveText(map, src, src);

  const categorySections = snapshot.categories.map((category) => ({
    "@type": "MenuSection",
    name: text(category.texts.name) || category.name,
    hasMenuItem: category.items.map((item) => ({
      "@type": "MenuItem",
      name: text(item.texts.name),
      description: text(item.texts.description) || undefined,
      offers: {
        "@type": "Offer",
        price: (item.priceCents / 100).toFixed(2),
        priceCurrency: "EUR",
      },
    })),
  }));

  // S3.1 + S3.2 — Section "Aujourd'hui" en tête pour le SEO local. Daily items
  // ET formules sont filtrés par expiration côté `GetPublicMenu` ; tout ce qui
  // arrive ici est valide à l'instant du rendu. Mêmes items combinés dans une
  // seule section MenuSection (cohérent avec le rendu UI : tout est dans le même bloc).
  const todayMenuItems = [
    ...(snapshot.dailyItems ?? []).map((item) => ({
      "@type": "MenuItem" as const,
      name: text(item.texts.name),
      description: text(item.texts.description) || undefined,
      offers: {
        "@type": "Offer" as const,
        price: (item.priceCents / 100).toFixed(2),
        priceCurrency: "EUR" as const,
      },
    })),
    ...(snapshot.formulas ?? []).map((formula) => ({
      "@type": "MenuItem" as const,
      name: text(formula.texts.name),
      description: text(formula.texts.description) || undefined,
      offers: {
        "@type": "Offer" as const,
        price: (formula.priceCents / 100).toFixed(2),
        priceCurrency: "EUR" as const,
      },
    })),
  ];
  const dailySection =
    todayMenuItems.length > 0
      ? [
          {
            "@type": "MenuSection",
            name: todayLabel,
            hasMenuItem: todayMenuItems,
          },
        ]
      : [];

  return {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: snapshot.restaurantName,
    url: menuUrl,
    inLanguage: src,
    hasMenu: {
      "@type": "Menu",
      name: `Menu de ${snapshot.restaurantName}`,
      inLanguage: src,
      hasMenuSection: [...dailySection, ...categorySections],
    },
  };
}

export default async function PublicMenuPage({ params }: Props) {
  const { slug } = await params;
  const result = await getPublicMenuBySlug(slug);

  const locale = (await getLocale()) as "fr" | "en";
  const t = await getTranslations("PublicMenu");

  if (!result) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
        <h1 className="mb-2 text-2xl font-bold">{t("notFound")}</h1>
        <p className="text-muted-foreground">{t("notFoundDescription")}</p>
      </main>
    );
  }

  if (result.planStatus === "CANCELED") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
        <h1 className="mb-2 text-2xl font-bold">{t("unavailable")}</h1>
        <p className="text-muted-foreground">{t("unavailableDescription")}</p>
      </main>
    );
  }

  // Labels par langue activée du menu (S4). Le menu source figure toujours dans
  // `availableLocales` → labelsByLocale[sourceLocale] est toujours présent (repli client).
  const { availableLocales, sourceLocale } = result.snapshot;
  const labelsByLocale: Partial<Record<MenuLocale, PublicMenuLabels>> = {};
  for (const loc of availableLocales) {
    labelsByLocale[loc] = publicMenuLabelsFor(loc);
  }

  // Locale d'affichage initiale : la langue du chrome (cookie) si le menu la propose,
  // sinon la langue source. Garantit que SSR rend une langue réellement disponible.
  const defaultLocale: MenuLocale = availableLocales.includes(locale) ? locale : sourceLocale;

  // JSON-LD en langue source ; titre "Aujourd'hui" dans cette même langue.
  const jsonLd = buildMenuJsonLd(
    result.snapshot,
    slug,
    MESSAGES_BY_LOCALE[sourceLocale].PublicMenu.todayMenu,
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PublicMenuClient
        snapshot={result.snapshot}
        defaultLocale={defaultLocale}
        labelsByLocale={labelsByLocale}
        showWatermark={PlanPolicy.shouldShowWatermark(result.planTier)}
      />
      <TrackingBeacon slug={slug} locale={locale} />
    </>
  );
}
