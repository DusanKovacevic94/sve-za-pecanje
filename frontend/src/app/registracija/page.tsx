import Link from "next/link";

import { RegisterForm } from "@/components/forms/RegisterForm";
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
      <h1 className="text-3xl font-black">Registracija</h1>
      <p className="mt-2 text-slate-600">
        Kreirajte nalog da postavite oglas, sačuvate pretrage i pošaljete poruke. Već imate nalog?{" "}
        <Link href={loginLink} className="font-semibold text-river-700">Prijavite se</Link>.
      </p>
      <div className="mt-6">
        <RegisterForm />
      </div>
    </div>
  );
}
