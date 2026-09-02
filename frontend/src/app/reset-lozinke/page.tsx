import Link from "next/link";

import { ResetPasswordForm } from "@/components/forms/ResetPasswordForm";

export const metadata = { title: "Reset lozinke | Sve Za Pecanje" };

export default async function ResetPasswordPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <h1 className="text-3xl font-extrabold">Reset lozinke</h1>
      {token ? (
        <div className="mt-6">
          <ResetPasswordForm token={token} />
        </div>
      ) : (
        <div className="mt-6 rounded-xl border border-sand-200 bg-white p-5 shadow-soft">
          <p className="text-ink-600">
            Link za reset lozinke nije ispravan. Zatražite novi na stranici{" "}
            <Link href="/zaboravljena-lozinka" className="font-semibold text-river-700">
              zaboravljena lozinka
            </Link>
            .
          </p>
        </div>
      )}
    </div>
  );
}
