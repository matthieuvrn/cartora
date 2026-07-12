"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Check, AlertTriangle, Circle, Plus, type LucideIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { MENU_LOCALE_LABELS, type MenuLocale } from "@/domain/menu/MenuLocale";
import type { TranslationFieldStatus } from "@/domain/menu/translationStatus";
import { saveTranslationsAction } from "@/app/(app)/app/actions";
import { PopIn } from "@/interface/ui/components/PopIn";
import { type ReviewUnit, cellKey, unitKey } from "./types";

/** Champ visible avec la répartition langues à traiter / langues à jour repliées. */
export type VisibleField = {
  unit: ReviewUnit;
  visibleLocales: MenuLocale[];
  freshLocales: MenuLocale[];
};

const STATUS_STYLE: Record<
  TranslationFieldStatus,
  { icon: LucideIcon; className: string; dot: string }
> = {
  fresh: { icon: Check, className: "text-success", dot: "bg-success" },
  stale: { icon: AlertTriangle, className: "text-warning", dot: "bg-warning" },
  missing: { icon: Circle, className: "text-muted-foreground", dot: "bg-muted-foreground/40" },
};

/** Statut le plus « urgent » de l'entité pour une langue (missing > stale > fresh). */
function aggregateStatus(statuses: TranslationFieldStatus[]): TranslationFieldStatus {
  if (statuses.includes("missing")) return "missing";
  if (statuses.includes("stale")) return "stale";
  return "fresh";
}

/**
 * Une entité (plat / plat du jour / formule / catégorie) = UNE carte. Le nom source
 * sert de titre ; en dessous, chaque champ (Nom, Description) montre son texte source
 * une seule fois puis ses langues cibles en lignes empilées (matrice verticale, scale
 * à N langues). Corrige le défaut historique « nom et description dans deux cartes ».
 */
export function EntityTranslationCard({
  title,
  fields,
  sourceLocale,
  activeLocales,
  getStatus,
  onStatusChange,
}: {
  title: string;
  fields: VisibleField[];
  sourceLocale: MenuLocale;
  activeLocales: MenuLocale[];
  getStatus: (key: string) => TranslationFieldStatus;
  onStatusChange: (unitKeyStr: string, locale: MenuLocale, status: TranslationFieldStatus) => void;
}) {
  const tField = useTranslations("Translations.field");
  const tStatus = useTranslations("Translations.status");

  // Cluster de statut par langue (survol du titre) : agrège tous les champs de l'entité.
  const pills = activeLocales.map((locale) => {
    const statuses = fields.map((f) => getStatus(cellKey(unitKey(f.unit), locale)));
    return { locale, status: aggregateStatus(statuses) };
  });

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
        <h4 className="display truncate text-base font-medium">{title}</h4>
        <div className="flex flex-wrap items-center gap-1.5">
          {pills.map(({ locale, status }) => (
            <span
              key={locale}
              className="inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-micro font-medium text-muted-foreground uppercase"
              title={`${MENU_LOCALE_LABELS[locale]} · ${tStatus(status)}`}
            >
              <span className={cn("size-1.5 rounded-full", STATUS_STYLE[status].dot)} aria-hidden />
              {locale}
            </span>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {fields.map((f) => (
          <FieldBlock
            key={unitKey(f.unit)}
            visible={f}
            fieldLabel={tField(f.unit.field)}
            sourceLocale={sourceLocale}
            getStatus={getStatus}
            onStatusChange={onStatusChange}
          />
        ))}
      </div>
    </div>
  );
}

function FieldBlock({
  visible,
  fieldLabel,
  sourceLocale,
  getStatus,
  onStatusChange,
}: {
  visible: VisibleField;
  fieldLabel: string;
  sourceLocale: MenuLocale;
  getStatus: (key: string) => TranslationFieldStatus;
  onStatusChange: (unitKeyStr: string, locale: MenuLocale, status: TranslationFieldStatus) => void;
}) {
  const t = useTranslations("Translations");
  const { unit, visibleLocales, freshLocales } = visible;
  const [expanded, setExpanded] = useState(false);
  const shownLocales = expanded ? [...visibleLocales, ...freshLocales] : visibleLocales;

  return (
    <div className="space-y-2">
      <div className="flex items-baseline gap-2">
        <span className="text-caption font-semibold text-muted-foreground uppercase">
          {fieldLabel}
        </span>
        <span
          className="min-w-0 flex-1 truncate text-sm text-muted-foreground"
          title={unit.sourceText}
        >
          <span className="text-micro uppercase">{sourceLocale}</span> · {unit.sourceText}
        </span>
      </div>

      <div className="space-y-2">
        {shownLocales.map((locale) => (
          <LocaleCell
            key={locale}
            unit={unit}
            locale={locale}
            status={getStatus(cellKey(unitKey(unit), locale))}
            onStatusChange={onStatusChange}
          />
        ))}
      </div>

      {freshLocales.length > 0 && !expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="inline-flex items-center gap-1 text-caption text-muted-foreground hover:text-foreground"
        >
          <Plus className="size-3.5" aria-hidden />
          {t("freshCollapsed", {
            count: freshLocales.length,
            langs: freshLocales.map((l) => l.toUpperCase()).join(", "),
          })}
        </button>
      )}
    </div>
  );
}

function LocaleCell({
  unit,
  locale,
  status,
  onStatusChange,
}: {
  unit: ReviewUnit;
  locale: MenuLocale;
  status: TranslationFieldStatus;
  onStatusChange: (unitKeyStr: string, locale: MenuLocale, status: TranslationFieldStatus) => void;
}) {
  const t = useTranslations("Translations");
  const tErrors = useTranslations("Errors");
  const key = unitKey(unit);
  const serverValue = unit.perLocale[locale]?.value ?? "";

  const [value, setValue] = useState(serverValue);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const dirty = useRef(false);
  const focused = useRef(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // La valeur serveur peut changer (auto-traduction) : on l'adopte SAUF si l'utilisateur
  // édite ce champ (focus/saisie non enregistrée).
  useEffect(() => {
    if (!focused.current && !dirty.current) setValue(serverValue);
  }, [serverValue]);

  useEffect(() => () => clearTimeout(savedTimer.current ?? undefined), []);

  const isLong = unit.field === "description";
  const inputId = `tr-${key}-${locale}`;
  const label = `${MENU_LOCALE_LABELS[locale]} — ${unit.field}`;
  const style = STATUS_STYLE[status];
  const StatusIcon = style.icon;

  const persist = async () => {
    if (!dirty.current) return;
    const next = value.trim();
    setSaving(true);
    const formData = new FormData();
    formData.set("locale", locale);
    formData.set(
      "entries",
      JSON.stringify([
        { entityType: unit.entityType, entityId: unit.entityId, field: unit.field, value: next },
      ]),
    );
    const result = await saveTranslationsAction({ error: null }, formData);
    setSaving(false);
    if (result.error !== null) {
      toast.error(tErrors(tErrors.has(result.error.code) ? result.error.code : "generic"));
      return; // dirty reste vrai : nouvelle tentative au prochain blur.
    }
    dirty.current = false;
    onStatusChange(key, locale, next ? "fresh" : "missing");
    setJustSaved(true);
    clearTimeout(savedTimer.current ?? undefined);
    savedTimer.current = setTimeout(() => setJustSaved(false), 2000);
  };

  const commonProps = {
    id: inputId,
    "aria-label": label,
    value,
    disabled: saving,
    onFocus: () => {
      focused.current = true;
    },
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      dirty.current = true;
      setValue(e.target.value);
    },
    onBlur: () => {
      focused.current = false;
      void persist();
    },
  };

  return (
    <div className="flex items-start gap-2">
      <span
        className="mt-2 inline-flex w-8 shrink-0 justify-center text-micro font-semibold text-muted-foreground uppercase"
        aria-hidden
      >
        {locale}
      </span>
      <div className="min-w-0 flex-1">
        {isLong ? <Textarea rows={2} {...commonProps} /> : <Input {...commonProps} />}
      </div>
      <span className="mt-2 flex w-5 shrink-0 justify-center" role="status">
        {justSaved ? (
          <PopIn className="text-success">
            <Check className="size-4" aria-label={t("fieldSaved")} />
          </PopIn>
        ) : (
          <StatusIcon className={cn("size-4", style.className)} aria-hidden />
        )}
      </span>
    </div>
  );
}
