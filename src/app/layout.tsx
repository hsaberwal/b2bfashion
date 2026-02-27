import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PwaRegister } from "@/components/PwaRegister";

export const metadata: Metadata = {
  title: "Claudia B2B | Wholesale",
  description: "B2B wholesale platform for Claudia — ladies fashion wear",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
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
    <html lang="en">
      <body className="antialiased min-h-screen bg-je-cream text-je-black">
        <PwaRegister />
        <div className="bg-je-black text-je-white text-center text-sm py-2 px-4">
          Wholesale — bulk ordering only (pack sizes apply)
        </div>
        {children}
      </body>
    </html>
  );
}
