import type { Metadata, Viewport } from "next";
import { DM_Sans, DM_Serif_Display } from "next/font/google";
import "./globals.css";
import { PwaRegister } from "@/components/PwaRegister";
import { ScreenshotProtection } from "@/components/ScreenshotProtection";
import { Chatbot } from "@/components/Chatbot";
import { Navbar } from "@/components/Navbar";
import { InstallPrompt } from "@/components/InstallPrompt";
import { CsrfProvider } from "@/components/CsrfProvider";

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

export const metadata: Metadata = {
  title: "Claudia B2B | Wholesale",
  description: "B2B wholesale platform for Claudia — ladies fashion wear",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Claudia B2B",
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
