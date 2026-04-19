import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Legal");
  return { title: t("title") };
}

export default async function LegalNoticePage() {
  const t = await getTranslations("Legal");

  return (
    <article className="prose prose-sm max-w-none text-foreground prose-headings:text-foreground prose-p:text-muted-foreground prose-li:text-muted-foreground prose-strong:text-foreground">
      <h1>{t("title")}</h1>

      <h2>{t("publisher.title")}</h2>
      <p>{t("publisher.body")}</p>

      <h2>{t("hosting.title")}</h2>
      <p>{t("hosting.body")}</p>

      <h2>{t("contact.title")}</h2>
      <p>{t("contact.body")}</p>

      <h2>{t("intellectualProperty.title")}</h2>
      <p>{t("intellectualProperty.body")}</p>
    </article>
  );
}
