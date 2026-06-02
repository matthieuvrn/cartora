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
      className={`${GeistSans.variable} ${fraunces.variable} ${jetbrainsMono.variable}`}
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
