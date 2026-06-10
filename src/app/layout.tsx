import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import localFont from "next/font/local";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { ConsentProvider } from "@/interface/ui/components/consent/ConsentContext";
import { CookieBanner } from "@/interface/ui/components/consent/CookieBanner";
import { Footer } from "@/interface/ui/components/Footer";
import "./globals.css";

// Self-hosted via @fontsource-variable (woff2 servis depuis 'self' — CSP font-src 'self'
// OK, build hermétique, aucun fetch Google). Geist (UI) reste chargée via le package geist.
// Fraunces = display éditorial (axes opsz/SOFT/WONK pilotés en CSS via font-optical-sizing /
// font-variation-settings). JetBrains Mono = prix/URLs/data.
const fraunces = localFont({
  src: [
    {
      path: "../../node_modules/@fontsource-variable/fraunces/files/fraunces-latin-full-normal.woff2",
      style: "normal",
    },
    {
      path: "../../node_modules/@fontsource-variable/fraunces/files/fraunces-latin-full-italic.woff2",
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
  // Préchargée : CLASSIC (template par défaut, le plus rendu) l'utilise pour les prix
  // (`--menu-font-mono`). Les polices premium restent `preload: false` (Étape 4).
  preload: true,
});

// Polices des templates publics premium (Étape 4 — refonte menu, cf. docs/publicmenu.md).
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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      data-scroll-behavior="smooth"
      className={`${GeistSans.variable} ${fraunces.variable} ${jetbrainsMono.variable} ${cormorantGaramond.variable} ${bricolageGrotesque.variable} ${schibstedGrotesk.variable} ${archivo.variable}`}
    >
      <body className="font-sans antialiased">
        <NextIntlClientProvider messages={messages}>
          <ConsentProvider>
            {children}
            <Footer />
            <CookieBanner />
          </ConsentProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
