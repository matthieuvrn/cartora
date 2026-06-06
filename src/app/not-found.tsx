import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";

export default async function NotFound() {
  const t = await getTranslations("NotFound");

  return (
    <main className="theme-app flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center text-foreground">
      <h1 className="mb-2 text-h1">404</h1>
      <p className="display mb-1 text-h3">{t("title")}</p>
      <p className="mb-6 text-body text-muted-foreground">{t("description")}</p>
      <Button asChild>
        <Link href="/app">{t("backHome")}</Link>
      </Button>
    </main>
  );
}
