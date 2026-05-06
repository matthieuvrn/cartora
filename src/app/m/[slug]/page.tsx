import type { Metadata } from "next";
import { cache } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { GetPublicMenu } from "@/application/use-cases/GetPublicMenu";
import type { GetPublicMenuOutput } from "@/application/use-cases/GetPublicMenu";
import type { PublicMenuSnapshot } from "@/domain/menu/PublicMenuTypes";
import { ALLERGEN_VALUES, type Allergen } from "@/domain/menu/ItemPolicy";
import { PlanPolicy } from "@/domain/billing/PlanPolicy";
import type { AllergenLabels } from "@/interface/ui/components/AllergenIcons";
import { prisma } from "@/infrastructure/db/prisma";
import { PrismaSnapshotRepository } from "@/infrastructure/snapshot/PrismaSnapshotRepository";
import { TrackingBeacon } from "@/interface/ui/components/menu-template";
import { PublicMenuClient } from "@/interface/ui/components/menu-template/PublicMenuClient";
import frMessages from "../../../../messages/fr.json";
import enMessages from "../../../../messages/en.json";

type Props = {
  params: Promise<{ slug: string }>;
};

// React.cache dedupes within a single request (generateMetadata + page render share the result),
// but does NOT persist across requests. After a publish, the next request always fetches fresh
// from DB — no stale-while-revalidate window like unstable_cache had.
const getPublicMenuBySlug = cache(async (slug: string): Promise<GetPublicMenuOutput> => {
  const snapshotRepo = new PrismaSnapshotRepository(prisma);
  const getPublicMenu = new GetPublicMenu(snapshotRepo);
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
  const categoryList = categories.map((c) => c.name).join(", ");
  const description = categoryList
    ? `Consultez le menu de ${restaurantName} : ${categoryList}. Disponible en ligne sur Cartora.`
    : `Consultez le menu de ${restaurantName}. Disponible en ligne sur Cartora.`;

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

function buildMenuJsonLd(snapshot: PublicMenuSnapshot, slug: string) {
  const menuUrl = `${process.env.NEXT_PUBLIC_APP_URL}/m/${slug}`;

  return {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: snapshot.restaurantName,
    url: menuUrl,
    hasMenu: {
      "@type": "Menu",
      name: `Menu de ${snapshot.restaurantName}`,
      hasMenuSection: snapshot.categories.map((category) => ({
        "@type": "MenuSection",
        name: category.name,
        hasMenuItem: category.items.map((item) => ({
          "@type": "MenuItem",
          name: item.nameFr,
          description: item.descriptionFr || undefined,
          offers: {
            "@type": "Offer",
            price: (item.priceCents / 100).toFixed(2),
            priceCurrency: "EUR",
          },
        })),
      })),
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

  const allergenLabelsFor = (source: typeof frMessages | typeof enMessages): AllergenLabels => {
    const out = {} as AllergenLabels;
    for (const a of ALLERGEN_VALUES) {
      const entry = source.Allergen[a as Allergen];
      out[a] = { short: entry.short, legal: entry.legal };
    }
    return out;
  };

  const labelsFr = {
    badgeLabels: {
      NEW: frMessages.PublicMenu.badge.NEW,
      POPULAR: frMessages.PublicMenu.badge.POPULAR,
    },
    allergenLabels: allergenLabelsFor(frMessages),
    allergenSectionLabel: frMessages.Allergen.sectionTitle,
    allergenLegendTitle: frMessages.PublicMenu.allergenLegendTitle,
    watermarkText: frMessages.PublicMenu.watermark,
  };

  const labelsEn = {
    badgeLabels: {
      NEW: enMessages.PublicMenu.badge.NEW,
      POPULAR: enMessages.PublicMenu.badge.POPULAR,
    },
    allergenLabels: allergenLabelsFor(enMessages),
    allergenSectionLabel: enMessages.Allergen.sectionTitle,
    allergenLegendTitle: enMessages.PublicMenu.allergenLegendTitle,
    watermarkText: enMessages.PublicMenu.watermark,
  };

  const jsonLd = buildMenuJsonLd(result.snapshot, slug);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PublicMenuClient
        snapshot={result.snapshot}
        defaultLocale={locale}
        labelsFr={labelsFr}
        labelsEn={labelsEn}
        showWatermark={PlanPolicy.shouldShowWatermark(result.planTier)}
      />
      <TrackingBeacon slug={slug} locale={locale} />
    </>
  );
}
