import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";

import { AnalyticsScript } from "@/components/analytics/AnalyticsScript";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { ToastProvider } from "@/components/ui/Toast";
import "@/styles/globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans"
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://svezapecanje.rs"),
  title: "Sve Za Pecanje",
  description: "Polovna i nova oprema za ribolov na jednom mestu.",
  alternates: {
    canonical: "/"
  },
  openGraph: {
    title: "Sve Za Pecanje",
    description: "Polovna i nova oprema za ribolov na jednom mestu.",
    siteName: "Sve Za Pecanje",
    type: "website",
    locale: "sr_RS",
    url: "/",
    images: [{ url: "/opengraph-image.png", width: 1200, height: 630, alt: "Sve Za Pecanje" }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Sve Za Pecanje",
    description: "Polovna i nova oprema za ribolov na jednom mestu.",
    images: ["/opengraph-image.png"]
  },
  icons: {
    icon: [{ url: "/icon.svg" }, { url: "/icon.png", type: "image/png" }],
    apple: "/apple-icon.svg"
  }
};

export const viewport: Viewport = {
  themeColor: "#15836f"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sr-Latn-RS" className={manrope.variable}>
      <body className="font-sans">
        <ToastProvider>
          <a href="#sadrzaj" className="skip-link">
            Preskoči na sadržaj
          </a>
          <Header />
          <main id="sadrzaj" tabIndex={-1}>
            {children}
          </main>
          <Footer />
          <AnalyticsScript />
        </ToastProvider>
      </body>
    </html>
  );
}
