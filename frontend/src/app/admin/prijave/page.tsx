import { apiFetch } from "@/lib/api";

type Report = { id: string; reason: string; status: string; description: string | null };

export default async function AdminReportsPage() {
  const reports = await apiFetch<Report[]>("/admin/reports").catch(() => ({ data: [] }));
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-black">Prijave</h1>
      <div className="mt-6 space-y-4">
        {reports.data.map((report) => (
          <article key={report.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
            <h2 className="font-black">{report.reason}</h2>
            <p className="mt-1 text-sm text-slate-600">{report.status}</p>
            {report.description ? <p className="mt-3">{report.description}</p> : null}
          </article>
        ))}
      </div>
    </div>
  );
}

