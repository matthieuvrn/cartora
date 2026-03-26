import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { GetPublicMenu } from "@/application/use-cases/GetPublicMenu";
import type { CategoryType } from "@/domain/menu/MenuTypes";
import { prisma } from "@/infrastructure/db/prisma";
import { PrismaSnapshotRepository } from "@/infrastructure/snapshot/PrismaSnapshotRepository";
import { MenuTemplate } from "@/interface/ui/components/menu-template";

type Props = {
  params: Promise<{ slug: string }>;
};

function createGetPublicMenu() {
  const snapshotRepo = new PrismaSnapshotRepository(prisma);
  return new GetPublicMenu(snapshotRepo);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const getPublicMenu = createGetPublicMenu();
  const snapshot = await getPublicMenu.execute({ slug });

  return {
    title: snapshot
      ? `${snapshot.restaurantName} | Cartora`
      : "Menu | Cartora",
  };
}

export default async function PublicMenuPage({ params }: Props) {
  const { slug } = await params;
  const getPublicMenu = createGetPublicMenu();
  const snapshot = await getPublicMenu.execute({ slug });

  const locale = (await getLocale()) as "fr" | "en";
  const t = await getTranslations("PublicMenu");

  if (!snapshot) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
        <h1 className="mb-2 text-2xl font-bold">{t("notFound")}</h1>
        <p className="text-muted-foreground">{t("notFoundDescription")}</p>
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
    <MenuTemplate
      snapshot={snapshot}
      locale={locale}
      showWatermark={false}
      categoryLabels={categoryLabels}
      badgeLabels={badgeLabels}
    />
  );
}
