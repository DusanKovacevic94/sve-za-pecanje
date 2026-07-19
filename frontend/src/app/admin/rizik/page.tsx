import Link from "next/link";

import { ModerationRiskQueue, type ModerationCase } from "@/components/admin/ModerationRiskQueue";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Field";
import { serverApiFetch } from "@/lib/server-api";

type PageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function ModerationRiskPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = new URLSearchParams();
  for (const key of ["status", "reason", "entity_type", "cursor"]) {
    if (params[key]) query.set(key, params[key]);
  }
  const response = await serverApiFetch<ModerationCase[]>(
    `/admin/moderation-cases?${query.toString()}`
  ).catch(() => ({ data: [], meta: {} }));
  const nextCursorValue = (response.meta as Record<string, unknown> | undefined)?.next_cursor;
  const nextCursor = typeof nextCursorValue === "string"
    ? nextCursorValue
    : null;
  if (nextCursor) query.set("cursor", nextCursor);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div>
        <h1 className="text-3xl font-black">Red rizika</h1>
        <p className="mt-2 text-slate-600">
          Prioritetni interni signali. Ocena rizika sama ne uklanja oglas niti suspenduje nalog.
        </p>
      </div>
      <form className="mt-6 grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-soft sm:grid-cols-4">
        <Select name="status" defaultValue={params.status ?? ""} aria-label="Status slučaja">
          <option value="">Svi statusi</option>
          <option value="open">Otvoreno</option>
          <option value="reviewing">U pregledu</option>
          <option value="cleared">Očišćeno</option>
          <option value="approved">Odobreno</option>
          <option value="rejected">Odbijeno</option>
        </Select>
        <Select name="entity_type" defaultValue={params.entity_type ?? ""} aria-label="Tip entiteta">
          <option value="">Svi entiteti</option>
          <option value="listing">Oglas</option>
          <option value="user">Korisnik</option>
          <option value="network">Anonimna aktivnost</option>
        </Select>
        <Select name="reason" defaultValue={params.reason ?? ""} aria-label="Razlog rizika">
          <option value="">Svi razlozi</option>
          <option value="duplicate_same_user">Duplikat istog prodavca</option>
          <option value="duplicate_cross_user">Duplikat između naloga</option>
          <option value="listing_publish_velocity">Ubrzano postavljanje</option>
          <option value="first_message_velocity">Ubrzane prve poruke</option>
          <option value="repeated_report_history">Ponovljene prijave</option>
          <option value="repeated_rejection_history">Ponovljena odbijanja</option>
        </Select>
        <Button type="submit">Filtriraj</Button>
      </form>
      <div className="mt-6">
        <ModerationRiskQueue initialCases={response.data} />
      </div>
      {nextCursor ? (
        <div className="mt-6">
          <Link className="font-bold text-river-700 hover:underline" href={`/admin/rizik?${query.toString()}`}>
            Sledeća strana
          </Link>
        </div>
      ) : null}
    </div>
  );
}
