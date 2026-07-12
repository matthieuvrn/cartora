"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MENU_LOCALE_LABELS, type MenuLocale } from "@/domain/menu/MenuLocale";
import type { TranslationFieldStatus } from "@/domain/menu/translationStatus";
import { groupTranslationUnits } from "@/domain/menu/translationGroups";
import { TranslationStatusBar } from "./TranslationStatusBar";
import { EntityTranslationCard, type VisibleField } from "./EntityTranslationCard";
import {
  type Filter,
  type LocaleCount,
  type ReviewUnit,
  type Scope,
  cellKey,
  unitKey,
} from "./types";

type Props = {
  sourceLocale: MenuLocale;
  enabledLocales: MenuLocale[];
  units: ReviewUnit[];
  canAutoTranslate: boolean;
};

type VisibleEntity = {
  entityType: string;
  entityId: string;
  title: string;
  fields: VisibleField[];
};

type VisibleSection = {
  key: string;
  labelKey: "categories" | "today" | "formulas" | null;
  entities: VisibleEntity[];
};

/**
 * Construit le worklist affiché (sections → entités → champs visibles) pour un
 * périmètre (`scope`) et un filtre donnés. En mode « à relire » (`todo`), chaque
 * champ ne montre que ses langues non à jour ; les langues à jour sont repliées
 * (`freshLocales`). Un champ/une entité/une section sans langue à traiter est masqué —
 * la hauteur du worklist ∝ travail restant, pas au nombre de langues.
 */
function computeWorklist(
  units: ReviewUnit[],
  enabledLocales: MenuLocale[],
  scope: Scope,
  filter: Filter,
  statuses: Record<string, TranslationFieldStatus>,
): VisibleSection[] {
  const activeLocales = scope === "all" ? enabledLocales : [scope];
  const result: VisibleSection[] = [];
  for (const section of groupTranslationUnits(units)) {
    const entities: VisibleEntity[] = [];
    for (const entity of section.entities) {
      const fields: VisibleField[] = [];
      for (const unit of entity.fields) {
        const uk = unitKey(unit);
        let visibleLocales: MenuLocale[];
        let freshLocales: MenuLocale[];
        if (filter === "all") {
          visibleLocales = activeLocales;
          freshLocales = [];
        } else {
          visibleLocales = [];
          freshLocales = [];
          for (const locale of activeLocales) {
            if ((statuses[cellKey(uk, locale)] ?? "missing") === "fresh") freshLocales.push(locale);
            else visibleLocales.push(locale);
          }
        }
        if (visibleLocales.length > 0) fields.push({ unit, visibleLocales, freshLocales });
      }
      if (fields.length > 0) {
        entities.push({
          entityType: entity.entityType,
          entityId: entity.entityId,
          title: entity.title,
          fields,
        });
      }
    }
    if (entities.length > 0) {
      result.push({ key: section.key, labelKey: section.labelKey, entities });
    }
  }
  return result;
}

/**
 * Orchestrateur de l'écran de revue (S4, refonte 2026). Détient l'état LIVE des
 * statuts (source de vérité unique — plus de compteurs divergents), le périmètre de
 * langues (`scope`) et le filtre (`todo`/`all`). Le worklist est « figé » par
 * sélection : compléter un champ ne le fait pas disparaître sous le curseur ; il
 * se recalcule au changement de filtre/scope ou au rechargement serveur.
 */
export function TranslationWorkspace({
  sourceLocale,
  enabledLocales,
  units,
  canAutoTranslate,
}: Props) {
  const t = useTranslations("Translations");

  const [scope, setScope] = useState<Scope>("all");
  const [filter, setFilter] = useState<Filter>("todo");

  // Statuts live par cellule (champ × langue) — resynchronisés depuis le serveur quand
  // `units` change (auto-traduction) via le pattern « ajuster l'état au changement de prop ».
  const computeStatuses = useCallback(() => {
    const map: Record<string, TranslationFieldStatus> = {};
    for (const u of units) {
      const uk = unitKey(u);
      for (const locale of enabledLocales) {
        map[cellKey(uk, locale)] = u.perLocale[locale]?.status ?? "missing";
      }
    }
    return map;
  }, [units, enabledLocales]);

  const [statuses, setStatuses] = useState<Record<string, TranslationFieldStatus>>(computeStatuses);

  // Worklist « figé » : recalculé UNIQUEMENT au changement de units/scope/filter (jamais
  // au changement de statut) — compléter un champ ne le fait pas disparaître sous le curseur,
  // il garde sa coche verte jusqu'au prochain (re)filtrage ou rechargement serveur.
  const [worklist, setWorklist] = useState<VisibleSection[]>(() =>
    computeWorklist(units, enabledLocales, scope, filter, computeStatuses()),
  );
  const [sync, setSync] = useState({ units, scope, filter });
  if (sync.units !== units) {
    // Rechargement serveur (auto-traduction) : reset complet depuis les nouvelles données.
    const next = computeStatuses();
    setStatuses(next);
    setWorklist(computeWorklist(units, enabledLocales, scope, filter, next));
    setSync({ units, scope, filter });
  } else if (sync.scope !== scope || sync.filter !== filter) {
    // Changement de périmètre/filtre : re-fige le worklist depuis les statuts courants.
    setWorklist(computeWorklist(units, enabledLocales, scope, filter, statuses));
    setSync({ units, scope, filter });
  }

  const getStatus = (key: string): TranslationFieldStatus => statuses[key] ?? "missing";

  const onStatusChange = useCallback(
    (uk: string, locale: MenuLocale, status: TranslationFieldStatus) => {
      const key = cellKey(uk, locale);
      setStatuses((prev) => (prev[key] === status ? prev : { ...prev, [key]: status }));
    },
    [],
  );

  // Couverture live par langue (dérivée des statuts) — alimente la status bar et les chips.
  const coverageLive = useMemo<LocaleCount[]>(() => {
    return enabledLocales.map((locale) => {
      const counts = { locale, total: units.length, fresh: 0, stale: 0, missing: 0 };
      for (const u of units) {
        counts[statuses[cellKey(unitKey(u), locale)] ?? "missing"] += 1;
      }
      return counts;
    });
  }, [enabledLocales, units, statuses]);

  const activeLocales = scope === "all" ? enabledLocales : [scope];
  const sections = worklist;

  const sectionLabel = (section: VisibleSection) => {
    if (section.labelKey === "categories") return t("groupCategories");
    if (section.labelKey === "today") return t("groupToday");
    if (section.labelKey === "formulas") return t("groupFormulas");
    return section.key;
  };

  const isEmpty = sections.length === 0;

  return (
    <div className="space-y-6">
      <TranslationStatusBar
        enabledLocales={enabledLocales}
        scope={scope}
        coverageLive={coverageLive}
        canAutoTranslate={canAutoTranslate}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        {enabledLocales.length >= 2 ? (
          <div
            className="flex flex-wrap items-center gap-1.5"
            role="group"
            aria-label={t("scopeLabel")}
          >
            <ScopeChip active={scope === "all"} onClick={() => setScope("all")}>
              {t("scopeAll")}
            </ScopeChip>
            {enabledLocales.map((locale) => {
              const c = coverageLive.find((x) => x.locale === locale);
              const remaining = c ? c.stale + c.missing : 0;
              return (
                <ScopeChip key={locale} active={scope === locale} onClick={() => setScope(locale)}>
                  {MENU_LOCALE_LABELS[locale]}
                  {remaining > 0 && (
                    <span className="inline-flex min-w-4 items-center justify-center rounded-full bg-warning/15 px-1 text-micro font-medium text-warning tabular-nums">
                      {remaining}
                    </span>
                  )}
                </ScopeChip>
              );
            })}
          </div>
        ) : (
          <div />
        )}

        <div
          className="inline-flex rounded-full border p-0.5"
          role="group"
          aria-label={t("filterLabel")}
        >
          <FilterTab active={filter === "todo"} onClick={() => setFilter("todo")}>
            {t("filters.stale")}
          </FilterTab>
          <FilterTab active={filter === "all"} onClick={() => setFilter("all")}>
            {t("filters.all")}
          </FilterTab>
        </div>
      </div>

      {isEmpty ? (
        <div className="rounded-xl border border-dashed py-12 text-center">
          <p className="text-body font-medium">{t("allUpToDate")}</p>
          {filter === "todo" && (
            <Button variant="outline" size="sm" className="mt-3" onClick={() => setFilter("all")}>
              {t("seeAll")}
            </Button>
          )}
        </div>
      ) : (
        sections.map((section) => (
          <section key={section.key} className="space-y-3">
            <h3 className="text-caption font-semibold text-muted-foreground uppercase">
              {sectionLabel(section)}
            </h3>
            <div className="space-y-3">
              {section.entities.map((entity) => (
                <EntityTranslationCard
                  key={`${entity.entityType}:${entity.entityId}`}
                  title={entity.title}
                  fields={entity.fields}
                  sourceLocale={sourceLocale}
                  activeLocales={activeLocales}
                  getStatus={getStatus}
                  onStatusChange={onStatusChange}
                />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

function ScopeChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-muted-foreground hover:bg-accent",
      )}
    >
      {children}
    </button>
  );
}

function FilterTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full px-3 py-1 text-sm transition-colors",
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent",
      )}
    >
      {children}
    </button>
  );
}
