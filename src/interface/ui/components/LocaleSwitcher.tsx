"use client";

import { useLocale } from "next-intl";
import { useTransition } from "react";
import { Globe, Check } from "lucide-react";
import { setLocaleAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { HIT_AREA } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { trackLandingEvent } from "@/interface/ui/landing/trackLandingEvent";

const LOCALES = [
  { value: "fr", label: "Français" },
  { value: "en", label: "English" },
] as const;

interface LocaleSwitcherProps {
  /**
   * When true, emit a `locale_switched` landing analytics event on change.
   * Set only on the landing page header — leaving it off elsewhere keeps the
   * landing funnel clean of dashboard/menu switches.
   */
  trackLanding?: boolean;
}

export function LocaleSwitcher({ trackLanding = false }: LocaleSwitcherProps = {}) {
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();

  const handleSelect = (next: "fr" | "en") => {
    if (next === locale) return;
    if (trackLanding) {
      trackLandingEvent({
        event: "locale_switched",
        locale,
        metadata: { from: locale, to: next },
      });
    }
    startTransition(() => {
      setLocaleAction(next);
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={HIT_AREA}
          disabled={isPending}
          aria-label="Changer de langue"
        >
          <Globe className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LOCALES.map(({ value, label }) => (
          <DropdownMenuItem key={value} onClick={() => handleSelect(value)}>
            {label}
            {locale === value && <Check className="ml-auto h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
