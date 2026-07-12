"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Check,
  AlertTriangle,
  Circle,
  CircleCheck,
  Sparkles,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { MENU_LOCALE_LABELS, type MenuLocale } from "@/domain/menu/MenuLocale";
import type { LocaleCoverage, TranslationFieldStatus } from "@/domain/menu/translationStatus";
import {
  autoTranslateMenuAction,
  saveTranslationsAction,
  type AutoTranslateActionState,
} from "@/app/(app)/app/actions";
import { PopIn } from "@/interface/ui/components/PopIn";
import { PricingModal } from "@/interface/ui/components/PricingModal";

export type ReviewUnit = {
  entityType: string;
  entityId: string;
  field: string;
  sourceText: string;
  group: string;
  perLocale: Partial<Record<MenuLocale, { value: string; status: TranslationFieldStatus }>>;
};

type Props = {
  sourceLocale: MenuLocale;
  enabledLocales: MenuLocale[];
  units: ReviewUnit[];
  coverage: LocaleCoverage[];
  /** Traduction automatique (DeepL) — réservée PRO. */
  canAutoTranslate: boolean;
};

type StatusFilter = "todo" | "stale" | "missing" | "all";

function unitKey(u: { entityType: string; entityId: string; field: string }): string {
  return `${u.entityType}:${u.entityId}:${u.field}`;
}

const STATUS_BADGE: Record<
  TranslationFieldStatus,
  { variant: "success" | "warning" | "outline"; icon: LucideIcon }
> = {
  fresh: { variant: "success", icon: Check },
  stale: { variant: "warning", icon: AlertTriangle },
  missing: { variant: "outline", icon: Circle },
};

/** Champ « à faire » = à relire (stale) ou manquant (missing). */
function isTodo(status: TranslationFieldStatus): boolean {
  return status !== "fresh";
}

/**
 * Écran de revue des traductions (S4) : un onglet par langue activée, chacun étant
 * une liste de travail filtrable centrée sur « ce qui reste à faire ». Chaque champ
 * s'enregistre à la perte de focus (autosave), avec bascule de statut optimiste et
 * feedback par toast — aligné sur l'éditeur « Ma carte ».
 */
export function TranslationReviewTable({
  sourceLocale,
  enabledLocales,
  units,
  coverage,
  canAutoTranslate,
}: Props) {
  const t = useTranslations("Translations");

  // Reste à relire par langue : la couverture serveur donne la valeur initiale, mais
  // l'autosave par champ ne refetch plus (optimisation) — l'onglet actif publie donc
  // son compteur live via `onRemainingChange` pour que le badge reste juste.
  const [liveRemaining, setLiveRemaining] = useState<Partial<Record<MenuLocale, number>>>({});
  const onRemainingChange = useCallback((locale: MenuLocale, remaining: number) => {
    setLiveRemaining((prev) =>
      prev[locale] === remaining ? prev : { ...prev, [locale]: remaining },
    );
  }, []);

  if (enabledLocales.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("noLocaleEnabled")}</p>;
  }

  const coverageRemaining = new Map(coverage.map((c) => [c.locale, c.stale + c.missing] as const));

  return (
    <Tabs defaultValue={enabledLocales[0]}>
      <TabsList>
        {enabledLocales.map((locale) => {
          const remaining = liveRemaining[locale] ?? coverageRemaining.get(locale) ?? 0;
          return (
            <TabsTrigger key={locale} value={locale} className="gap-2">
              {MENU_LOCALE_LABELS[locale]}
              {remaining > 0 && (
                <span
                  className="inline-flex min-w-4 items-center justify-center rounded-full bg-warning/15 px-1 text-[0.6875rem] font-medium text-warning tabular-nums"
                  aria-label={t("remaining", { count: remaining })}
                >
                  {remaining}
                </span>
              )}
            </TabsTrigger>
          );
        })}
      </TabsList>

      {enabledLocales.map((locale) => (
        <TabsContent key={locale} value={locale}>
          <LocalePanel
            locale={locale}
            sourceLocale={sourceLocale}
            units={units}
            canAutoTranslate={canAutoTranslate}
            onRemainingChange={onRemainingChange}
          />
        </TabsContent>
      ))}
    </Tabs>
  );
}

function LocalePanel({
  locale,
  sourceLocale,
  units,
  canAutoTranslate,
  onRemainingChange,
}: {
  locale: MenuLocale;
  sourceLocale: MenuLocale;
  units: ReviewUnit[];
  canAutoTranslate: boolean;
  onRemainingChange: (locale: MenuLocale, remaining: number) => void;
}) {
  const t = useTranslations("Translations");
  const tErrors = useTranslations("Errors");
  const router = useRouter();

  const [filter, setFilter] = useState<StatusFilter>("todo");
  const [pricingOpen, setPricingOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Statut courant par champ — source de vérité des compteurs/filtres/progression.
  // Réinitialisé depuis le serveur quand `units` change (ex. après auto-traduction),
  // et basculé optimistiquement à l'enregistrement d'un champ. La resynchro se fait
  // en phase de rendu (pattern React « ajuster l'état quand une prop change »),
  // pas dans un effet.
  const computeStatuses = () =>
    Object.fromEntries(
      units.map((u) => [unitKey(u), u.perLocale[locale]?.status ?? "missing"]),
    ) as Record<string, TranslationFieldStatus>;
  const [statuses, setStatuses] = useState<Record<string, TranslationFieldStatus>>(computeStatuses);
  const [syncedUnits, setSyncedUnits] = useState(units);
  if (syncedUnits !== units) {
    setSyncedUnits(units);
    setStatuses(computeStatuses());
  }

  const onStatusChange = useCallback((key: string, status: TranslationFieldStatus) => {
    setStatuses((prev) => (prev[key] === status ? prev : { ...prev, [key]: status }));
  }, []);

  const counts = useMemo(() => {
    let fresh = 0;
    let stale = 0;
    let missing = 0;
    for (const u of units) {
      const s = statuses[unitKey(u)] ?? "missing";
      if (s === "fresh") fresh += 1;
      else if (s === "stale") stale += 1;
      else missing += 1;
    }
    return { fresh, stale, missing, total: units.length, todo: stale + missing };
  }, [units, statuses]);

  // Publie le reste à relire vers le parent pour garder le badge d'onglet à jour
  // sans refetch serveur (l'autosave ne revalide plus).
  useEffect(() => {
    onRemainingChange(locale, counts.todo);
  }, [counts.todo, locale, onRemainingChange]);

  const [isAutoPending, startAuto] = useTransition();
  const runAutoTranslate = useCallback(() => {
    startAuto(async () => {
      const formData = new FormData();
      formData.set("targetLocale", locale);
      const prev: AutoTranslateActionState = { error: null };
      const result = await autoTranslateMenuAction(prev, formData);
      if (result.error !== null) {
        toast.error(tErrors(tErrors.has(result.error.code) ? result.error.code : "generic"));
        return;
      }
      toast.success(
        t("autoTranslateResult", {
          translated: result.translatedCount ?? 0,
          skipped: result.skippedCount ?? 0,
        }),
      );
      // Recharge les données serveur : les champs sont déjà persistés individuellement
      // (autosave), donc aucune saisie non enregistrée n'est perdue.
      router.refresh();
    });
  }, [locale, router, t, tErrors]);

  // Regroupement par `group`, ordre de première apparition, après filtrage par statut.
  const groups = useMemo(() => {
    const matches = (status: TranslationFieldStatus) => {
      if (filter === "all") return true;
      if (filter === "todo") return isTodo(status);
      return status === filter;
    };
    const map = new Map<string, ReviewUnit[]>();
    for (const u of units) {
      if (!matches(statuses[unitKey(u)] ?? "missing")) continue;
      const list = map.get(u.group);
      if (list) list.push(u);
      else map.set(u.group, [u]);
    }
    return [...map.entries()];
  }, [units, statuses, filter]);

  const groupLabel = (group: string) => {
    if (group === "categories") return t("groupCategories");
    if (group === "today") return t("groupToday");
    if (group === "formulas") return t("groupFormulas");
    return group;
  };

  const pct = counts.total === 0 ? 100 : Math.round((counts.fresh / counts.total) * 100);

  const filters: { value: StatusFilter; label: string; count: number }[] = [
    { value: "todo", label: t("filters.todo"), count: counts.todo },
    { value: "stale", label: t("filters.stale"), count: counts.stale },
    { value: "missing", label: t("filters.missing"), count: counts.missing },
    { value: "all", label: t("filters.all"), count: counts.total },
  ];

  return (
    <div className="space-y-6 pt-4">
      {/* Progression + filtres */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-[width] duration-300 ease-[var(--ease-out-expo)]"
              style={{ width: `${pct}%` }}
              aria-hidden
            />
          </div>
          <span className="text-caption text-muted-foreground tabular-nums">
            {t("progress", { fresh: counts.fresh, total: counts.total })}
          </span>
        </div>

        <div className="flex flex-wrap gap-2" role="group" aria-label={t("filters.all")}>
          {filters.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              aria-pressed={filter === f.value}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors",
                filter === f.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:bg-accent",
              )}
            >
              {f.label}
              <span className="tabular-nums opacity-70">{f.count}</span>
            </button>
          ))}
        </div>
      </div>

      {groups.length === 0 ? (
        <p className="flex items-center gap-2 rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          <CircleCheck className="size-4 text-success" aria-hidden />
          {t("filterEmpty")}
        </p>
      ) : (
        groups.map(([group, groupUnits]) => (
          <section key={group} className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">{groupLabel(group)}</h3>
            <ul className="space-y-3">
              {groupUnits.map((u) => {
                const key = unitKey(u);
                return (
                  <FieldRow
                    key={key}
                    unitKey={key}
                    field={u.field}
                    sourceText={u.sourceText}
                    sourceLocale={sourceLocale}
                    locale={locale}
                    serverValue={u.perLocale[locale]?.value ?? ""}
                    status={statuses[key] ?? "missing"}
                    entityType={u.entityType}
                    entityId={u.entityId}
                    onStatusChange={onStatusChange}
                  />
                );
              })}
            </ul>
          </section>
        ))
      )}

      {/* Barre d'action collante : reste de travail + auto-traduction. */}
      <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-background/95 px-4 py-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <span className="text-sm text-muted-foreground">
          {t("remaining", { count: counts.todo })}
        </span>
        <div className="flex items-center gap-2">
          {!canAutoTranslate && (
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {t("autoTranslateLockedHint")}
            </span>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isAutoPending}
            onClick={() => (canAutoTranslate ? setConfirmOpen(true) : setPricingOpen(true))}
          >
            {isAutoPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Sparkles className="size-4" aria-hidden />
            )}
            {isAutoPending ? t("autoTranslating") : t("autoTranslate")}
          </Button>
        </div>
      </div>

      <PricingModal open={pricingOpen} onOpenChange={setPricingOpen} />

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t("autoTranslateConfirmTitle", { language: MENU_LOCALE_LABELS[locale] })}
            </DialogTitle>
            <DialogDescription>
              {t("autoTranslateConfirmBody", { count: counts.todo })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              {t("cancel")}
            </Button>
            <Button
              disabled={counts.todo === 0}
              onClick={() => {
                setConfirmOpen(false);
                runAutoTranslate();
              }}
            >
              <Sparkles className="size-4" aria-hidden />
              {t("autoTranslateConfirmCta")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FieldRow({
  unitKey: key,
  field,
  sourceText,
  sourceLocale,
  locale,
  serverValue,
  status,
  entityType,
  entityId,
  onStatusChange,
}: {
  unitKey: string;
  field: string;
  sourceText: string;
  sourceLocale: MenuLocale;
  locale: MenuLocale;
  serverValue: string;
  status: TranslationFieldStatus;
  entityType: string;
  entityId: string;
  onStatusChange: (key: string, status: TranslationFieldStatus) => void;
}) {
  const t = useTranslations("Translations");
  const tField = useTranslations("Translations.field");
  const tStatus = useTranslations("Translations.status");
  const tErrors = useTranslations("Errors");

  const [value, setValue] = useState(serverValue);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const dirty = useRef(false);
  const focused = useRef(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // La valeur serveur peut changer (auto-traduction) : on l'adopte SAUF si
  // l'utilisateur est en train d'éditer ce champ (focus/saisie non enregistrée).
  useEffect(() => {
    if (!focused.current && !dirty.current) setValue(serverValue);
  }, [serverValue]);

  useEffect(() => () => clearTimeout(savedTimer.current ?? undefined), []);

  const badge = STATUS_BADGE[status];
  const Icon = badge.icon;
  const isLong = field === "description";
  const inputId = `tr-${key}-${locale}`;
  const fieldName = field === "description" ? "description" : "name";
  const label = `${MENU_LOCALE_LABELS[locale]} — ${tField(fieldName)}`;

  const persist = async () => {
    if (!dirty.current) return;
    const next = value.trim();
    setSaving(true);
    const formData = new FormData();
    formData.set("locale", locale);
    formData.set("entries", JSON.stringify([{ entityType, entityId, field, value: next }]));
    const result = await saveTranslationsAction({ error: null }, formData);
    setSaving(false);
    if (result.error !== null) {
      toast.error(tErrors(tErrors.has(result.error.code) ? result.error.code : "generic"));
      return; // dirty reste vrai : nouvelle tentative au prochain blur.
    }
    dirty.current = false;
    onStatusChange(key, next ? "fresh" : "missing");
    setJustSaved(true);
    clearTimeout(savedTimer.current ?? undefined);
    savedTimer.current = setTimeout(() => setJustSaved(false), 2000);
  };

  return (
    <li className="grid gap-2 rounded-md border p-3 sm:grid-cols-2">
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">{MENU_LOCALE_LABELS[sourceLocale]}</p>
        <p className="whitespace-pre-line text-sm">{sourceText}</p>
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor={inputId} className="text-xs text-muted-foreground">
            {MENU_LOCALE_LABELS[locale]}
          </label>
          <span className="flex items-center gap-2">
            {justSaved && (
              <span className="flex items-center gap-1 text-xs text-success" role="status">
                <PopIn>
                  <Check className="size-3.5" aria-hidden />
                </PopIn>
                {t("fieldSaved")}
              </span>
            )}
            <Badge variant={badge.variant}>
              <Icon aria-hidden />
              {tStatus(status)}
            </Badge>
          </span>
        </div>
        {isLong ? (
          <Textarea
            id={inputId}
            aria-label={label}
            value={value}
            rows={3}
            disabled={saving}
            onFocus={() => (focused.current = true)}
            onChange={(e) => {
              dirty.current = true;
              setValue(e.target.value);
            }}
            onBlur={() => {
              focused.current = false;
              void persist();
            }}
          />
        ) : (
          <Input
            id={inputId}
            aria-label={label}
            value={value}
            disabled={saving}
            onFocus={() => (focused.current = true)}
            onChange={(e) => {
              dirty.current = true;
              setValue(e.target.value);
            }}
            onBlur={() => {
              focused.current = false;
              void persist();
            }}
          />
        )}
      </div>
    </li>
  );
}
