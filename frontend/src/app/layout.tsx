import type { Metadata } from "next";

import { AccountSidebar } from "@/components/layout/AccountSidebar";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { getCurrentUser } from "@/lib/auth";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "Sve Za Pecanje",
  description: "Polovna i nova oprema za ribolov na jednom mestu.",
  icons: {
    icon: "/icon.svg",
    apple: "/apple-icon.svg"
  }
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <html lang="sr-Latn-RS">
      <body>
        <Header />
        {user ? (
          <div className="grid lg:grid-cols-[280px_minmax(0,1fr)]">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-4 lg:border-b-0 lg:border-r lg:py-6">
              <AccountSidebar username={user.username} />
            </div>
            <main className="min-w-0">{children}</main>
          </div>
        ) : (
          <main>{children}</main>
        )}
        <Footer />
      </body>
    </html>
  );
}
