"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  ArchiveIcon,
  EditIcon,
  FavoriteIcon,
  LockIcon,
  MessageIcon,
  ReportIcon,
  SuccessIcon,
  UndoIcon,
} from "@/components/icons";
import { ApiError, apiFetch, type BuyerCandidate, type ListingDetail } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { useToast } from "@/components/ui/Toast";

type FavoriteProps = {
  listingId: string;
  initialSaved?: boolean;
  loginPath?: string;
};

export function FavoriteButton({ listingId, initialSaved = false, loginPath = "/prijava" }: FavoriteProps) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [pending, setPending] = useState(false);
  const { pushToast } = useToast();

  async function onToggle() {
    setPending(true);
    try {
      await apiFetch(`/listings/${listingId}/favorite`, { method: saved ? "DELETE" : "POST" });
      const next = !saved;
      setSaved(next);
      pushToast(next ? "Oglas je dodat u omiljene." : "Oglas je uklonjen iz omiljenih.", "success");
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        router.push(loginPath);
        return;
      }
      pushToast("Omiljeni nisu ažurirani.", "error");
    } finally {
      setPending(false);
    }
  }

  return (
    <Button onClick={onToggle} disabled={pending} variant="secondary" aria-pressed={saved}>
      <FavoriteIcon size={18} fill={saved ? "currentColor" : "none"} />
      {saved ? "Sačuvano u omiljenim" : "Dodaj u omiljene"}
    </Button>
  );
}

export function FavoriteIconButton({ listingId, initialSaved = false, loginPath = "/prijava" }: FavoriteProps) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [pending, setPending] = useState(false);
  const { pushToast } = useToast();

  async function onToggle() {
    setPending(true);
    try {
      await apiFetch(`/listings/${listingId}/favorite`, { method: saved ? "DELETE" : "POST" });
      const next = !saved;
      setSaved(next);
      pushToast(next ? "Oglas je dodat u omiljene." : "Oglas je uklonjen iz omiljenih.", "success");
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        router.push(loginPath);
        return;
      }
      pushToast("Omiljeni nisu ažurirani.", "error");
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      className={`focus-ring rounded-xl p-2 hover:bg-river-50 motion-safe:transition motion-safe:duration-150 disabled:opacity-60 ${
        saved ? "text-river-700 motion-safe:scale-105" : "text-ink-500"
      }`}
      aria-label={saved ? "Ukloni iz omiljenih" : "Dodaj u omiljene"}
      aria-pressed={saved}
      disabled={pending}
      onClick={onToggle}
    >
      <FavoriteIcon size={18} fill={saved ? "currentColor" : "none"} />
    </button>
  );
}

export function MobileListingActions({
  listingId,
  listingPath,
  price,
  status,
  canMessage,
  isOwner,
  isAuthenticated,
  initialSaved = false
}: {
  listingId: string;
  listingPath: string;
  price: string;
  status: string;
  canMessage: boolean;
  isOwner: boolean;
  isAuthenticated: boolean;
  initialSaved?: boolean;
}) {
  const messagePath = `/nalog/poruke?listing=${listingId}`;
  const loginPath = `/prijava?next=${encodeURIComponent(listingPath)}`;
  const messageHref = isAuthenticated
    ? messagePath
    : `/prijava?next=${encodeURIComponent(messagePath)}`;
  const statusLabel = status === "sold"
    ? "Prodato"
    : status === "reserved"
      ? "Rezervisano"
      : status === "active"
        ? "Aktivan oglas"
        : "Oglas na pregledu";

  return (
    <aside
      aria-label="Brze akcije oglasa"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-sand-200 bg-white/95 px-4 pt-3 shadow-action-bar backdrop-blur lg:hidden"
      style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto max-w-7xl">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="truncate text-lg font-extrabold text-river-800" data-mobile-listing-price>{price}</p>
          <p className={`shrink-0 text-xs font-extrabold ${
            status === "sold"
              ? "text-ink-600"
              : status === "reserved"
                ? "text-reed-800"
                : "text-river-700"
          }`}>
            {statusLabel}
          </p>
        </div>
        <div className="flex items-stretch gap-2">
          {isOwner ? (
            <Button href={`/izmeni-oglas/${listingId}`} variant="secondary" className="min-w-0 flex-1">
              <EditIcon size={18} /> Izmeni oglas
            </Button>
          ) : status === "sold" ? (
            <p className="flex min-h-11 min-w-0 flex-1 items-center justify-center rounded-xl bg-sand-100 px-3 text-sm font-bold text-ink-700">
              Oglas je prodat
            </p>
          ) : canMessage ? (
            <Button href={messageHref} className="min-w-0 flex-1">
              <MessageIcon size={18} /> Pošalji poruku
            </Button>
          ) : (
            <p className="flex min-h-11 min-w-0 flex-1 items-center justify-center rounded-xl bg-sand-100 px-3 text-center text-sm font-bold text-ink-700">
              Kontakt nije dostupan
            </p>
          )}
          {!isOwner ? (
            <div className="grid min-h-11 min-w-11 place-items-center rounded-xl border border-sand-300 bg-white">
              <FavoriteIconButton
                listingId={listingId}
                initialSaved={initialSaved}
                loginPath={loginPath}
              />
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
}

export function ReportButton({ listingId }: { listingId: string }) {
  const router = useRouter();
  const [reported, setReported] = useState(false);
  const { pushToast } = useToast();

  async function onReport() {
    const reason = window.prompt("Zašto prijavljujete ovaj oglas?");
    if (!reason?.trim()) return;
    try {
      await apiFetch(`/listings/${listingId}/report`, {
        method: "POST",
        body: JSON.stringify({ reason: "user_report", description: reason.trim() })
      });
      setReported(true);
      pushToast("Prijava je poslata administratorima.", "success");
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        router.push("/prijava");
      }
      pushToast("Prijava nije poslata.", "error");
    }
  }

  if (reported) {
    return <p className="rounded-xl bg-sand-100 p-3 text-center text-sm font-semibold">Hvala, prijava je poslata.</p>;
  }
  return (
    <Button onClick={onReport} variant="ghost">
      <ReportIcon size={18} /> Prijavi oglas
    </Button>
  );
}

export function OwnerListingActions({ listingId, status }: { listingId: string; status: string }) {
  const router = useRouter();
  const [busyAction, setBusyAction] = useState<"archive" | "mark-sold" | "reserve" | "unreserve" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function chooseBuyerId() {
    const response = await apiFetch<BuyerCandidate[]>(`/listings/${listingId}/buyer-candidates`);
    const candidates = response.data;
    if (!candidates.length) {
      return window.confirm("Nema razgovora sa kupcima za ovaj oglas. Označiti kao prodato bez kupca?") ? null : undefined;
    }
    const options = candidates
      .map((candidate, index) => `${index + 1}. ${candidate.display_name ?? candidate.username}`)
      .join("\n");
    const selected = window.prompt(`Izaberite kupca unosom broja:\n${options}`);
    if (!selected) return undefined;
    const index = Number(selected) - 1;
    return candidates[index]?.id;
  }

  async function runAction(action: "archive" | "mark-sold" | "reserve" | "unreserve") {
    const soldToUserId = action === "mark-sold" ? await chooseBuyerId() : null;
    if (soldToUserId === undefined) return;
    const confirmed = action === "archive" ? window.confirm("Arhivirati ovaj oglas?") : true;
    if (!confirmed) return;
    setMessage(null);
    setBusyAction(action);
    try {
      await apiFetch<ListingDetail>(`/listings/${listingId}/${action}`, {
        method: "POST",
        body: action === "mark-sold" ? JSON.stringify({ sold_to_user_id: soldToUserId }) : undefined
      });
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Došlo je do greške.");
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <div className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-2">
        <Button href={`/izmeni-oglas/${listingId}`} variant="secondary" className="min-h-10 px-3">
          <EditIcon size={16} /> Izmeni
        </Button>
        {status === "active" ? (
          <Button
            type="button"
            variant="secondary"
            className="min-h-10 px-3"
            disabled={busyAction === "reserve"}
            onClick={() => runAction("reserve")}
          >
            <LockIcon size={16} /> Rezerviši
          </Button>
        ) : null}
        {status === "reserved" ? (
          <Button
            type="button"
            variant="secondary"
            className="min-h-10 px-3"
            disabled={busyAction === "unreserve"}
            onClick={() => runAction("unreserve")}
          >
            <UndoIcon size={16} /> Ukloni rezervaciju
          </Button>
        ) : null}
        {status === "active" || status === "reserved" ? (
          <Button
            type="button"
            variant="secondary"
            className="min-h-10 px-3"
            disabled={busyAction === "mark-sold"}
            onClick={() => runAction("mark-sold")}
          >
            <SuccessIcon size={16} /> Prodato
          </Button>
        ) : null}
        <Button
          type="button"
          variant="danger"
          className="min-h-10 px-3"
          disabled={busyAction === "archive"}
          onClick={() => runAction("archive")}
        >
          <ArchiveIcon size={16} /> Arhiviraj
        </Button>
      </div>
      {message ? <Alert tone="error">{message}</Alert> : null}
    </div>
  );
}
