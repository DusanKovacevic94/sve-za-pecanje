import Link from "next/link";

import { VerifyEmailCard } from "@/components/forms/VerifyEmailCard";

export const metadata = { title: "Verifikacija emaila | Sve Za Pecanje" };

export default async function VerifyEmailPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <h1 className="text-3xl font-black">Verifikacija emaila</h1>
      {token ? (
        <div className="mt-6">
          <VerifyEmailCard token={token} />
        </div>
      ) : (
        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
          <p className="text-slate-600">
            Otvorite link iz emaila koji smo vam poslali nakon registracije. Ako email nije stigao, proverite spam
            folder ili se <Link href="/registracija" className="font-semibold text-river-700">registrujte ponovo</Link>.
          </p>
        </div>
      )}
    </div>
  );
}
