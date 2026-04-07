import type { MetadataRoute } from "next";
import { ListPublishedMenus } from "@/application/use-cases/ListPublishedMenus";
import { prisma } from "@/infrastructure/db/prisma";
import { PrismaSnapshotRepository } from "@/infrastructure/snapshot/PrismaSnapshotRepository";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const snapshotRepo = new PrismaSnapshotRepository(prisma);
  const listPublished = new ListPublishedMenus(snapshotRepo);
  const published = await listPublished.execute();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];

  const menuRoutes: MetadataRoute.Sitemap = published.map((m) => ({
    url: `${baseUrl}/m/${m.slug}`,
    lastModified: new Date(m.publishedAt),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticRoutes, ...menuRoutes];
}
