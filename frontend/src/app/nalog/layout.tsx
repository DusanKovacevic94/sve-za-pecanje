import type { ReactNode } from "react";

import { Button } from "@/components/ui/Button";
import { getCurrentUser } from "@/lib/auth";

export default async function AccountLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10">
        <h1 className="text-3xl font-black">Prijava je obavezna</h1>
        <p className="mt-2 text-slate-600">Prijavite se da biste videli nalog.</p>
        <Button href="/prijava" className="mt-5">
          Prijava
        </Button>
      </div>
    );
  }

  return <div className="mx-auto max-w-7xl px-4 py-8 lg:py-10">{children}</div>;
}
