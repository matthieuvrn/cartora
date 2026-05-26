import Link from "next/link";
import { useTranslations } from "next-intl";
import { LocaleSwitcher } from "@/interface/ui/components/LocaleSwitcher";
import { TrackedCtaButton } from "@/interface/ui/landing/TrackedCtaButton";

export function LandingHeader() {
  const t = useTranslations("Landing.header");

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-6">
        <Link
          href="/"
          className="text-base font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded-sm"
        >
          Cartora
        </Link>

        <nav
          aria-label="Navigation principale"
          className="ml-6 hidden items-center gap-6 text-sm text-muted-foreground md:flex"
        >
          <Link href="#pricing" className="transition-colors hover:text-foreground">
            {t("navTarifs")}
          </Link>
          <Link href="#demo" className="transition-colors hover:text-foreground">
            {t("navDemo")}
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <LocaleSwitcher />
          <TrackedCtaButton
            event="cta_header_login"
            href="/login"
            variant="ghost"
            className="hidden sm:inline-flex"
          >
            {t("loginCta")}
          </TrackedCtaButton>
          <TrackedCtaButton event="cta_header_signup" href="/signup" variant="primary">
            {t("signupCta")}
          </TrackedCtaButton>
        </div>
      </div>
    </header>
  );
}
