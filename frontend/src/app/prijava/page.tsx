import Link from "next/link";

import { LoginForm } from "@/components/forms/LoginForm";
import { PageTitle, SupportingCopy } from "@/components/ui/Primitives";
import { registrationHref, safeNextPath } from "@/lib/navigation";

export const metadata = { title: "Prijava | Sve Za Pecanje" };

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const nextPath = safeNextPath(next);
  const registerLink = next ? registrationHref(nextPath) : "/registracija";
  const isPostingListing = nextPath.startsWith("/postavi-oglas");

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <PageTitle>Prijava</PageTitle>
      <SupportingCopy className="mt-2">
        {isPostingListing ? "Prijavite se da biste postavili oglas. " : null}
        Nemate nalog? <Link href={registerLink} className="font-semibold text-river-700">Registrujte se</Link>.
      </SupportingCopy>
      <div className="mt-6">
        <LoginForm nextPath={nextPath} />
      </div>
    </div>
  );
}
