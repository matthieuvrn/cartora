"use client";

import { useLocale } from "next-intl";
import { useTransition } from "react";
import { Globe, Check } from "lucide-react";
import { setLocaleAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const LOCALES = [
  { value: "fr", label: "Français" },
  { value: "en", label: "English" },
] as const;

export function LocaleSwitcher() {
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();

  const handleSelect = (next: "fr" | "en") => {
    if (next === locale) return;
    startTransition(() => {
      setLocaleAction(next);
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" disabled={isPending} aria-label="Changer de langue">
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
