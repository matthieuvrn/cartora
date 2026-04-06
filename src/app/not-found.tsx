import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";

export default async function NotFound() {
  const t = await getTranslations("NotFound");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <h1 className="mb-2 text-4xl font-bold">404</h1>
      <p className="mb-1 text-lg font-semibold">{t("title")}</p>
      <p className="mb-6 text-muted-foreground">{t("description")}</p>
      <Button asChild>
        <Link href="/app">{t("backHome")}</Link>
      </Button>
    </main>
  );
}
