"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  CornerDownLeft,
  LayoutList,
  Search,
  UtensilsCrossed,
  X,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  filterPaletteEntries,
  nextActiveIndex,
  type PaletteEntry,
  type PaletteNavKey,
} from "@/lib/command-palette";
import { cn } from "@/lib/utils";
import { APP_NAV_ICONS } from "./app/appNavIcons";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Entrées construites par MenuEditor (`buildPaletteEntries`), libellés déjà résolus. */
  entries: readonly PaletteEntry[];
  /**
   * Appelé APRÈS la fermeture complète du dialog (cf. `onCloseAutoFocus`) — le parent défile,
   * focalise ou navigue.
   */
  onSelect: (entry: PaletteEntry) => void;
};

// Les icônes de nav viennent du module dédié (les données, elles, viennent de `@/lib/app-nav`) ;
// l'indexation par `navKey` reste défensive : une entrée inconnue retombe sur l'icône générique.
const NAV_ICONS = APP_NAV_ICONS as Record<string, LucideIcon>;

function entryIcon(entry: PaletteEntry): LucideIcon {
  if (entry.kind === "item") return UtensilsCrossed;
  if (entry.kind === "category") return LayoutList;
  return NAV_ICONS[entry.navKey] ?? LayoutList;
}

/**
 * Palette de commandes de l'éditeur (⌘K / Ctrl+K) — pattern APG « combobox avec listbox popup »
 * posé sur notre primitive Dialog (contenu porté ⇒ classe `theme-app` claire via `brandScope`,
 * anneau de focus de marque). PAS de dépendance `cmdk` : son scorer flou serait de toute façon
 * désactivé au profit de `matchesQuery` (accent-insensible, testé), son `Command.Dialog`
 * contournerait notre `DialogContent`, et toute la logique utile (construction, filtrage,
 * classement, plafonds, navigation d'index) est du TS pur testé dans `@/lib/command-palette`.
 *
 * Séquencement du focus : la sélection n'est exécutée qu'une fois le dialog fermé, dans
 * `onCloseAutoFocus` — sans quoi Radix rendrait le focus au déclencheur et écraserait celui posé
 * sur la rangée ciblée. Pour une PAGE on laisse au contraire Radix faire son travail avant la
 * navigation (sinon le focus tomberait sur `<body>`).
 *
 * Sélectionner un plat ou une catégorie VIDE la recherche « / » en cours (cf. MenuEditor) :
 * perte d'état assumée, c'est le prix du retour au canvas complet.
 */
export function CommandPalette({ open, onOpenChange, entries, onSelect }: Props) {
  const t = useTranslations("Dashboard");
  const pendingRef = useRef<PaletteEntry | null>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        aria-describedby={undefined}
        className="top-[15%] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-xl"
        onCloseAutoFocus={(event) => {
          const entry = pendingRef.current;
          if (!entry) return;
          pendingRef.current = null;
          // Cible interne à l'éditeur : on garde la main sur le focus (la rangée / la carte).
          // Pour une page, Radix rend le focus au déclencheur avant que la navigation parte.
          if (entry.kind !== "page") event.preventDefault();
          onSelect(entry);
        }}
      >
        <DialogTitle className="sr-only">{t("palette.title")}</DialogTitle>
        {/* Démonté à la fermeture ⇒ requête et index repartent à zéro sans effet dédié. */}
        <PaletteBody
          entries={entries}
          onCommit={(entry) => {
            pendingRef.current = entry;
            onOpenChange(false);
          }}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function PaletteBody({
  entries,
  onCommit,
  onClose,
}: {
  entries: readonly PaletteEntry[];
  onCommit: (entry: PaletteEntry) => void;
  onClose: () => void;
}) {
  const t = useTranslations("Dashboard");
  const baseId = useId();
  const listboxId = `${baseId}-listbox`;
  const optionId = (index: number) => `${baseId}-opt-${index}`;

  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  // Dernières coordonnées du pointeur : un défilement programmatique resynthétise des événements
  // pointeur, qui feraient sauter l'option active pendant une navigation ↑↓.
  const pointerRef = useRef<{ x: number; y: number } | null>(null);

  const groups = useMemo(() => filterPaletteEntries(entries, query), [entries, query]);
  const flat = useMemo(() => groups.flatMap((group) => group.entries), [groups]);
  const active = flat[activeIndex] ?? null;
  const trimmedQuery = query.trim();

  useEffect(() => {
    document.getElementById(`${baseId}-opt-${activeIndex}`)?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, baseId, flat.length]);

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (
      event.key === "ArrowDown" ||
      event.key === "ArrowUp" ||
      event.key === "Home" ||
      event.key === "End"
    ) {
      event.preventDefault();
      setActiveIndex(nextActiveIndex(activeIndex, event.key as PaletteNavKey, flat.length));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (active) onCommit(active);
      return;
    }
    // ⌘K dans la palette = bascule : on referme (le raccourci global ignore les dialogs ouverts).
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      onClose();
    }
  }

  return (
    <>
      {/* Région live PERSISTANTE (montée avant tout contenu, donc annoncée de façon fiable) : le
          nombre de résultats ou l'absence de résultat, pendant la frappe. */}
      <p role="status" aria-live="polite" className="sr-only">
        {flat.length > 0
          ? t("search.results", { count: flat.length })
          : trimmedQuery.length > 0
            ? t("search.noResults", { query: trimmedQuery })
            : ""}
      </p>

      {/* `py-1.5` : l'anneau de focus de marque est un box-shadow de 4 px HORS boîte — sans cette
          marge, le `overflow-hidden` du dialog le tranche net contre le bord supérieur (même
          précaution que dans le rail). `rounded-md` aligne l'anneau sur le rayon du champ. */}
      <div className="flex items-center gap-2 border-b px-3 py-1.5">
        <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <input
          role="combobox"
          aria-expanded={flat.length > 0}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={active ? optionId(activeIndex) : undefined}
          aria-label={t("palette.placeholder")}
          placeholder={t("palette.placeholder")}
          autoComplete="off"
          spellCheck={false}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(0);
          }}
          onKeyDown={handleKeyDown}
          className="h-11 w-full min-w-0 rounded-md bg-transparent text-base outline-hidden placeholder:text-muted-foreground md:text-sm"
        />
        <kbd
          aria-hidden="true"
          className="hidden rounded border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground sm:block"
        >
          Esc
        </kbd>
        {/* Sous `sm`, le kbd et le pied d'aide sont masqués : une fermeture TACTILE reste nécessaire. */}
        <DialogClose asChild>
          <Button
            variant="ghost"
            size="icon-xs"
            className="shrink-0 sm:hidden"
            aria-label={t("palette.hint.close")}
          >
            <X aria-hidden="true" />
          </Button>
        </DialogClose>
      </div>

      <div className="max-h-[min(60vh,24rem)] overflow-y-auto p-2">
        <div role="listbox" id={listboxId} aria-label={t("palette.title")}>
          {groups.map((group) => (
            <div key={group.kind} role="group" aria-labelledby={`${baseId}-g-${group.kind}`}>
              {/* En-tête visible mais `aria-hidden` : référencé explicitement, il nomme le groupe
                  sans être relu comme une option. */}
              <div
                id={`${baseId}-g-${group.kind}`}
                aria-hidden="true"
                className="px-2 py-1.5 font-mono text-micro text-muted-foreground uppercase"
              >
                {t(`palette.group.${group.kind}`)}
              </div>
              {group.entries.map((entry) => {
                const index = flat.indexOf(entry);
                const isActive = index === activeIndex;
                const Icon = entryIcon(entry);
                return (
                  <button
                    key={entry.id}
                    id={optionId(index)}
                    type="button"
                    role="option"
                    tabIndex={-1}
                    aria-selected={isActive}
                    aria-setsize={flat.length}
                    aria-posinset={index + 1}
                    onPointerMove={(event) => {
                      const last = pointerRef.current;
                      pointerRef.current = { x: event.clientX, y: event.clientY };
                      // Le pointeur ne prend la main qu'après un DÉPLACEMENT réel : un défilement
                      // programmatique (navigation ↑↓) resynthétise un `pointermove` aux mêmes
                      // coordonnées — et le tout premier événement, sans position antérieure à
                      // comparer, peut lui aussi être synthétisé. On ignore donc les deux.
                      if (!last || (last.x === event.clientX && last.y === event.clientY)) return;
                      if (!isActive) setActiveIndex(index);
                    }}
                    onClick={() => onCommit(entry)}
                    className={cn(
                      "flex min-h-11 w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm transition-colors ease-[var(--ease-snappy)]",
                      isActive && "bg-accent text-accent-foreground",
                    )}
                  >
                    <Icon
                      className="size-4 shrink-0 text-muted-foreground"
                      strokeWidth={1.75}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1 truncate">{entry.label}</span>
                    {entry.kind === "item" && !entry.isAvailable && (
                      <Badge variant="outline">{t("unavailable")}</Badge>
                    )}
                    {entry.kind === "item" && (
                      <span className="max-w-[40%] shrink-0 truncate text-caption text-muted-foreground">
                        {entry.categoryName}
                      </span>
                    )}
                    {entry.kind === "category" && (
                      <span className="shrink-0 font-mono text-caption text-muted-foreground tabular-nums">
                        {t("palette.itemCount", { count: entry.itemCount })}
                      </span>
                    )}
                    {/* Indice non chromatique de l'option active (jamais la couleur seule). */}
                    {isActive && (
                      <kbd
                        aria-hidden="true"
                        className="rounded border bg-background px-1 font-mono text-[10px] text-muted-foreground"
                      >
                        <CornerDownLeft className="size-3" />
                      </kbd>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        {flat.length === 0 && (
          <p className="px-3 py-8 text-center text-body-sm text-muted-foreground">
            {t("search.noResults", { query: trimmedQuery })}
          </p>
        )}
      </div>

      <div
        aria-hidden="true"
        className="hidden items-center gap-4 border-t px-3 py-2 font-mono text-[10px] text-muted-foreground sm:flex"
      >
        <span>
          <kbd className="rounded border bg-muted px-1">↑↓</kbd> {t("palette.hint.navigate")}
        </span>
        <span>
          <kbd className="rounded border bg-muted px-1">↵</kbd> {t("palette.hint.go")}
        </span>
        <span>
          <kbd className="rounded border bg-muted px-1">Esc</kbd> {t("palette.hint.close")}
        </span>
      </div>
    </>
  );
}
