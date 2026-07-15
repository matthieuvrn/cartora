"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { updateBrandColorsAction } from "@/app/(app)/app/actions";
import { BrandingPolicy } from "@/domain/restaurant/BrandingPolicy";

type PresetKey =
  | "default"
  | "noirOr"
  | "marineCuivre"
  | "foretSable"
  | "bordeauxCreme"
  | "charbonMint"
  | "ardoiseSaumon"
  | "indigoBle"
  | "terracottaIvoire";

type Preset = {
  key: PresetKey;
  primary: string | null;
  accent: string | null;
  background: string | null;
};

const PRESETS: Preset[] = [
  { key: "default", primary: null, accent: null, background: null },
  { key: "noirOr", primary: "#0a0a0a", accent: "#d4a017", background: "#fafaf9" },
  { key: "marineCuivre", primary: "#0f2a44", accent: "#b87333", background: "#fdf6ef" },
  { key: "foretSable", primary: "#1f3d2b", accent: "#c2a878", background: "#f5efe3" },
  { key: "bordeauxCreme", primary: "#5a1a1a", accent: "#8a2c2c", background: "#fbf5ec" },
  { key: "charbonMint", primary: "#1f2937", accent: "#4fb3a4", background: "#fdfffd" },
  { key: "ardoiseSaumon", primary: "#334155", accent: "#e89074", background: "#fdf5f1" },
  { key: "indigoBle", primary: "#312e81", accent: "#d4b87c", background: "#fdfbf3" },
  { key: "terracottaIvoire", primary: "#8a3b1f", accent: "#c4592a", background: "#fbf5e8" },
];

type Props = {
  initialPrimary: string | null;
  initialAccent: string | null;
  initialBackground: string | null;
};

export function BrandColorsEditor({ initialPrimary, initialAccent, initialBackground }: Props) {
  const t = useTranslations("Settings.branding.colors");
  const tErrors = useTranslations("Errors");

  const [primary, setPrimary] = useState<string | null>(initialPrimary);
  const [accent, setAccent] = useState<string | null>(initialAccent);
  const [background, setBackground] = useState<string | null>(initialBackground);
  const [advanced, setAdvanced] = useState(false);
  const [forceLowContrast, setForceLowContrast] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedPresetKey = useMemo(() => {
    return (
      PRESETS.find(
        (p) => p.primary === primary && p.accent === accent && p.background === background,
      )?.key ?? null
    );
  }, [primary, accent, background]);

  // Garde-fou render : `meetsContrastAA` throw sur un hex malformé, or le champ
  // texte propage la saisie partielle (`#`, `#5a`…) au state. On ne calcule le
  // contraste que sur deux hex complets et valides.
  const lowContrast =
    primary != null &&
    background != null &&
    BrandingPolicy.isValidHexColor(primary) &&
    BrandingPolicy.isValidHexColor(background) &&
    !BrandingPolicy.meetsContrastAA(primary, background);

  const applyPreset = (preset: Preset) => {
    setPrimary(preset.primary);
    setAccent(preset.accent);
    setBackground(preset.background);
    setSuccess(false);
    setError(null);
    setForceLowContrast(false);
  };

  const reset = () => {
    setPrimary(null);
    setAccent(null);
    setBackground(null);
    setForceLowContrast(false);
  };

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(false);
    const form = event.currentTarget;
    startTransition(async () => {
      const formData = new FormData(form);
      const result = await updateBrandColorsAction({ error: null }, formData);
      if (result.error) {
        setError(
          tErrors(result.error.code as "invalid_brand_color" | "low_brand_contrast" | "validation"),
        );
        return;
      }
      setSuccess(true);
    });
  };

  return (
    <form className="space-y-6" onSubmit={onSubmit}>
      <input type="hidden" name="primary" value={primary ?? ""} />
      <input type="hidden" name="accent" value={accent ?? ""} />
      <input type="hidden" name="background" value={background ?? ""} />
      <input type="hidden" name="forceLowContrast" value={forceLowContrast ? "true" : "false"} />

      <section className="space-y-3">
        <h3 className="text-sm font-medium">{t("presets")}</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {PRESETS.map((preset) => (
            <PresetSwatch
              key={preset.key}
              preset={preset}
              label={t(`presetLabels.${preset.key}`)}
              selected={selectedPresetKey === preset.key}
              onSelect={() => applyPreset(preset)}
            />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="advanced-toggle" className="cursor-pointer">
            {t("advanced")}
          </Label>
          <Switch id="advanced-toggle" checked={advanced} onCheckedChange={setAdvanced} />
        </div>
        {advanced && <p className="text-xs text-muted-foreground">{t("advancedHint")}</p>}

        {advanced && (
          <div className="space-y-4 rounded-md border bg-muted/40 p-4">
            <ColorField
              label={t("primary")}
              hint={t("primaryHint")}
              value={primary}
              onChange={(v) => {
                setPrimary(v);
                setSuccess(false);
              }}
            />
            <ColorField
              label={t("accent")}
              hint={t("accentHint")}
              value={accent}
              onChange={(v) => {
                setAccent(v);
                setSuccess(false);
              }}
            />
            <ColorField
              label={t("background")}
              hint={t("backgroundHint")}
              value={background}
              onChange={(v) => {
                setBackground(v);
                setSuccess(false);
              }}
            />
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-medium">{t("preview")}</h3>
        <MiniPreview primary={primary} accent={accent} background={background} />
      </section>

      {lowContrast && (
        <div className="space-y-2 rounded-md border border-warning/30 bg-warning/10 p-3 text-sm text-foreground">
          <p>{t("contrastWarning")}</p>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={forceLowContrast}
              onChange={(e) => setForceLowContrast(e.target.checked)}
              className="size-4"
            />
            <span>{t("forceLowContrast")}</span>
          </label>
        </div>
      )}

      {error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {success && (
        <p className="rounded-md border border-success/30 bg-success/10 p-3 text-sm text-success">
          {t("saved")}
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={reset} disabled={isPending}>
          {t("reset")}
        </Button>
        <Button type="submit" disabled={isPending || (lowContrast && !forceLowContrast)}>
          {isPending ? t("saving") : t("save")}
        </Button>
      </div>
    </form>
  );
}

function PresetSwatch({
  preset,
  label,
  selected,
  onSelect,
}: {
  preset: Preset;
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group relative flex items-center gap-2 rounded-md border p-2 text-left transition-colors hover:bg-muted ${
        selected ? "border-foreground ring-1 ring-foreground" : "border-border"
      }`}
      aria-pressed={selected}
    >
      <div className="flex shrink-0 gap-1">
        <Swatch hex={preset.primary} />
        <Swatch hex={preset.accent} />
        <Swatch hex={preset.background} />
      </div>
      <span className="truncate text-xs font-medium">{label}</span>
      {selected && (
        <Check className="absolute right-1.5 top-1.5 size-3 text-foreground" aria-hidden="true" />
      )}
    </button>
  );
}

function Swatch({ hex }: { hex: string | null }) {
  return (
    <span
      aria-hidden="true"
      className="block size-4 rounded-sm border border-border/40"
      style={{
        backgroundColor: hex ?? "transparent",
        backgroundImage: hex
          ? undefined
          : "linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%), linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%)",
        backgroundSize: hex ? undefined : "8px 8px",
        backgroundPosition: hex ? undefined : "0 0, 4px 4px",
      }}
    />
  );
}

function ColorField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: string | null;
  onChange: (next: string | null) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={value ?? "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="size-10 cursor-pointer rounded-md border"
          aria-label={label}
        />
        <input
          type="text"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)}
          placeholder="#RRGGBB"
          className="w-32 rounded-md border bg-background px-2 py-1 font-mono text-sm"
          maxLength={7}
          pattern="^#[0-9a-fA-F]{6}$"
        />
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-xs text-muted-foreground underline-offset-2 hover:underline"
        >
          {value ? "✕" : ""}
        </button>
      </div>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function MiniPreview({
  primary,
  accent,
  background,
}: {
  primary: string | null;
  accent: string | null;
  background: string | null;
}) {
  return (
    <div className="rounded-md border p-4" style={{ backgroundColor: background ?? "transparent" }}>
      <div className="text-base font-bold" style={{ color: primary ?? "currentColor" }}>
        Mon Restaurant
      </div>
      <div className="mt-2 flex items-center justify-between text-sm">
        <span>Tartare de bœuf</span>
        <span className="font-semibold" style={{ color: accent ?? "currentColor" }}>
          18,00 €
        </span>
      </div>
      <div className="mt-1 flex items-center justify-between text-sm">
        <span>Risotto aux cèpes</span>
        <span className="font-semibold" style={{ color: accent ?? "currentColor" }}>
          22,00 €
        </span>
      </div>
    </div>
  );
}
