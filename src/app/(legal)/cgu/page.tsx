import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Terms");
  return { title: t("title") };
}

export default async function TermsPage() {
  const t = await getTranslations("Terms");

  return (
    <article className="prose prose-sm max-w-none text-foreground prose-headings:text-foreground prose-p:text-muted-foreground prose-li:text-muted-foreground prose-strong:text-foreground">
      <h1>{t("title")}</h1>
      <p className="text-sm text-muted-foreground">{t("lastUpdated")}</p>

      <h2>{t("object.title")}</h2>
      <p>{t("object.body")}</p>

      <h2>{t("access.title")}</h2>
      <p>{t("access.body")}</p>

      <h2>{t("account.title")}</h2>
      <p>{t("account.body")}</p>

      <h2>{t("service.title")}</h2>
      <p>{t("service.body")}</p>

      <h2>{t("pricing.title")}</h2>
      <p>{t("pricing.body")}</p>

      <h2>{t("obligations.title")}</h2>
      <p>{t("obligations.body")}</p>

      <h2>{t("intellectualProperty.title")}</h2>
      <p>{t("intellectualProperty.body")}</p>

      <h2>{t("liability.title")}</h2>
      <p>{t("liability.body")}</p>

      <h2>{t("termination.title")}</h2>
      <p>{t("termination.body")}</p>

      <h2>{t("law.title")}</h2>
      <p>{t("law.body")}</p>

      <h2>{t("contact.title")}</h2>
      <p>{t("contact.body")}</p>
    </article>
  );
}
