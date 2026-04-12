import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Apply for Wholesale Access",
  description:
    "Apply for a Claudia.C wholesale account. Retailers and boutiques can register for trade pricing on our full catalogue of ladies fashion.",
  alternates: { canonical: "/apply" },
};

export default function ApplyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
