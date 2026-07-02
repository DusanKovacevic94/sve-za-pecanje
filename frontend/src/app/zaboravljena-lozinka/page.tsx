import Link from "next/link";

import { ForgotPasswordForm } from "@/components/forms/ForgotPasswordForm";

export const metadata = { title: "Zaboravljena lozinka | Sve Za Pecanje" };

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <h1 className="text-3xl font-black">Zaboravljena lozinka</h1>
      <p className="mt-2 text-slate-600">
        Unesite email adresu naloga i poslaćemo vam link za postavljanje nove lozinke.
      </p>
      <div className="mt-6">
        <ForgotPasswordForm />
      </div>
      <p className="mt-4 text-sm text-slate-600">
        Setili ste se lozinke? <Link href="/prijava" className="font-semibold text-river-700">Prijavite se</Link>.
      </p>
    </div>
  );
}
