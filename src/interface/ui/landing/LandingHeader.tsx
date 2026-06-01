"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Logo } from "@/interface/ui/components/Logo";
import { LocaleSwitcher } from "@/interface/ui/components/LocaleSwitcher";
import { TrackedCtaButton } from "@/interface/ui/landing/TrackedCtaButton";

const NAV_LINKS = [
  { href: "#pricing", labelKey: "navTarifs" },
  { href: "#demo", labelKey: "navDemo" },
] as const;

export function LandingHeader() {
  const t = useTranslations("Landing.header");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 transition-[background-color,border-color,backdrop-filter] duration-200 ease-out ${
        scrolled
          ? "border-b border-canard-100/70 bg-background/90 backdrop-blur-md"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-6 md:h-16">
        <Link
          href="/"
          aria-label="Cartora"
          className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <Logo className="h-7" />
        </Link>

        <nav aria-label="Navigation principale" className="ml-6 hidden items-center gap-6 md:flex">
          {NAV_LINKS.map(({ href, labelKey }) => (
            <Link
              key={href}
              href={href}
              className="group inline-flex min-h-[44px] items-center rounded-sm text-sm font-medium text-sand-700 transition-colors hover:text-canard-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <span className="relative">
                {t(labelKey)}
                <span className="absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 bg-canard-600 transition-transform duration-200 ease-[var(--ease-out-expo)] group-hover:scale-x-100" />
              </span>
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <LocaleSwitcher trackLanding />
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
