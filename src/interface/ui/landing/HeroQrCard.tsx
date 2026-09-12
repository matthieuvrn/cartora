import { useTranslations } from "next-intl";
import { DemoQrSvg } from "@/interface/ui/landing/DemoQr";

/**
 * « Chevalet » QR du hero (desktop) : un VRAI QR scannable vers /m/demo-cartora, généré en
 * SVG au moment du build (composant serveur, page statique) — la preuve physique du produit,
 * comme le chevalet que le restaurateur pose sur ses tables. Fond blanc + modules canard-950 :
 * contraste maximal pour le scan. URL et SVG viennent de `DemoQr.tsx` (source UNIQUE de tous
 * les QR de la landing — `?utm_source=qr` → la visite compte comme scan dans les stats du
 * menu démo, AnalyticsPolicy).
 */
export function HeroQrCard() {
  const t = useTranslations("Landing.hero");

  return (
    // Sur la scène nuit, la carte blanche est l'objet le plus lumineux du viewport : ombre
    // composée (assise noire + halo teal) pour l'asseoir, léger ring intérieur papier.
    <div className="w-40 -rotate-6 rounded-2xl bg-white p-3.5 shadow-[var(--shadow-pill-dark)] ring-1 ring-white/60 ring-inset">
      <DemoQrSvg />
      <p className="mt-2.5 text-center font-mono text-micro leading-snug text-sand-600">
        {t("qrCaption")}
      </p>
    </div>
  );
}
