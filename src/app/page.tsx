import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowRight, BarChart3, Check, Pencil, QrCode } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LandingFaq } from "@/interface/ui/components/LandingFaq";
import { LocaleSwitcher } from "@/interface/ui/components/LocaleSwitcher";

export default async function LandingPage() {
  const t = await getTranslations("Landing");
  const tPricing = await getTranslations("Pricing");

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            Cartora
          </Link>
          <nav className="flex items-center gap-2 sm:gap-3">
            <LocaleSwitcher />
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">{t("header.login")}</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/signup">{t("header.cta")}</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-4xl px-6 py-20 text-center sm:py-28">
          <p className="mb-6 inline-block rounded-full border bg-muted px-4 py-1.5 text-xs font-medium text-muted-foreground sm:text-sm">
            {t("hero.eyebrow")}
          </p>
          <h1 className="mx-auto max-w-3xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
            {t("hero.title")}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-balance text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t("hero.subtitle")}
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/signup">
                {t("hero.ctaPrimary")}
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
              <Link href="/m/demo-cartora">{t("hero.ctaSecondary")}</Link>
            </Button>
          </div>
          <p className="mt-6 text-xs text-muted-foreground sm:text-sm">{t("hero.trust")}</p>
        </section>

        <section className="border-t bg-muted/30">
          <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
            <h2 className="mx-auto max-w-2xl text-center text-3xl font-semibold tracking-tight sm:text-4xl">
              {t("features.title")}
            </h2>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <Pencil className="h-5 w-5" aria-hidden="true" />
                    {t("features.editor.title")}
                  </CardTitle>
                  <CardDescription>{t("features.editor.description")}</CardDescription>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <QrCode className="h-5 w-5" aria-hidden="true" />
                    {t("features.qr.title")}
                  </CardTitle>
                  <CardDescription>{t("features.qr.description")}</CardDescription>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <BarChart3 className="h-5 w-5" aria-hidden="true" />
                    {t("features.stats.title")}
                  </CardTitle>
                  <CardDescription>{t("features.stats.description")}</CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </section>

        <section id="pricing" className="scroll-mt-16 border-t">
          <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                {t("pricing.title")}
              </h2>
              <p className="mt-4 text-base text-muted-foreground sm:text-lg">
                {t("pricing.subtitle")}
              </p>
            </div>

            <div className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-2">
              <Card className="flex flex-col border-muted">
                <CardHeader>
                  <CardTitle className="text-lg">{tPricing("free.name")}</CardTitle>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-4xl font-bold tracking-tight">
                      {tPricing("free.price")}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <ul className="space-y-3 text-sm">
                    {(tPricing.raw("free.features") as string[]).map((feature) => (
                      <li key={feature} className="flex items-center gap-2">
                        <Check
                          className="size-4 shrink-0 text-muted-foreground"
                          aria-hidden="true"
                        />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button asChild variant="outline" size="lg" className="w-full">
                    <Link href="/signup">{tPricing("ctaStartFree")}</Link>
                  </Button>
                </CardFooter>
              </Card>

              <Card className="relative flex flex-col border-primary shadow-md">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{tPricing("pro.name")}</CardTitle>
                    <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground">
                      {tPricing("popular")}
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-4xl font-bold tracking-tight">
                      {tPricing("pro.price")}
                    </span>
                    {tPricing("pro.period") && (
                      <span className="text-sm text-muted-foreground">
                        {tPricing("pro.period")}
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <ul className="space-y-3 text-sm">
                    {(tPricing.raw("pro.features") as string[]).map((feature) => (
                      <li key={feature} className="flex items-center gap-2">
                        <Check className="size-4 shrink-0 text-primary" aria-hidden="true" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button asChild size="lg" className="w-full">
                    <Link href="/signup">{tPricing("ctaStartPro")}</Link>
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </section>

        <section id="faq" className="scroll-mt-16 border-t bg-muted/30">
          <div className="mx-auto max-w-3xl px-6 py-20 sm:py-24">
            <div className="text-center">
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                {t("faq.title")}
              </h2>
              <p className="mt-4 text-base text-muted-foreground sm:text-lg">{t("faq.subtitle")}</p>
            </div>
            <div className="mt-12">
              <LandingFaq />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto max-w-6xl px-6 py-8 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Cartora
        </div>
      </footer>
    </div>
  );
}
