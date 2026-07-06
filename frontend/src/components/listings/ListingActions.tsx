"use client";

import { Archive, CheckCircle2, Flag, Heart, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ApiError, apiFetch, type BuyerCandidate, type ListingDetail } from "@/lib/api";
import { Button } from "@/components/ui/Button";

type FavoriteProps = {
  listingId: string;
  initialSaved?: boolean;
};

export function FavoriteButton({ listingId, initialSaved = false }: FavoriteProps) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [pending, setPending] = useState(false);

  async function onToggle() {
    setPending(true);
    try {
      await apiFetch(`/listings/${listingId}/favorite`, { method: saved ? "DELETE" : "POST" });
      setSaved(!saved);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        router.push("/prijava");
        return;
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <Button onClick={onToggle} disabled={pending} variant="secondary" aria-pressed={saved}>
      <Heart size={18} fill={saved ? "currentColor" : "none"} />
      {saved ? "Sačuvano u omiljenim" : "Dodaj u omiljene"}
    </Button>
  );
}

export function FavoriteIconButton({ listingId, initialSaved = false }: FavoriteProps) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [pending, setPending] = useState(false);

  async function onToggle() {
    setPending(true);
    try {
      await apiFetch(`/listings/${listingId}/favorite`, { method: saved ? "DELETE" : "POST" });
      setSaved(!saved);
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        router.push("/prijava");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      className="focus-ring rounded-md p-2 text-slate-500 hover:bg-river-50 disabled:opacity-60"
      aria-label={saved ? "Ukloni iz omiljenih" : "Dodaj u omiljene"}
      aria-pressed={saved}
      disabled={pending}
      onClick={onToggle}
    >
      <Heart size={19} fill={saved ? "currentColor" : "none"} />
    </button>
  );
}

export function ReportButton({ listingId }: { listingId: string }) {
  const router = useRouter();
  const [reported, setReported] = useState(false);

  async function onReport() {
    const reason = window.prompt("Zašto prijavljujete ovaj oglas?");
    if (!reason?.trim()) return;
    try {
      await apiFetch(`/listings/${listingId}/report`, {
        method: "POST",
        body: JSON.stringify({ reason: "user_report", description: reason.trim() })
      });
      setReported(true);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        router.push("/prijava");
      }
    }
  }

  if (reported) {
    return <p className="rounded-md bg-slate-100 p-3 text-center text-sm font-semibold">Hvala, prijava je poslata.</p>;
  }
  return (
    <Button onClick={onReport} variant="ghost">
      <Flag size={18} /> Prijavi oglas
    </Button>
  );
}

export function OwnerListingActions({ listingId }: { listingId: string }) {
  const router = useRouter();
  const [busyAction, setBusyAction] = useState<"archive" | "mark-sold" | null>(null);
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

  async function runAction(action: "archive" | "mark-sold") {
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
      <div className="grid gap-2 sm:grid-cols-3">
        <Button href={`/izmeni-oglas/${listingId}`} variant="secondary" className="min-h-10 px-3">
          <Pencil size={16} /> Izmeni
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="min-h-10 px-3"
          disabled={busyAction === "mark-sold"}
          onClick={() => runAction("mark-sold")}
        >
          <CheckCircle2 size={16} /> Prodato
        </Button>
        <Button
          type="button"
          variant="danger"
          className="min-h-10 px-3"
          disabled={busyAction === "archive"}
          onClick={() => runAction("archive")}
        >
          <Archive size={16} /> Arhiviraj
        </Button>
      </div>
      {message ? <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{message}</p> : null}
    </div>
  );
}
