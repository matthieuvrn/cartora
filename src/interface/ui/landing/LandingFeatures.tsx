import { useTranslations } from "next-intl";
import { LandingSection } from "@/interface/ui/landing/LandingSection";
import { StaggerGroup, StaggerItem } from "@/interface/ui/landing/StaggerReveal";
import { FeatureCard, type FeatureKey, type FeatureTier } from "./FeatureCard";
import { buildQrSvgData } from "./qrPath";

// Le tier est un discriminant statique → la couleur du badge ne dépend jamais du texte i18n.
// `qr` en starter : QR et stats n'ont de réalité qu'une fois la carte publiée (STARTER+) —
// aligné avec la feature « Statistiques temps réel » de la carte pricing STARTER.
const FEATURES: ReadonlyArray<{ key: FeatureKey; tier: FeatureTier }> = [
  { key: "editor", tier: "all" },
  { key: "qr", tier: "starter" },
  { key: "allergens", tier: "all" },
  { key: "bilingual", tier: "pro" },
  { key: "daily", tier: "starter" },
  { key: "branding", tier: "pro" },
] as const;

// Bento (DA 2026) : l'éditeur — cœur du produit — occupe une cellule double ; les 5 autres
// arguments s'organisent autour. La hiérarchie visuelle suit la hiérarchie produit.
const CELL_SPAN: Record<FeatureKey, string> = {
  editor: "md:col-span-4 md:row-span-2",
  qr: "md:col-span-2",
  allergens: "md:col-span-2",
  bilingual: "md:col-span-2",
  daily: "md:col-span-2",
  branding: "md:col-span-2",
};

// Couleurs d'aperçu de 3 skins (NOIR or / SOLAR corail / CARTORA canard) — littéraux
// volontaires, miroir de brandTokens.ts (pas d'import : constantes de composant serveur).
const TEMPLATE_PREVIEW_DOTS = ["#c9a24b", "#f4502e", "#2b6a6a"] as const;

/* Mini-visuels bento : JSX/CSS pur, rendus côté serveur (0 Ko JS), décoratifs (le corps de
   carte porte l'information — FeatureCard les pose en aria-hidden). Le contenu culinaire est
   le fac-similé du menu démo, comme le hero (carte authentique d'un bistrot français). */

function EditorRow({ name, desc, price }: { name: string; desc: string; price: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <span className="min-w-0">
        <span className="block text-body-sm font-medium text-sand-800">{name}</span>
        <span className="mt-0.5 block truncate text-caption text-sand-500">{desc}</span>
      </span>
      <span className="shrink-0 font-mono text-body-sm text-canard-800">{price}</span>
    </div>
  );
}

function EditorVisual() {
  return (
    <div className="rounded-xl border border-sand-200 bg-sand-50 p-5">
      <p className="font-mono text-micro tracking-[0.16em] text-sand-500 uppercase">Entrées</p>
      <div className="mt-1 divide-y divide-sand-200">
        <EditorRow
          name="Velouté de potimarron"
          desc="Potimarron rôti, huile de noisette"
          price="9,50 €"
        />
        <EditorRow name="Burrata fumée" desc="Tomates anciennes, basilic" price="14,00 €" />
      </div>
      <p className="mt-4 font-mono text-micro tracking-[0.16em] text-sand-500 uppercase">Plats</p>
      <div className="mt-1 divide-y divide-sand-200">
        <EditorRow
          name="Magret de canard"
          desc="Miel, romarin, pommes grenailles"
          price="24,00 €"
        />
      </div>
      {/* Ligne « en cours d'édition » : ring canard + caret — l'éditeur est vivant. */}
      <div className="-mx-2 mt-1.5 flex items-start justify-between gap-4 rounded-lg bg-white px-2 py-2.5 ring-2 ring-canard-300">
        <span className="min-w-0">
          <span className="block text-body-sm font-medium text-canard-950">
            Risotto aux cèpes
            <span className="ml-0.5 inline-block h-3.5 w-px translate-y-0.5 bg-canard-600" />
          </span>
          <span className="mt-0.5 block truncate text-caption text-sand-500">
            Cèpes sauvages, copeaux de parmesan
          </span>
        </span>
        <span className="shrink-0 font-mono text-body-sm font-medium text-canard-800">19,50 €</span>
      </div>
      <p className="mt-4 font-mono text-micro tracking-[0.16em] text-sand-500 uppercase">
        Desserts
      </p>
      <div className="mt-1 divide-y divide-sand-200">
        <EditorRow name="Moelleux au chocolat" desc="Cœur coulant, glace vanille" price="8,50 €" />
      </div>
    </div>
  );
}

function QrVisual() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://cartora.app";
  const { path, viewBoxSize } = buildQrSvgData(`${baseUrl}/m/demo-cartora?utm_source=qr`);
  return (
    <div className="w-fit rounded-lg border border-sand-200 bg-white p-2">
      {/* VRAI QR (SVG généré au build via qrPath — 0 Ko JS), même destination que le hero. */}
      <svg
        viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
        className="size-20"
        shapeRendering="crispEdges"
      >
        <path d={path} fill="var(--color-nuit-950)" />
      </svg>
    </div>
  );
}

function AllergenVisual() {
  return (
    <div className="flex flex-wrap gap-1.5">
      {["Gluten", "Lactose", "Fruits à coque"].map((label) => (
        <span
          key={label}
          className="rounded-full border border-sand-200 bg-sand-50 px-2.5 py-1 text-micro text-sand-700"
        >
          {label}
        </span>
      ))}
    </div>
  );
}

function BilingualVisual() {
  return (
    <p className="font-mono text-body-sm">
      <span className="text-sand-500">FR</span>
      <span aria-hidden="true" className="mx-2 text-corail-500">
        →
      </span>
      <span className="font-medium text-canard-800">EN · ES · DE · IT</span>
    </p>
  );
}

function DailyVisual() {
  return (
    <div className="flex items-center gap-3">
      <span className="rounded-full bg-canard-100 px-2.5 py-1 text-micro font-medium text-canard-800">
        Aujourd’hui
      </span>
      <span className="font-mono text-body-sm text-sand-400 line-through">21,00 €</span>
      <span className="font-mono text-body-sm font-medium text-canard-800">19,50 €</span>
    </div>
  );
}

function BrandingVisual() {
  return (
    <div className="flex items-center gap-2">
      {TEMPLATE_PREVIEW_DOTS.map((color) => (
        <span
          key={color}
          className="size-4 rounded-full ring-1 ring-sand-200 ring-inset"
          style={{ backgroundColor: color }}
        />
      ))}
      <span className="ml-1 font-mono text-micro text-sand-500">×9</span>
    </div>
  );
}

const VISUALS: Record<FeatureKey, () => React.ReactNode> = {
  editor: EditorVisual,
  qr: QrVisual,
  allergens: AllergenVisual,
  bilingual: BilingualVisual,
  daily: DailyVisual,
  branding: BrandingVisual,
};

export function LandingFeatures() {
  const t = useTranslations("Landing.features");

  return (
    <LandingSection id="features">
      <header className="mb-10 max-w-[38rem]">
        <span aria-hidden="true" className="eyebrow-thread" />
        <p className="eyebrow">
          <span className="eyebrow-dot" aria-hidden="true" />
          {t("kicker")}
        </p>
        <h2 className="mt-5 text-display-lg md:text-display-xl">{t("title")}</h2>
        <p className="mt-5 text-lead text-muted-foreground">{t("subtitle")}</p>
      </header>

      {/* Stagger d'entrée — la section parente passe en MotionSection variant="fade". */}
      <StaggerGroup className="grid gap-4 md:grid-cols-6">
        {FEATURES.map(({ key, tier }) => {
          const Visual = VISUALS[key];
          return (
            <StaggerItem key={key} className={`h-full [&>article]:h-full ${CELL_SPAN[key]}`}>
              <FeatureCard
                featureKey={key}
                tier={tier}
                title={t(`${key}.title`)}
                body={t(`${key}.body`)}
                tierLabel={t(`${key}.tier`)}
                visual={<Visual />}
              />
            </StaggerItem>
          );
        })}
      </StaggerGroup>
    </LandingSection>
  );
}
