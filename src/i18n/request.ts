import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";

export default getRequestConfig(async () => {
  const store = await cookies();

  const raw = store.get("locale")?.value;
  const locale = raw === "en" ? "en" : "fr";

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
