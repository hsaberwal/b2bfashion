import type { Metadata, Viewport } from "next";
import { DM_Sans, DM_Serif_Display } from "next/font/google";
import "./globals.css";
import { PwaRegister } from "@/components/PwaRegister";
import { ScreenshotProtection } from "@/components/ScreenshotProtection";
import { Chatbot } from "@/components/Chatbot";
import { Navbar } from "@/components/Navbar";
import { InstallPrompt } from "@/components/InstallPrompt";
import { CsrfProvider } from "@/components/CsrfProvider";
import { OrganizationJsonLd } from "@/components/OrganizationJsonLd";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["300", "400", "500", "600", "700"],
});

const dmSerif = DM_Serif_Display({
  subsets: ["latin"],
  variable: "--font-dm-serif",
  weight: "400",
});

const siteUrl = process.env.NEXTAUTH_URL ?? "https://claudia-c.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Claudia.C B2B | Ladies Wholesale Fashion",
    template: "%s | Claudia.C B2B",
  },
  description:
    "Claudia.C wholesale ladies fashion platform — curated collections for retailers and boutiques. Browse tops, dresses, knitwear, jackets, and more in pre-set size packs at trade prices.",
  keywords: [
    "ladies wholesale fashion",
    "wholesale clothing UK",
    "B2B fashion supplier",
    "trade fashion",
    "boutique wholesale",
    "wholesale dresses",
    "wholesale knitwear",
    "Claudia.C",
    "wholesale ladies clothing",
  ],
  authors: [{ name: "Claudia.C" }],
  creator: "Claudia.C",
  publisher: "Claudia.C",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    locale: "en_GB",
    url: siteUrl,
    siteName: "Claudia.C B2B",
    title: "Claudia.C B2B | Ladies Wholesale Fashion",
    description:
      "Curated wholesale ladies fashion for retailers and boutiques. Pack ordering with trade pricing, flexible payment, and a beautiful catalogue.",
    images: [
      {
        url: "/icons/icon-512.png",
        width: 512,
        height: 512,
        alt: "Claudia.C B2B",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Claudia.C B2B | Ladies Wholesale Fashion",
    description:
      "Curated wholesale ladies fashion for retailers and boutiques.",
    images: ["/icons/icon-512.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Claudia.C B2B",
  },
};

export const viewport: Viewport = {
  themeColor: "#1a1a1a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${dmSans.variable} ${dmSerif.variable}`}>
      <body className="font-sans antialiased min-h-screen bg-white text-je-black">
        <OrganizationJsonLd />
        <ScreenshotProtection />
        <PwaRegister />
        <CsrfProvider />
        <div className="bg-je-black text-white text-center text-[11px] tracking-[0.15em] uppercase py-2.5 px-4 font-medium">
          Wholesale &mdash; bulk ordering only (pack sizes apply)
        </div>
        <Navbar />
        {children}
        <Chatbot />
        <InstallPrompt />
      </body>
    </html>
  );
}
