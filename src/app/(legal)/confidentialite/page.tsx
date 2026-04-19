import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Privacy");
  return { title: t("title") };
}

export default async function PrivacyPage() {
  const t = await getTranslations("Privacy");

  return (
    <article className="prose prose-sm max-w-none text-foreground prose-headings:text-foreground prose-p:text-muted-foreground prose-li:text-muted-foreground prose-strong:text-foreground">
      <h1>{t("title")}</h1>
      <p className="text-sm text-muted-foreground">{t("lastUpdated")}</p>

      <h2>{t("controller.title")}</h2>
      <p>{t("controller.body")}</p>

      <h2>{t("dataCollected.title")}</h2>
      <h3>{t("dataCollected.account.title")}</h3>
      <p>{t("dataCollected.account.body")}</p>
      <h3>{t("dataCollected.menu.title")}</h3>
      <p>{t("dataCollected.menu.body")}</p>
      <h3>{t("dataCollected.payment.title")}</h3>
      <p>{t("dataCollected.payment.body")}</p>
      <h3>{t("dataCollected.analytics.title")}</h3>
      <p>{t("dataCollected.analytics.body")}</p>
      <h3>{t("dataCollected.technical.title")}</h3>
      <p>{t("dataCollected.technical.body")}</p>

      <h2>{t("purposes.title")}</h2>
      <ul>
        <li>{t("purposes.service")}</li>
        <li>{t("purposes.payment")}</li>
        <li>{t("purposes.analytics")}</li>
        <li>{t("purposes.security")}</li>
        <li>{t("purposes.monitoring")}</li>
      </ul>

      <h2>{t("legalBasis.title")}</h2>
      <ul>
        <li>
          <strong>{t("legalBasis.contract.label")}</strong> {t("legalBasis.contract.body")}
        </li>
        <li>
          <strong>{t("legalBasis.legitimateInterest.label")}</strong>{" "}
          {t("legalBasis.legitimateInterest.body")}
        </li>
        <li>
          <strong>{t("legalBasis.consent.label")}</strong> {t("legalBasis.consent.body")}
        </li>
      </ul>

      <h2>{t("recipients.title")}</h2>
      <p>{t("recipients.intro")}</p>
      <ul>
        <li>
          <strong>Supabase</strong> — {t("recipients.supabase")}
        </li>
        <li>
          <strong>Stripe</strong> — {t("recipients.stripe")}
        </li>
        <li>
          <strong>Sentry</strong> — {t("recipients.sentry")}
        </li>
        <li>
          <strong>Vercel</strong> — {t("recipients.vercel")}
        </li>
        <li>
          <strong>Upstash</strong> — {t("recipients.upstash")}
        </li>
      </ul>

      <h2>{t("retention.title")}</h2>
      <ul>
        <li>{t("retention.account")}</li>
        <li>{t("retention.analytics")}</li>
        <li>{t("retention.analyticsAggregates")}</li>
        <li>{t("retention.webhookEvents")}</li>
        <li>{t("retention.logs")}</li>
      </ul>

      <h2>{t("cookies.title")}</h2>
      <p>{t("cookies.intro")}</p>
      <ul>
        <li>
          <strong>{t("cookies.session.label")}</strong> — {t("cookies.session.body")}
        </li>
        <li>
          <strong>{t("cookies.locale.label")}</strong> — {t("cookies.locale.body")}
        </li>
        <li>
          <strong>{t("cookies.consent.label")}</strong> — {t("cookies.consent.body")}
        </li>
      </ul>
      <p>{t("cookies.trackers")}</p>

      <h2>{t("rights.title")}</h2>
      <p>{t("rights.intro")}</p>
      <ul>
        <li>{t("rights.access")}</li>
        <li>{t("rights.rectification")}</li>
        <li>{t("rights.erasure")}</li>
        <li>{t("rights.restriction")}</li>
        <li>{t("rights.portability")}</li>
        <li>{t("rights.objection")}</li>
        <li>{t("rights.withdrawConsent")}</li>
      </ul>
      <p>{t("rights.contact")}</p>
      <p>{t("rights.cnil")}</p>

      <h2>{t("transfers.title")}</h2>
      <p>{t("transfers.body")}</p>

      <h2>{t("security.title")}</h2>
      <p>{t("security.body")}</p>

      <h2>{t("changes.title")}</h2>
      <p>{t("changes.body")}</p>

      <h2>{t("contact.title")}</h2>
      <p>{t("contact.body")}</p>
    </article>
  );
}
