import type { Metadata, Viewport } from "next";

import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import "@/styles/globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://svezapecanje.rs"),
  title: "Sve Za Pecanje",
  description: "Polovna i nova oprema za ribolov na jednom mestu.",
  alternates: {
    canonical: "/"
  },
  openGraph: {
    siteName: "Sve Za Pecanje",
    type: "website",
    locale: "sr_RS"
  },
  icons: {
    icon: "/icon.svg",
    apple: "/apple-icon.svg"
  }
};

export const viewport: Viewport = {
  themeColor: "#15836f"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sr-Latn-RS">
      <body>
        <a href="#sadrzaj" className="skip-link">
          Preskoči na sadržaj
        </a>
        <Header />
        <main id="sadrzaj" tabIndex={-1}>
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
