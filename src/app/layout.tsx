import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { ConsentProvider } from "@/interface/ui/components/consent/ConsentContext";
import { CookieBanner } from "@/interface/ui/components/consent/CookieBanner";
import { Footer } from "@/interface/ui/components/Footer";
import "./globals.css";

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
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className={GeistSans.variable}>
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
