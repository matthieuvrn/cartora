import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";

export default getRequestConfig(async ({ requestLocale }) => {
  // Les pages landing statiques (`/`, `/en`) fournissent leur locale via `setRequestLocale`
  // — dans ce cas on ne touche JAMAIS à cookies() (une lecture rendrait la route dynamique
  // et casserait le prerender CDN). Partout ailleurs (dashboard, auth, légal, /m), la locale
  // UI vient du cookie `locale`, comme avant.
  const requested = await requestLocale;
  let locale: "fr" | "en" | undefined =
    requested === "en" || requested === "fr" ? requested : undefined;

  if (!locale) {
    const store = await cookies();
    const raw = store.get("locale")?.value;
    locale = raw === "en" ? "en" : "fr";
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
