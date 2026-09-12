import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { buildQrSvgData, type QrSvgData } from "./qrPath";

/**
 * QR démo (SVG au build, composant SERVEUR — `qrPath.ts` importe `qrcode`, jamais depuis un
 * fichier "use client"). UNE seule URL pour tous les QR de la landing (hero, Features, étape 3
 * de « Comment ça marche », clôture) : `?utm_source=qr` → la visite compte comme scan dans les
 * stats du menu démo (AnalyticsPolicy).
 * Géométrie : pour l'URL PROD (`DEMO_QR_URL` avec `NEXT_PUBLIC_APP_URL=https://cartora.app`,
 * 47 car., EC M — le niveau de `qrPath.ts`) le code est en version 4 = 33 modules + zone de
 * silence 2 → viewBox 37×37 : afficher ≥ ~110 px de large (≥ 3 px/module) pour rester
 * scannable. Une URL plus longue (preview Vercel
 * `https://cartora-git-xxx.vercel.app/…`, ≈ 70 car.) monte en v5–v6 et descend sous 3 px/module
 * à 120 px : vérifier le scan sur la prod, ou sur un `pnpm build` avec
 * `NEXT_PUBLIC_APP_URL=https://cartora.app`.
 */
export const DEMO_QR_URL = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://cartora.app"}/m/demo-cartora?utm_source=qr`;

export function demoQrSvgData(): QrSvgData {
  return buildQrSvgData(DEMO_QR_URL);
}

type DemoQrSvgProps = {
  className?: string;
  /** `true` = svg muet (`aria-hidden`) pour un visuel déjà porté par son corps de texte (Features). */
  decorative?: boolean;
};

export function DemoQrSvg({ className, decorative = false }: DemoQrSvgProps) {
  const t = useTranslations("Landing.hero");
  const { path, viewBoxSize } = demoQrSvgData();
  const a11y = decorative
    ? ({ "aria-hidden": true } as const)
    : ({ role: "img", "aria-label": t("qrAlt") } as const);
  return (
    <svg
      viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
      {...a11y}
      className={cn("h-auto w-full", className)}
      shapeRendering="crispEdges"
    >
      <path d={path} fill="var(--color-nuit-950)" />
    </svg>
  );
}
