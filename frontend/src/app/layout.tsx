import type { Metadata } from "next";

import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "Sve Za Pecanje",
  description: "Polovna i nova oprema za ribolov na jednom mestu.",
  icons: {
    icon: "/icon.svg",
    apple: "/apple-icon.svg"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sr-Latn-RS">
      <body>
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
