import { FailedEmailManager, type FailedEmail } from "@/components/admin/FailedEmailManager";
import { serverApiFetch } from "@/lib/server-api";

export default async function AdminFailedEmailsPage() {
  const emails = await serverApiFetch<FailedEmail[]>("/admin/emails/failed").catch(() => ({ data: [] }));
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-black">Neuspeli emailovi</h1>
      <p className="mt-2 text-slate-600">Pregled emailova koji nisu poslati i ručno vraćanje u red.</p>
      <div className="mt-6">
        <FailedEmailManager emails={emails.data} />
      </div>
    </div>
  );
}
