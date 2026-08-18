"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  DeleteIcon,
  DownloadIcon,
  LogoutIcon,
  TrustShieldIcon,
  UndoIcon,
} from "@/components/icons";
import { apiFetch, type AccountClosureStatus, type AccountSession, type DataExport } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";

type Props = {
  initialSessions: AccountSession[];
  initialExports: DataExport[];
  initialClosure: AccountClosureStatus;
};

const exportLabels: Record<string, string> = {
  pending: "Na čekanju",
  processing: "Priprema se",
  ready: "Poslat link",
  downloaded: "Preuzeto",
  expired: "Isteklo",
  failed: "Neuspešno",
};

export function AccountSecurityPanel({
  initialSessions,
  initialExports,
  initialClosure,
}: Props) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [sessions, setSessions] = useState(initialSessions);
  const [exports, setExports] = useState(initialExports);
  const [closure, setClosure] = useState(initialClosure);
  const [busy, setBusy] = useState<string | null>(null);
  const [closureConfirmation, setClosureConfirmation] = useState("");
  const [cancelConfirmation, setCancelConfirmation] = useState("");

  async function revokeSession(id: string) {
    setBusy(`session:${id}`);
    try {
      const response = await apiFetch<{ current_session_revoked: boolean }>(
        `/account/sessions/${id}`,
        { method: "DELETE" }
      );
      if (response.data.current_session_revoked) {
        router.push("/prijava");
      } else {
        setSessions((current) => current.filter((item) => item.id !== id));
      }
      pushToast("Sesija je opozvana.", "success");
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Sesija nije opozvana.", "error");
    } finally {
      setBusy(null);
    }
  }

  async function revokeOthers() {
    setBusy("sessions:others");
    try {
      const response = await apiFetch<{ revoked_count: number }>(
        "/account/sessions/revoke-others",
        { method: "POST" }
      );
      setSessions((current) => current.filter((item) => item.is_current));
      pushToast(`Odjavljeno sesija: ${response.data.revoked_count}.`, "success");
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Sesije nisu opozvane.", "error");
    } finally {
      setBusy(null);
    }
  }

  async function requestExport() {
    setBusy("export");
    try {
      const response = await apiFetch<DataExport>("/account/exports", { method: "POST" });
      setExports((current) => [response.data, ...current]);
      pushToast("Zahtev je primljen. Link ćete dobiti emailom kada izvoz bude spreman.", "success");
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Zahtev nije poslat.", "error");
    } finally {
      setBusy(null);
    }
  }

  async function requestClosure() {
    setBusy("closure");
    try {
      const response = await apiFetch<AccountClosureStatus>("/account/closure", {
        method: "POST",
        body: JSON.stringify({ confirmation: closureConfirmation }),
      });
      setClosure((current) => ({ ...current, ...response.data }));
      pushToast("Zahtev je primljen. Nalog je u periodu za oporavak.", "success");
      router.push("/prijava");
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Zahtev nije poslat.", "error");
    } finally {
      setBusy(null);
    }
  }

  async function cancelClosure() {
    setBusy("closure:cancel");
    try {
      const response = await apiFetch<AccountClosureStatus>("/account/closure/cancel", {
        method: "POST",
        body: JSON.stringify({ confirmation: cancelConfirmation }),
      });
      setClosure((current) => ({ ...current, ...response.data }));
      setCancelConfirmation("");
      pushToast("Zatvaranje naloga je otkazano.", "success");
      router.refresh();
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Zahtev nije otkazan.", "error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-black">Aktivne sesije</h2>
            <p className="mt-1 text-sm text-slate-600">
              Pregled uređaja na kojima je nalog trenutno prijavljen.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={revokeOthers}
            disabled={busy !== null || sessions.length <= 1}
          >
            <LogoutIcon size={18} /> Odjavi sve druge
          </Button>
        </div>
        <div className="mt-4 space-y-3">
          {sessions.map((session) => (
            <article key={session.id} className="rounded-md border border-slate-200 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-black">{session.device}</p>
                    {session.is_current ? <Badge tone="accent">Ova sesija</Badge> : null}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Kreirana {formatDate(session.created_at)} · poslednja aktivnost{" "}
                    {session.last_seen_at ? formatDate(session.last_seen_at) : "nije zabeležena"} ·
                    ističe {formatDate(session.expires_at)}
                  </p>
                </div>
                {!session.is_current ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => revokeSession(session.id)}
                    disabled={busy !== null}
                  >
                    Odjavi
                  </Button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
        <h2 className="text-xl font-black">Izvoz mojih podataka</h2>
        <p className="mt-2 text-sm text-slate-600">
          Pripremićemo šifrovanu arhivu. Jednokratni link stiže emailom, važi 24 sata,
          a novi zahtev je moguć nakon sedam dana.
        </p>
        <Button
          type="button"
          className="mt-4"
          onClick={requestExport}
          disabled={busy !== null}
          isLoading={busy === "export"}
        >
          <DownloadIcon size={18} /> Zatraži izvoz
        </Button>
        {exports.length ? (
          <ul className="mt-4 space-y-2 text-sm">
            {exports.map((item) => (
              <li key={item.id} className="flex flex-wrap justify-between gap-2 rounded-md bg-slate-50 p-3">
                <span>{formatDate(item.created_at)}</span>
                <span className="font-bold">{exportLabels[item.status] ?? item.status}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="rounded-lg border border-red-200 bg-white p-5 shadow-soft">
        <div className="flex items-center gap-2 text-red-800">
          <TrustShieldIcon size={20} />
          <h2 className="text-xl font-black">Zatvaranje naloga</h2>
        </div>
        {!closure.enabled ? (
          <p className="mt-3 rounded-md bg-slate-100 p-3 text-sm text-slate-700">
            Samostalno zatvaranje naloga još nije omogućeno dok politika čuvanja podataka
            ne prođe pravnu proveru.
          </p>
        ) : closure.status === "grace_period" ? (
          <div className="mt-4">
            <p className="text-sm text-slate-700">
              Nalog je sakriven i biće anonimizovan{" "}
              {closure.scheduled_for ? formatDate(closure.scheduled_for) : "nakon perioda oporavka"}.
            </p>
            <label className="mt-4 block text-sm font-bold">
              Unesite ZADRŽI da otkažete zatvaranje
              <Input
                value={cancelConfirmation}
                onChange={(event) => setCancelConfirmation(event.target.value)}
                className="mt-1"
              />
            </label>
            <Button
              type="button"
              variant="secondary"
              className="mt-3"
              onClick={cancelClosure}
              disabled={busy !== null || cancelConfirmation.trim().toUpperCase() !== "ZADRŽI"}
            >
              <UndoIcon size={18} /> Zadrži nalog
            </Button>
          </div>
        ) : (
          <div className="mt-4">
            <p className="text-sm text-slate-700">
              Aktivni oglasi i prodavnica se odmah skrivaju, a sve sesije se odjavljuju.
              Zahtev možete otkazati tokom narednih 30 dana ponovnom prijavom.
            </p>
            <label className="mt-4 block text-sm font-bold">
              Unesite OBRIŠI da potvrdite
              <Input
                value={closureConfirmation}
                onChange={(event) => setClosureConfirmation(event.target.value)}
                className="mt-1"
              />
            </label>
            <Button
              type="button"
              variant="danger"
              className="mt-3"
              onClick={requestClosure}
              disabled={busy !== null || closureConfirmation.trim().toUpperCase() !== "OBRIŠI"}
            >
              <DeleteIcon size={18} /> Zatraži zatvaranje
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
