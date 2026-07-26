"use client";

import Link from "next/link";
import { useState } from "react";

import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/Button";

export type ModerationCase = {
  id: string;
  entity_type: string;
  entity_id: string;
  entity: { title: string; slug: string; status: string } | null;
  report_evidence: {
    reason: string;
    explanation: string | null;
    message_level: boolean;
    snapshot: {
      target_message: { body: string } | null;
      listing: { title: string; slug: string; status: string } | null;
      reported_account: {
        username: string;
        status: string;
        prior_listing_reports: number;
        prior_conversation_reports: number;
      } | null;
    };
  } | null;
  subject: { id: string; username: string; status: string } | null;
  risk_score: number;
  reason_codes: string[];
  status: string;
  assigned_admin_id: string | null;
  internal_notes: string | null;
  created_at: string;
};

type History = {
  cases: ModerationCase[];
  audit: { id: string; action: string; created_at: string }[];
};

const reasonLabels: Record<string, string> = {
  registration_velocity: "Ubrzane registracije",
  login_velocity: "Ubrzani pokušaji prijave",
  reset_velocity: "Ubrzani reseti lozinke",
  listing_publish_velocity: "Ubrzano postavljanje oglasa",
  first_message_velocity: "Ubrzane prve poruke",
  repeated_report_history: "Ponovljene prijave",
  repeated_rejection_history: "Ponovljena odbijanja",
  repeated_failed_challenge: "Neuspele bezbednosne provere",
  duplicate_same_user: "Duplikat istog prodavca",
  duplicate_cross_user: "Duplikat između naloga",
  conversation_report: "Prijava razgovora",
  conversation_report_spam: "Neželjene poruke",
  conversation_report_harassment: "Uznemiravanje ili pretnje",
  conversation_report_scam: "Sumnja na prevaru",
  conversation_report_off_platform_payment: "Pritisak za uplatu van platforme",
  conversation_report_inappropriate_content: "Neprimeren sadržaj",
  conversation_report_other: "Drugo"
};

export function ModerationRiskQueue({ initialCases }: { initialCases: ModerationCase[] }) {
  const [cases, setCases] = useState(initialCases);
  const [selected, setSelected] = useState<string[]>([]);
  const [histories, setHistories] = useState<Record<string, History>>({});
  const [message, setMessage] = useState<string | null>(null);

  async function bulkAction(action: "clear" | "approve" | "reject") {
    if (!selected.length) return;
    const note = window.prompt(
      action === "reject" ? "Interna beleška / razlog odbijanja" : "Interna beleška (opciono)",
      ""
    );
    if (note === null) return;
    setMessage(null);
    try {
      const response = await apiFetch<ModerationCase[]>("/admin/moderation-cases/bulk", {
        method: "POST",
        body: JSON.stringify({ case_ids: selected, action, note: note || null })
      });
      const updated = new Map(response.data.map((item) => [item.id, item]));
      setCases((current) => current.map((item) => updated.get(item.id) ?? item));
      setSelected([]);
      setMessage("Akcija je evidentirana u audit istoriji.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Akcija nije izvršena.");
    }
  }

  async function toggleAssignment(item: ModerationCase) {
    const response = await apiFetch<ModerationCase>(
      `/admin/moderation-cases/${item.id}/assign`,
      {
        method: "POST",
        body: JSON.stringify({ assigned: !item.assigned_admin_id })
      }
    );
    setCases((current) => current.map((row) => (row.id === item.id ? response.data : row)));
  }

  async function addNote(item: ModerationCase) {
    const note = window.prompt("Interna beleška");
    if (!note?.trim()) return;
    const response = await apiFetch<ModerationCase>(
      `/admin/moderation-cases/${item.id}/notes`,
      { method: "POST", body: JSON.stringify({ note }) }
    );
    setCases((current) => current.map((row) => (row.id === item.id ? response.data : row)));
  }

  async function loadHistory(item: ModerationCase) {
    if (histories[item.id]) {
      setHistories((current) => {
        const next = { ...current };
        delete next[item.id];
        return next;
      });
      return;
    }
    const response = await apiFetch<History>(
      `/admin/moderation-cases/${item.id}/history`
    );
    setHistories((current) => ({ ...current, [item.id]: response.data }));
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-white p-4 shadow-soft">
        <Button type="button" variant="secondary" onClick={() => bulkAction("clear")}>
          Očisti izabrane
        </Button>
        <Button type="button" onClick={() => bulkAction("approve")}>
          Odobri izabrane
        </Button>
        <Button type="button" variant="danger" onClick={() => bulkAction("reject")}>
          Odbij izabrane
        </Button>
        <span className="self-center text-sm font-semibold text-slate-600">
          Izabrano: {selected.length}
        </span>
      </div>
      {message ? <p className="mt-3 rounded-md bg-river-50 p-3 text-sm font-semibold text-river-800">{message}</p> : null}
      <div className="mt-5 space-y-4">
        {cases.map((item) => (
          <article key={item.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
            <div className="flex flex-col gap-4 lg:flex-row lg:justify-between">
              <div className="flex gap-3">
                <input
                  type="checkbox"
                  aria-label={`Izaberi slučaj ${item.id}`}
                  checked={selected.includes(item.id)}
                  onChange={(event) =>
                    setSelected((current) =>
                      event.target.checked
                        ? [...current, item.id]
                        : current.filter((id) => id !== item.id)
                    )
                  }
                />
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-sm font-black ${
                      item.risk_score >= 75
                        ? "bg-red-100 text-red-800"
                        : item.risk_score >= 50
                          ? "bg-amber-100 text-amber-900"
                          : "bg-slate-100 text-slate-700"
                    }`}>
                      Rizik {item.risk_score}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">
                      {item.status}
                    </span>
                    <span className="text-xs font-semibold uppercase text-slate-500">
                      {item.entity_type}
                    </span>
                  </div>
                  <h2 className="mt-3 text-lg font-black">
                    {item.entity ? (
                      <Link className="text-river-700 hover:underline" href={`/oglasi/${item.entity.slug}`}>
                        {item.entity.title}
                      </Link>
                    ) : item.subject ? (
                      <Link className="text-river-700 hover:underline" href={`/prodavci/${item.subject.username}`}>
                        {item.subject.username}
                      </Link>
                    ) : (
                      "Anonimna aktivnost"
                    )}
                  </h2>
                  <p className="mt-2 text-sm text-slate-700">
                    {item.reason_codes.map((code) => reasonLabels[code] ?? code).join(" · ")}
                  </p>
                  {item.report_evidence ? (
                    <div className="mt-3 space-y-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
                      <p className="font-black">
                        {item.report_evidence.message_level ? "Prijavljena poruka" : "Prijavljen razgovor"}
                        {item.report_evidence.snapshot.listing
                          ? ` · ${item.report_evidence.snapshot.listing.title}`
                          : ""}
                      </p>
                      {item.report_evidence.explanation ? (
                        <p>{item.report_evidence.explanation}</p>
                      ) : null}
                      {item.report_evidence.snapshot.target_message ? (
                        <blockquote className="whitespace-pre-wrap border-l-2 border-amber-400 pl-3">
                          {item.report_evidence.snapshot.target_message.body}
                        </blockquote>
                      ) : null}
                      {item.report_evidence.snapshot.reported_account ? (
                        <p className="text-xs font-semibold">
                          Nalog: {item.report_evidence.snapshot.reported_account.username} ·{" "}
                          {item.report_evidence.snapshot.reported_account.status} · ranije prijave oglasa:{" "}
                          {item.report_evidence.snapshot.reported_account.prior_listing_reports} · razgovora:{" "}
                          {item.report_evidence.snapshot.reported_account.prior_conversation_reports}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                  {item.internal_notes ? (
                    <pre className="mt-3 whitespace-pre-wrap rounded-md bg-slate-50 p-3 text-xs text-slate-700">
                      {item.internal_notes}
                    </pre>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 lg:max-w-80 lg:justify-end">
                <Button type="button" variant="secondary" onClick={() => toggleAssignment(item)}>
                  {item.assigned_admin_id ? "Oslobodi" : "Preuzmi"}
                </Button>
                <Button type="button" variant="secondary" onClick={() => addNote(item)}>
                  Beleška
                </Button>
                <Button type="button" variant="ghost" onClick={() => loadHistory(item)}>
                  {histories[item.id] ? "Sakrij istoriju" : "Povezana istorija"}
                </Button>
              </div>
            </div>
            {histories[item.id] ? (
              <div className="mt-4 grid gap-4 border-t border-slate-100 pt-4 md:grid-cols-2">
                <div>
                  <h3 className="font-black">Povezani slučajevi</h3>
                  <ul className="mt-2 space-y-1 text-sm text-slate-600">
                    {histories[item.id].cases.map((row) => (
                      <li key={row.id}>{row.status} · rizik {row.risk_score} · {row.reason_codes.join(", ")}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-black">Audit istorija</h3>
                  <ul className="mt-2 space-y-1 text-sm text-slate-600">
                    {histories[item.id].audit.map((row) => (
                      <li key={row.id}>{row.action} · {new Date(row.created_at).toLocaleString("sr-RS")}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : null}
          </article>
        ))}
        {!cases.length ? (
          <p className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-600">
            Nema slučajeva za izabrane filtere.
          </p>
        ) : null}
      </div>
    </div>
  );
}
