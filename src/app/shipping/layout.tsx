import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shipping Policy",
  description:
    "Dispatch times, tracked DPD delivery, forward orders, and requested delivery dates from Coleridge UK Ltd.",
  alternates: { canonical: "/shipping" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
