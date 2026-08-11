import type { Metadata } from "next";

export const metadata: Metadata = { title: "Email verification", robots: { index: false, follow: false, nocache: true } };

export default function VerifyLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
