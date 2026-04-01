import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { getLocale, getTranslations } from "next-intl/server";
import { GetPublicMenu } from "@/application/use-cases/GetPublicMenu";
import type { GetPublicMenuOutput } from "@/application/use-cases/GetPublicMenu";
import type { CategoryType } from "@/domain/menu/MenuTypes";
import { PublicationPolicy } from "@/domain/menu/PublicationPolicy";
import { prisma } from "@/infrastructure/db/prisma";
import { PrismaSnapshotRepository } from "@/infrastructure/snapshot/PrismaSnapshotRepository";
import { MenuTemplate, TrackingBeacon } from "@/interface/ui/components/menu-template";

export const revalidate = 3600;

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

  return {
    title: result ? `${result.snapshot.restaurantName} | Cartora` : "Menu | Cartora",
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

  const categoryLabels: Record<CategoryType, string> = {
    STARTERS: t("category.STARTERS"),
    MAINS: t("category.MAINS"),
    DESSERTS: t("category.DESSERTS"),
    DRINKS: t("category.DRINKS"),
  };

  const badgeLabels: Record<"NEW" | "POPULAR", string> = {
    NEW: t("badge.NEW"),
    POPULAR: t("badge.POPULAR"),
  };

  return (
    <>
      <MenuTemplate
        snapshot={result.snapshot}
        locale={locale}
        showWatermark={PublicationPolicy.shouldShowWatermark(result.planStatus)}
        categoryLabels={categoryLabels}
        badgeLabels={badgeLabels}
      />
      <TrackingBeacon slug={slug} locale={locale} />
    </>
  );
}
