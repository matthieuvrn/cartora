import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireRestaurant } from "../_lib/requireRestaurant";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteAccountButton } from "@/interface/ui/components/DeleteAccountButton";
import { ExportDataButton } from "@/interface/ui/components/ExportDataButton";
import { ManageCookiesButton } from "@/interface/ui/components/consent/ManageCookiesButton";

export default async function SettingsPage() {
  const { email } = await requireRestaurant();
  const t = await getTranslations("Settings");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-h2">{t("title")}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t("account")}</CardTitle>
          <CardDescription>{t("accountDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium">{t("email")}</p>
            <p className="text-sm text-muted-foreground">{email}</p>
          </div>
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
  );
}
