import { ArrowUpRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { DemoQrSvg } from "@/interface/ui/landing/DemoQr";
import { LandingSection } from "@/interface/ui/landing/LandingSection";
import { RevealHeading } from "@/interface/ui/landing/Reveal";
import { TrackedCtaButton } from "@/interface/ui/landing/TrackedCtaButton";
import { TrackedLink } from "@/interface/ui/landing/TrackedLink";

/**
 * Climax de clôture — scène NUIT miroir du hero. Recette : grille hairline full-bleed à masque
 * CENTRÉ (`.bg-grid-nuit-centered`), halo canard ancré au bloc titre (enfant `relative` de ce
 * bloc, pas un % du viewport), grain. Deux corail au plus dans le viewport : l'`em` du titre et
 * le point du kicker (le glow corail décoratif a été retiré). Rangée de décision : UNE pilule
 * (TrackedCtaButton, son propre système d'ombre) + le chevalet QR démo à partir de md (un
 * téléphone ne scanne pas son propre écran) / un lien texte mono sous md, via TrackedLink
 * (ancre non stylée : l'ombre vit sur le span de la carte, JAMAIS sur l'ancre — cf. son docblock).
 * Composant SERVEUR : `DemoQrSvg` (qrPath → `qrcode`) n'y coûte que du HTML, le SVG est passé en
 * ReactNode au lien client. Enveloppé par `<MotionSection>` (fade seul) dans
 * LandingPageContent (le h2 porte son propre reveal ⇒ jamais `rise`, sinon double y).
 * L'ancien BreathingCta (pulsation infinie non câblée au store, non conforme WCAG 2.2.2) est
 * retiré — ne pas le réintroduire.
 */
export function LandingFinalCta() {
  const t = useTranslations("Landing.finalCta");

  return (
    <LandingSection
      id="final-cta"
      ariaLabelledBy="final-cta-heading"
      scene="nuit"
      className="section-nuit texture-grain relative isolate overflow-hidden bg-background text-foreground"
      // `relative` RETIRÉ de l'inner : la couche décorative se positionne sur le <section>
      // = full-bleed (recette Démo). Tout enfant `absolute` destiné à la boîte interne porte
      // son propre wrapper `relative` (cf. bloc titre).
      innerClassName="py-28 text-center md:py-36"
    >
      {/* Couche décorative full-bleed : grille à masque CENTRÉ (le sujet est au milieu de la scène,
          pas en haut comme dans le hero). Plus de contrepoint corail : avec le point du kicker, le
          viewport porterait trois corail (D2). */}
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <div className="bg-grid-nuit bg-grid-nuit-centered absolute inset-0" />
      </div>

      {/* Bloc titre `relative` : le halo est SON enfant → ancré au titre à tous les breakpoints (D3).
          Pas d'`isolate` ici : un seul contexte d'empilement, celui du <section>. Ne JAMAIS envelopper
          ce bloc dans un `m.*` : une transform sur ce parent ferait passer le halo au-dessus du h2. */}
      <div className="relative mx-auto max-w-4xl">
        {/* α .34 : ne pas augmenter sans recalcul de contraste (à .5 le kicker tombe sous AA). */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-1/2 -z-10 h-[560px] w-[960px] -translate-x-1/2 -translate-y-1/2"
          style={{
            background:
              "radial-gradient(ellipse 50% 50% at 50% 50%, oklch(0.42 0.058 198 / 0.34), transparent 70%)",
          }}
        />
        <span aria-hidden="true" className="eyebrow-thread mx-auto" />
        {/* Kicker : <p>, pas un heading — le h2 reste l'unique titre nommé par aria-labelledby. */}
        <p className="eyebrow">
          <span className="eyebrow-dot" aria-hidden="true" />
          {t("kicker")}
        </p>
        {/* RevealHeading rend la vraie m.h2 (id forwardé : cible de aria-labelledby). PRM → h2 nue.
            display-2xl fluide (clamp) — symétrie typographique avec le h1 du hero. */}
        <RevealHeading
          id="final-cta-heading"
          className="mt-6 text-display-2xl text-balance text-sand-50"
        >
          {t.rich("title", {
            em: (chunks) => <em className="font-medium text-corail-300 italic">{chunks}</em>,
          })}
        </RevealHeading>
      </div>

      {/* Rangée de décision : UN seul CTA pilule (exclusivité au primaire). À partir de md le chevalet
          QR — la preuve physique, comme dans le hero — remplace la seconde pilule ; sous md un lien
          texte garde le chemin vers la démo (un téléphone ne scanne pas son propre écran, D1). */}
      <div className="mt-10 flex flex-col items-center gap-6 md:flex-row md:justify-center md:gap-10">
        <TrackedCtaButton
          event="cta_final_signup"
          href="/signup?src=final"
          size="xl"
          arrow
          className="w-full sm:w-auto"
        >
          {t("ctaPrimary")}
        </TrackedCtaButton>

        {/* md+ : chevalet QR cliquable. `relative z-10` : au-dessus du grain (::after z 1), comme le
            wrapper du chevalet hero. Aucun corail sur la carte (D2). Hover = matière (ombre, couleur
            de légende), jamais de translation/scale. Focus : aucune classe — l'anneau de marque
            (globals.css, variante nuit) se pose sur L'ANCRE ; l'ombre `shadow-[…]` est sur le span
            de la carte, JAMAIS sur l'ancre (deux box-shadow s'excluraient). Le QR n'est rendu QU'ICI
            (pas dans le lien mobile) : une seule copie markup + une copie flight. */}
        <TrackedLink
          event="cta_final_demo"
          href="/m/demo-cartora"
          external
          metadata={{ surface: "qr" }}
          className="group relative z-10 hidden items-center gap-4 rounded-2xl md:flex"
        >
          <span className="block w-36 shrink-0 rounded-2xl bg-white p-3 shadow-[var(--shadow-pill-dark)] ring-1 ring-white/60 transition-shadow duration-200 ease-[var(--ease-snappy)] ring-inset group-hover:shadow-[var(--shadow-pill-dark-hover)]">
            <DemoQrSvg />
          </span>
          <span className="max-w-[11rem] text-left font-mono text-caption leading-snug tracking-wide text-sand-300 transition-colors group-hover:text-sand-50">
            {t("qrCaption")}
          </span>
        </TrackedLink>

        {/* < md : lien texte mono 13 px (`text-body-sm` : un cran au-dessus du registre « légende »
            12 px — c'est le seul chemin vers la preuve sur mobile, face à une pilule de 52 px), cible
            44 px. Même événement, surface distinguée en metadata. La flèche est l'icône lucide rendue
            par ce RSC (0 Ko) — « ↗ » U+2197 n'existe pas dans le sous-ensemble latin de JetBrains
            Mono (repli Arial en pleine ligne mono). Focus : anneau de marque nuit, aucune classe. */}
        <TrackedLink
          event="cta_final_demo"
          href="/m/demo-cartora"
          external
          metadata={{ surface: "mobile" }}
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-sm font-mono text-body-sm tracking-wide text-sand-300 underline-offset-4 hover:text-sand-50 hover:underline md:hidden"
        >
          {t("ctaSecondary")}
          <ArrowUpRight aria-hidden="true" className="size-3.5 shrink-0 stroke-[1.75]" />
        </TrackedLink>
      </div>

      {/* Micro-trust orientée « après » (D6) : « › » U+203A est dans le sous-ensemble mono servi,
          « → » U+2192 n'y est pas (repli Arial). Aucun chiffre, aucun prix. */}
      <p className="mt-8 font-mono text-caption tracking-wide text-sand-400">{t("microTrust")}</p>
    </LandingSection>
  );
}
