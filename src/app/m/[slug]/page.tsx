import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { getLocale, getTranslations } from "next-intl/server";
import { GetPublicMenu } from "@/application/use-cases/GetPublicMenu";
import type { GetPublicMenuOutput } from "@/application/use-cases/GetPublicMenu";
import type { CategoryType } from "@/domain/menu/MenuTypes";
import type { PublicMenuSnapshot } from "@/domain/menu/PublicMenuTypes";
import { PublicationPolicy } from "@/domain/menu/PublicationPolicy";
import { prisma } from "@/infrastructure/db/prisma";
import { PrismaSnapshotRepository } from "@/infrastructure/snapshot/PrismaSnapshotRepository";
import { TrackingBeacon } from "@/interface/ui/components/menu-template";
import { PublicMenuClient } from "@/interface/ui/components/menu-template/PublicMenuClient";
import frMessages from "../../../../messages/fr.json";
import enMessages from "../../../../messages/en.json";

export const revalidate = 3600;

const CATEGORY_LABELS_FR: Record<CategoryType, string> = {
  STARTERS: "Entrées",
  MAINS: "Plats",
  DESSERTS: "Desserts",
  DRINKS: "Boissons",
};

type Props = {
  params: Promise<{ slug: string }>;
};

async function getPublicMenuBySlug(slug: string): Promise<GetPublicMenuOutput> {
  return unstable_cache(
    async () => {
      const snapshotRepo = new PrismaSnapshotRepository(prisma);
      const getPublicMenu = new GetPublicMenu(snapshotRepo);
      return getPublicMenu.execute({ slug });
    },
    [`public-menu-${slug}`],
    {
      tags: [`public-menu-${slug}`],
      revalidate: 3600,
    },
  )();
}

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
  const categoryList = categories.map((c) => CATEGORY_LABELS_FR[c.type]).join(", ");
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
        name: CATEGORY_LABELS_FR[category.type],
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

  const labelsFr = {
    categoryLabels: {
      STARTERS: frMessages.PublicMenu.category.STARTERS,
      MAINS: frMessages.PublicMenu.category.MAINS,
      DESSERTS: frMessages.PublicMenu.category.DESSERTS,
      DRINKS: frMessages.PublicMenu.category.DRINKS,
    },
    badgeLabels: {
      NEW: frMessages.PublicMenu.badge.NEW,
      POPULAR: frMessages.PublicMenu.badge.POPULAR,
    },
    watermarkText: frMessages.PublicMenu.watermark,
  };

  const labelsEn = {
    categoryLabels: {
      STARTERS: enMessages.PublicMenu.category.STARTERS,
      MAINS: enMessages.PublicMenu.category.MAINS,
      DESSERTS: enMessages.PublicMenu.category.DESSERTS,
      DRINKS: enMessages.PublicMenu.category.DRINKS,
    },
    badgeLabels: {
      NEW: enMessages.PublicMenu.badge.NEW,
      POPULAR: enMessages.PublicMenu.badge.POPULAR,
    },
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
        showWatermark={PublicationPolicy.shouldShowWatermark(result.planStatus)}
      />
      <TrackingBeacon slug={slug} locale={locale} />
    </>
  );
}
