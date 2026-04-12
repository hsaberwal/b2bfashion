import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Claudia.C is a wholesale ladies fashion supplier serving retailers and boutiques across the UK. Curated collections, competitive trade pricing, and flexible payment options.",
  alternates: { canonical: "/about" },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
