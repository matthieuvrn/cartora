import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import localFont from "next/font/local";
import { ConsentProvider } from "@/interface/ui/components/consent/ConsentContext";
import "./globals.css";

// Self-hosted via @fontsource-variable (woff2 servis depuis 'self' — CSP font-src 'self'
// OK, build hermétique, aucun fetch Google). Geist (UI) reste chargée via le package geist.
// Fraunces = display éditorial. Fichiers `opsz` (wght+opsz, 67+82 KB) et non `full`
// (121+150 KB) : seul font-optical-sizing est consommé en CSS, les axes SOFT/WONK ne sont
// pilotés nulle part — même rendu, −122 KB préchargés. L'italique reste préchargée : le
// <em> du h1 hero (LCP) l'affiche au-dessus du fold. JetBrains Mono = prix/URLs/data.
const fraunces = localFont({
  src: [
    {
      path: "../../node_modules/@fontsource-variable/fraunces/files/fraunces-latin-opsz-normal.woff2",
      style: "normal",
    },
    {
      path: "../../node_modules/@fontsource-variable/fraunces/files/fraunces-latin-opsz-italic.woff2",
      style: "italic",
    },
  ],
  weight: "100 900",
  variable: "--font-fraunces",
  display: "swap",
  preload: true,
});

const jetbrainsMono = localFont({
  src: "../../node_modules/@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2",
  weight: "100 800",
  variable: "--font-jetbrains-mono",
  display: "swap",
  // Pas de preload : ses seuls usages (prix du template CLASSIC sur /m/[slug], pill d'URL
  // du BrowserMockup) sont below-the-fold ou hors landing — le preload root faisait payer
  // 40 KB sur le chemin critique de TOUTES les pages. Fetch à la demande + swap.
  preload: false,
});

// Polices des templates publics premium (refonte menus publics 2026).
// Toutes `preload: false` : le woff2 n'est fetché QUE sur le menu /m/[slug] qui utilise la
// famille (un glyphe doit la consommer). Aucun surcoût sur landing/app/Classic. Sous-set `latin`
// (français complet, œ inclus). Axe `wght` uniquement (font-variation par graisse) — Archivo
// expose aussi un axe `wdth` si NEON veut du condensé strict en Étape 6 (fichier `-wdth-`).
// Consommées par les skins via `var(--tpl-font-display)` (cf. globals.css [data-template]).
const cormorantGaramond = localFont({
  src: "../../node_modules/@fontsource-variable/cormorant-garamond/files/cormorant-garamond-latin-wght-normal.woff2",
  weight: "300 700",
  variable: "--font-cormorant", // BISTRO + NOIR — serif display
  display: "swap",
  preload: false,
});

const bricolageGrotesque = localFont({
  src: "../../node_modules/@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-wght-normal.woff2",
  weight: "200 800",
  variable: "--font-bricolage", // SOLAR — sans géométrique gras
  display: "swap",
  preload: false,
});

const schibstedGrotesk = localFont({
  src: "../../node_modules/@fontsource-variable/schibsted-grotesk/files/schibsted-grotesk-latin-wght-normal.woff2",
  weight: "400 900",
  variable: "--font-schibsted", // ZEN — sans humaniste fin
  display: "swap",
  preload: false,
});

const archivo = localFont({
  src: "../../node_modules/@fontsource-variable/archivo/files/archivo-latin-wght-normal.woff2",
  weight: "100 900",
  variable: "--font-archivo", // NEON — condensé bold via graisse haute
  display: "swap",
  preload: false,
});

// Set 2026.1 — mêmes règles (auto-hébergées, `preload: false`, subset latin).
const playfairDisplay = localFont({
  src: "../../node_modules/@fontsource-variable/playfair-display/files/playfair-display-latin-wght-normal.woff2",
  weight: "400 900",
  variable: "--font-playfair", // RIVAGE — Didone haute-contraste, élégance bord de mer
  display: "swap",
  preload: false,
});

const newsreader = localFont({
  src: [
    {
      path: "../../node_modules/@fontsource-variable/newsreader/files/newsreader-latin-wght-normal.woff2",
      style: "normal",
    },
    {
      path: "../../node_modules/@fontsource-variable/newsreader/files/newsreader-latin-wght-italic.woff2",
      style: "italic",
    },
  ],
  weight: "200 800",
  variable: "--font-newsreader", // VELOURS — serif littéraire chaud (italique « Aujourd'hui »)
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: {
    default: "Cartora — Menu digital pour restaurants",
    template: "%s | Cartora",
  },
  description:
    "Cartora permet aux restaurateurs de créer et publier leur menu en ligne en quelques minutes. QR code, mise à jour en temps réel, et design professionnel.",
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "Cartora",
  },
  twitter: {
    card: "summary_large_image",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#fbfaf7",
  width: "device-width",
  initialScale: 1,
};

/**
 * Root layout STATIQUE-COMPATIBLE : aucune lecture de cookies()/headers() ici — c'est ce qui
 * permet à `/` et `/en` d'être prérendus et servis du CDN. Le provider next-intl (cookie
 * `locale`), le footer global et la bannière cookies vivent dans <LocaleShell> (layouts des
 * segments dynamiques) ; les pages landing embarquent leur propre provider. `lang="fr"` par
 * défaut, corrigé côté client par HtmlLangSync/LandingLocaleSync pour les utilisateurs EN.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="fr"
      data-scroll-behavior="smooth"
      className={`${GeistSans.variable} ${fraunces.variable} ${jetbrainsMono.variable} ${cormorantGaramond.variable} ${bricolageGrotesque.variable} ${schibstedGrotesk.variable} ${archivo.variable} ${playfairDisplay.variable} ${newsreader.variable}`}
    >
      <body className="font-sans antialiased">
        <ConsentProvider>{children}</ConsentProvider>
      </body>
    </html>
  );
}
