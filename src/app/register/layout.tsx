import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Register",
  description: "Create a Claudia.C wholesale account and apply for trade pricing.",
  alternates: { canonical: "/register" },
  robots: { index: false, follow: true },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
