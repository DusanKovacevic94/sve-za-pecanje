import { serverApiFetch } from "@/lib/server-api";

type Dashboard = {
  pending_listings: number;
  active_listings: number;
  new_users_last_7_days: number;
  unresolved_reports: number;
  messages_last_7_days: number;
  listings_last_7_days: number;
};

export default async function AdminPage() {
  const dashboard = await serverApiFetch<Dashboard>("/admin/dashboard").catch(() => ({
    data: null,
  }));
  const data = dashboard.data;
  const cards = data ? [
    ["Na čekanju", data.pending_listings],
    ["Aktivni oglasi", data.active_listings],
    ["Novi korisnici 7 dana", data.new_users_last_7_days],
    ["Nerešene prijave", data.unresolved_reports],
    ["Poruke 7 dana", data.messages_last_7_days],
    ["Oglasi 7 dana", data.listings_last_7_days]
  ] : [];
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-3xl font-black">Admin</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(([label, value]) => (
          <div key={String(label)} className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
            <p className="text-sm font-semibold text-slate-500">{String(label)}</p>
            <p className="mt-2 text-3xl font-black text-river-700">{String(value)}</p>
          </div>
        ))}
        {!data ? <p className="rounded-lg bg-white p-6 text-slate-600">Administratorska prijava je obavezna.</p> : null}
      </div>
    </div>
  );
}
