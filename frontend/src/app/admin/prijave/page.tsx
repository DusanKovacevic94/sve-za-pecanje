import Link from "next/link";

import { AdminReportActions } from "@/components/admin/AdminReportActions";
import { serverApiFetch } from "@/lib/server-api";

type Report = {
  id: string;
  reason: string;
  status: string;
  description: string | null;
  listing_id: string | null;
  reported_user_id: string | null;
  listing: { id: string; title: string; slug: string } | null;
  reported_user: { id: string; username: string; status: string } | null;
};

export default async function AdminReportsPage() {
  const reports = await serverApiFetch<Report[]>("/admin/reports").catch(() => ({ data: [] }));
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-black">Prijave</h1>
      <div className="mt-6 space-y-4">
        {reports.data.map((report) => (
          <article key={report.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
            <h2 className="font-black">{report.reason}</h2>
            <p className="mt-1 text-sm text-slate-600">{report.status}</p>
            {report.description ? <p className="mt-3">{report.description}</p> : null}
            <div className="mt-3 flex flex-wrap gap-3 text-sm font-semibold">
              {report.listing ? (
                <Link className="text-river-700 hover:underline" href={`/oglasi/${report.listing.slug}`}>
                  Oglas: {report.listing.title}
                </Link>
              ) : null}
              {report.reported_user ? (
                <Link className="text-river-700 hover:underline" href={`/prodavci/${report.reported_user.username}`}>
                  Korisnik: {report.reported_user.username}
                </Link>
              ) : null}
            </div>
            <AdminReportActions
              reportId={report.id}
              listingId={report.listing_id}
              reportedUserId={report.reported_user_id}
              reportedUserStatus={report.reported_user?.status}
            />
          </article>
        ))}
      </div>
    </div>
  );
}
