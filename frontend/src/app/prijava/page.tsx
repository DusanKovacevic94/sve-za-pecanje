import Link from "next/link";

import { LoginForm } from "@/components/forms/LoginForm";

export const metadata = { title: "Prijava | Sve Za Pecanje" };

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <h1 className="text-3xl font-black">Prijava</h1>
      <p className="mt-2 text-slate-600">
        Nemate nalog? <Link href="/registracija" className="font-semibold text-river-700">Registrujte se</Link>.
      </p>
      <div className="mt-6">
        <LoginForm />
      </div>
    </div>
  );
}

