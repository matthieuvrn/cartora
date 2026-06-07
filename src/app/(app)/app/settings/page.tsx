import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowLeft, ImageIcon, Palette } from "lucide-react";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { Button } from "@/components/ui/button";
import { HIT_AREA } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteAccountButton } from "@/interface/ui/components/DeleteAccountButton";
import { ExportDataButton } from "@/interface/ui/components/ExportDataButton";
import { ManageCookiesButton } from "@/interface/ui/components/consent/ManageCookiesButton";

export default async function SettingsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/login");

  const t = await getTranslations("Settings");

  return (
    <main className="min-h-screen">
      <header className="border-b bg-background px-6 py-4">
        <div className="mx-auto flex max-w-2xl items-center gap-4">
          <Link href="/app">
            <Button variant="ghost" size="icon" className={HIT_AREA} aria-label={t("back")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-h3">{t("title")}</h1>
        </div>
      </header>

      <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>{t("account")}</CardTitle>
            <CardDescription>{t("accountDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium">{t("email")}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("appearance")}</CardTitle>
            <CardDescription>{t("appearanceDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Link href="/app/settings/template">
              <Button variant="outline" className="gap-2">
                <Palette className="size-4" />
                {t("appearanceLinkLabel")}
              </Button>
            </Link>
            <Link href="/app/settings/branding">
              <Button variant="outline" className="gap-2">
                <ImageIcon className="size-4" />
                {t("brandingLinkLabel")}
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("data")}</CardTitle>
            <CardDescription>{t("dataDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ExportDataButton />
            <div>
              <Link
                href="/confidentialite"
                className="text-sm text-muted-foreground underline underline-offset-4"
              >
                {t("privacyLink")}
              </Link>
            </div>
            <div>
              <ManageCookiesButton />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">{t("dangerZone")}</CardTitle>
            <CardDescription>{t("dangerZoneDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <DeleteAccountButton />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
