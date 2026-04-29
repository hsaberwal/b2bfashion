import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Returns Policy",
  description:
    "How to request a return, timeframes, conditions, and the restocking fee at Coleridge UK Ltd.",
  alternates: { canonical: "/returns" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
