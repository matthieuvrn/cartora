"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Check, Download, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { updateQrStyleAction } from "@/app/(app)/app/actions";
import { BrandingPolicy } from "@/domain/restaurant/BrandingPolicy";
import {
  DEFAULT_QR_STYLE,
  QR_CORNER_STYLES,
  QR_DOT_STYLES,
  QR_ERROR_CORRECTION,
  QR_QUIET_ZONE_PX,
  QR_RENDER_SIZE,
  QrStylePolicy,
  type QrCornerStyle,
  type QrDotStyle,
  type QrStyle,
} from "@/domain/restaurant/QrStylePolicy";

// ─── Typage minimal de qr-code-styling ───────────────────────────────────────
// On ne dépend PAS des types de la lib (ils importent jsdom/canvas côté node) :
// on déclare juste la forme des options qu'on utilise + l'instance. Le module est
// chargé dynamiquement (browser-only : il touche `window`/canvas au constructeur).
type QrOptions = {
  width: number;
  height: number;
  type: "canvas" | "svg";
  data: string;
  margin: number;
  qrOptions: { errorCorrectionLevel: "L" | "M" | "Q" | "H" };
  dotsOptions: { color: string; type: string };
  backgroundOptions: { color: string };
  cornersSquareOptions: { color: string; type: string };
  cornersDotOptions: { color: string; type: string };
};
type QrInstance = {
  append(el: HTMLElement): void;
  update(options: QrOptions): void;
  download(opts: { name?: string; extension?: "png" | "svg" }): Promise<void>;
};

type PresetKey = "default" | "encre" | "canard" | "foret" | "bordeaux" | "prune";
type Preset = QrStyle & { key: PresetKey };

// Presets curés : tous scannables (modules sombres sur fond clair, contraste ≥ AA).
const PRESETS: Preset[] = [
  { key: "default", ...DEFAULT_QR_STYLE },
  {
    key: "encre",
    darkColor: "#14213d",
    lightColor: "#ffffff",
    dotsStyle: "rounded",
    cornersStyle: "rounded",
  },
  {
    key: "canard",
    darkColor: "#0f3d3e",
    lightColor: "#f2f7f5",
    dotsStyle: "dots",
    cornersStyle: "dots",
  },
  {
    key: "foret",
    darkColor: "#1f3d2b",
    lightColor: "#f5efe3",
    dotsStyle: "classy",
    cornersStyle: "square",
  },
  {
    key: "bordeaux",
    darkColor: "#5a1a1a",
    lightColor: "#fbf5ec",
    dotsStyle: "rounded",
    cornersStyle: "rounded",
  },
  {
    key: "prune",
    darkColor: "#3b1e4e",
    lightColor: "#f6f1f8",
    dotsStyle: "extra-rounded",
    cornersStyle: "rounded",
  },
];

/** Mappe le style de coin (domaine) vers les 2 types attendus par qr-code-styling. */
function cornerLibTypes(corner: QrCornerStyle): { square: string; dot: string } {
  switch (corner) {
    case "square":
      return { square: "square", dot: "square" };
    case "rounded":
      return { square: "extra-rounded", dot: "dot" };
    case "dots":
      return { square: "dot", dot: "dot" };
  }
}

type Props = {
  slug: string;
  appUrl: string;
  initialStyle: QrStyle | null;
};

export function QrStyleEditor({ slug, appUrl, initialStyle }: Props) {
  const t = useTranslations("Share.qrEditor");
  const tErrors = useTranslations("Errors");

  const [darkColor, setDarkColor] = useState(initialStyle?.darkColor ?? DEFAULT_QR_STYLE.darkColor);
  const [lightColor, setLightColor] = useState(
    initialStyle?.lightColor ?? DEFAULT_QR_STYLE.lightColor,
  );
  const [dotsStyle, setDotsStyle] = useState<QrDotStyle>(
    initialStyle?.dotsStyle ?? DEFAULT_QR_STYLE.dotsStyle,
  );
  const [cornersStyle, setCornersStyle] = useState<QrCornerStyle>(
    initialStyle?.cornersStyle ?? DEFAULT_QR_STYLE.cornersStyle,
  );
  const [isPending, startTransition] = useTransition();

  const menuUrl = `${appUrl}/m/${slug}?utm_source=qr`;

  // Prédicat pur (ne throw jamais) : gate le rendu, la sauvegarde et le téléchargement.
  const scannable = QrStylePolicy.isScannable(darkColor, lightColor);

  const selectedPreset = useMemo(
    () =>
      PRESETS.find(
        (p) =>
          p.darkColor === darkColor.toLowerCase() &&
          p.lightColor === lightColor.toLowerCase() &&
          p.dotsStyle === dotsStyle &&
          p.cornersStyle === cornersStyle,
      )?.key ?? null,
    [darkColor, lightColor, dotsStyle, cornersStyle],
  );

  const options = useMemo<QrOptions>(() => {
    const corner = cornerLibTypes(cornersStyle);
    // Fallback aux couleurs par défaut tant que la saisie hex est partielle,
    // pour ne jamais casser le rendu de l'aperçu.
    const dark = BrandingPolicy.isValidHexColor(darkColor) ? darkColor : DEFAULT_QR_STYLE.darkColor;
    const light = BrandingPolicy.isValidHexColor(lightColor)
      ? lightColor
      : DEFAULT_QR_STYLE.lightColor;
    return {
      width: QR_RENDER_SIZE,
      height: QR_RENDER_SIZE,
      type: "canvas",
      data: menuUrl,
      margin: QR_QUIET_ZONE_PX,
      qrOptions: { errorCorrectionLevel: QR_ERROR_CORRECTION },
      dotsOptions: { color: dark, type: dotsStyle },
      backgroundOptions: { color: light },
      cornersSquareOptions: { color: dark, type: corner.square },
      cornersDotOptions: { color: dark, type: corner.dot },
    };
  }, [menuUrl, darkColor, lightColor, dotsStyle, cornersStyle]);

  const ref = useRef<HTMLDivElement>(null);
  const qrRef = useRef<QrInstance | null>(null);

  // Montage unique : import dynamique (browser-only) + append dans le DOM.
  // `options` est capturé au montage (état initial) ; les changements ultérieurs
  // passent par l'effet `update` ci-dessous une fois l'instance prête.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const mod = (await import("qr-code-styling")) as unknown as {
        default: new (options: QrOptions) => QrInstance;
      };
      if (cancelled || !ref.current) return;
      const qr = new mod.default(options);
      qrRef.current = qr;
      ref.current.innerHTML = "";
      qr.append(ref.current);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Aperçu live : chaque changement de style met à jour le QR.
  useEffect(() => {
    qrRef.current?.update(options);
  }, [options]);

  const applyPreset = (preset: Preset) => {
    setDarkColor(preset.darkColor);
    setLightColor(preset.lightColor);
    setDotsStyle(preset.dotsStyle);
    setCornersStyle(preset.cornersStyle);
  };

  const reset = () => applyPreset({ key: "default", ...DEFAULT_QR_STYLE });

  const download = (extension: "png" | "svg") => {
    qrRef.current?.download({ name: `qr-${slug}`, extension });
  };

  const save = () => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("darkColor", darkColor);
      fd.set("lightColor", lightColor);
      fd.set("dotsStyle", dotsStyle);
      fd.set("cornersStyle", cornersStyle);
      const result = await updateQrStyleAction({ error: null }, fd);
      if (result.error) {
        toast.error(
          tErrors(
            result.error.code as
              | "invalid_qr_style"
              | "qr_low_contrast"
              | "invalid_brand_color"
              | "validation"
              | "generic",
          ),
        );
        return;
      }
      toast.success(t("saved"));
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Aperçu + téléchargements */}
        <div className="flex flex-col items-center gap-3">
          <div
            ref={ref}
            className="w-64 max-w-full overflow-hidden rounded-md border [&>canvas]:h-auto [&>canvas]:w-full"
            style={{ backgroundColor: lightColor }}
            aria-label={t("preview")}
          />
          {!scannable && (
            <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 p-3 text-sm text-foreground">
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
              <span>{t("contrastWarning")}</span>
            </div>
          )}
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={() => download("png")} disabled={!scannable}>
              <Download className="size-4" />
              {t("downloadPng")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => download("svg")}
              disabled={!scannable}
            >
              <Download className="size-4" />
              {t("downloadSvg")}
            </Button>
          </div>
        </div>

        {/* Presets */}
        <section className="space-y-3">
          <h3 className="text-sm font-medium">{t("presets")}</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {PRESETS.map((preset) => (
              <button
                key={preset.key}
                type="button"
                onClick={() => applyPreset(preset)}
                aria-pressed={selectedPreset === preset.key}
                className={`group relative flex items-center gap-2 rounded-md border p-2 text-left transition-colors hover:bg-muted ${
                  selectedPreset === preset.key
                    ? "border-foreground ring-1 ring-foreground"
                    : "border-border"
                }`}
              >
                <span
                  aria-hidden="true"
                  className="flex size-6 shrink-0 items-center justify-center rounded-sm border border-border/40"
                  style={{ backgroundColor: preset.lightColor }}
                >
                  <span
                    className="size-3 rounded-[2px]"
                    style={{ backgroundColor: preset.darkColor }}
                  />
                </span>
                <span className="truncate text-xs font-medium">
                  {t(`presetLabels.${preset.key}`)}
                </span>
                {selectedPreset === preset.key && (
                  <Check
                    className="absolute right-1.5 top-1.5 size-3 text-foreground"
                    aria-hidden="true"
                  />
                )}
              </button>
            ))}
          </div>
        </section>

        {/* Couleurs */}
        <section className="space-y-3">
          <h3 className="text-sm font-medium">{t("colors")}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <ColorField
              label={t("darkColor")}
              hint={t("darkColorHint")}
              value={darkColor}
              onChange={setDarkColor}
            />
            <ColorField
              label={t("lightColor")}
              hint={t("lightColorHint")}
              value={lightColor}
              onChange={setLightColor}
            />
          </div>
        </section>

        {/* Formes */}
        <section className="space-y-3">
          <h3 className="text-sm font-medium">{t("shapes")}</h3>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">{t("dotsStyle")}</Label>
            <div className="flex flex-wrap gap-2">
              {QR_DOT_STYLES.map((style) => (
                <StyleChip
                  key={style}
                  label={t(`dotStyleLabels.${style}`)}
                  selected={dotsStyle === style}
                  onSelect={() => setDotsStyle(style)}
                />
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">{t("cornersStyle")}</Label>
            <div className="flex flex-wrap gap-2">
              {QR_CORNER_STYLES.map((style) => (
                <StyleChip
                  key={style}
                  label={t(`cornerStyleLabels.${style}`)}
                  selected={cornersStyle === style}
                  onSelect={() => setCornersStyle(style)}
                />
              ))}
            </div>
          </div>
        </section>

        <p className="text-xs text-muted-foreground">{t("scanHint")}</p>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={reset} disabled={isPending}>
            {t("reset")}
          </Button>
          <Button type="button" onClick={save} disabled={isPending || !scannable}>
            {isPending ? t("saving") : t("save")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function StyleChip({
  label,
  selected,
  onSelect,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors hover:bg-muted ${
        selected ? "border-foreground bg-foreground text-background" : "border-border"
      }`}
    >
      {label}
    </button>
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
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={BrandingPolicy.isValidHexColor(value) ? value : "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="size-10 cursor-pointer rounded-md border bg-background"
          aria-label={label}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#RRGGBB"
          className="w-32 rounded-md border bg-background px-2 py-1 font-mono text-sm"
          maxLength={7}
          pattern="^#[0-9a-fA-F]{6}$"
        />
      </div>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
