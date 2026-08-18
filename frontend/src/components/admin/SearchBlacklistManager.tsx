"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { DeleteIcon, ShieldBlockedIcon } from "@/components/icons";
import {
  apiFetch,
  type SearchBlacklistItem
} from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { FieldLabel, Input } from "@/components/ui/Field";

export function SearchBlacklistManager({
  initialItems
}: {
  initialItems: SearchBlacklistItem[];
}) {
  const router = useRouter();
  const [term, setTerm] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function addTerm() {
    if (term.trim().length < 2) return;
    setBusy(true);
    setMessage(null);
    try {
      await apiFetch<SearchBlacklistItem>("/admin/search-blacklist", {
        method: "POST",
        body: JSON.stringify({ term: term.trim() })
      });
      setTerm("");
      setMessage("Termin je dodat na listu.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Termin nije dodat.");
    } finally {
      setBusy(false);
    }
  }

  async function removeTerm(id: string) {
    setBusy(true);
    setMessage(null);
    try {
      await apiFetch(`/admin/search-blacklist/${id}`, { method: "DELETE" });
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Termin nije uklonjen.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
        <div className="flex items-start gap-3">
          <ShieldBlockedIcon className="mt-0.5 text-red-700" size={24} />
          <div>
            <h2 className="text-xl font-black">Blokirani termini pretrage</h2>
            <p className="mt-1 text-sm text-slate-600">
              Termin i pretrage koje ga sadrže neće biti prikazani kao popularni predlozi.
            </p>
          </div>
        </div>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <FieldLabel htmlFor="blacklist-term">Termin</FieldLabel>
            <Input
              id="blacklist-term"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              maxLength={160}
            />
          </div>
          <Button type="button" disabled={busy || term.trim().length < 2} onClick={addTerm}>
            Dodaj termin
          </Button>
        </div>
        {message ? <p className="mt-3 text-sm font-semibold text-slate-700">{message}</p> : null}
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-soft">
        {initialItems.length ? (
          <ul className="divide-y divide-slate-100">
            {initialItems.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-4 p-4">
                <span className="font-semibold">{item.term_normalized}</span>
                <Button
                  type="button"
                  variant="danger"
                  disabled={busy}
                  onClick={() => removeTerm(item.id)}
                >
                  <DeleteIcon size={16} /> Ukloni
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="p-5 text-slate-600">Nema blokiranih termina.</p>
        )}
      </section>
    </div>
  );
}
