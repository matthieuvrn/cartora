"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (value: string) => void;
  /**
   * Enregistre le raccourci global « / » (focus du champ). À activer sur UNE
   * seule instance (celle du desktop) — sur mobile on tape dans le champ.
   */
  withShortcut?: boolean;
  className?: string;
};

/**
 * Recherche instantanée de la carte (filtre client, insensible aux accents —
 * cf. `matchesQuery`). « / » focalise le champ, Échap efface et rend le focus
 * au document.
 */
export function EditorSearchInput({ value, onChange, withShortcut = false, className }: Props) {
  const t = useTranslations("Dashboard");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!withShortcut) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      // Ne pas voler le focus d'une saisie en cours ni d'un dialog ouvert.
      if (target?.closest("input, textarea, select, [contenteditable=true], [role=dialog]")) return;
      e.preventDefault();
      inputRef.current?.focus();
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [withShortcut]);

  return (
    <div className={cn("relative", className)}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            onChange("");
            e.currentTarget.blur();
          }
        }}
        placeholder={t("search.placeholder")}
        aria-label={t("search.placeholder")}
        className="h-9 pl-9 pr-8"
      />
      {value ? (
        <button
          type="button"
          onClick={() => {
            onChange("");
            inputRef.current?.focus();
          }}
          aria-label={t("search.clear")}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      ) : withShortcut ? (
        <kbd
          aria-hidden="true"
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground"
        >
          /
        </kbd>
      ) : null}
    </div>
  );
}
