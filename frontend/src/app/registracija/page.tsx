import Link from "next/link";

import { RegisterForm } from "@/components/forms/RegisterForm";
import { PageTitle, SupportingCopy } from "@/components/ui/Primitives";
import { loginHref, safeNextPath } from "@/lib/navigation";

export const metadata = { title: "Registracija | Sve Za Pecanje" };

export default async function RegisterPage({
  searchParams
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const nextPath = safeNextPath(next);
  const loginLink = next ? loginHref(nextPath) : "/prijava";

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <PageTitle>Registracija</PageTitle>
      <SupportingCopy className="mt-2">
        Kreirajte nalog da postavite oglas, sačuvate pretrage i pošaljete poruke. Već imate nalog?{" "}
        <Link href={loginLink} className="font-semibold text-river-700">Prijavite se</Link>.
      </SupportingCopy>
      <div className="mt-6">
        <RegisterForm />
      </div>
    </div>
  );
}
