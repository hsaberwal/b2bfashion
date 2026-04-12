import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Garments",
  description:
    "Browse the full Claudia.C wholesale catalogue — tops, dresses, knitwear, jackets, skirts, and more. Filter by category, colour, and stock type. Trade prices visible after wholesale account approval.",
  alternates: { canonical: "/products" },
};

export default function ProductsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
