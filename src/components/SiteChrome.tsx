"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { Chatbot } from "./Chatbot";
import { ComingSoonBanner } from "./ComingSoonBanner";

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin") ?? false;

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <>
      <ComingSoonBanner />
      <div className="bg-je-black text-white text-center text-[11px] tracking-[0.15em] uppercase py-2.5 px-4 font-medium">
        Wholesale &mdash; bulk ordering only (pack sizes apply)
      </div>
      <Navbar />
      {children}
      <Footer />
      <Chatbot />
    </>
  );
}
