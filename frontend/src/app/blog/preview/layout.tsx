import type { Metadata } from "next";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Pregled nacrta | Sve Za Pecanje",
  description: "Privatan urednički pregled.",
  robots: { index: false, follow: false, noarchive: true },
  alternates: { canonical: null },
  openGraph: null,
  twitter: null,
  referrer: "no-referrer",
};
export default function PreviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
