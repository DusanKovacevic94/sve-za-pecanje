"use client";

import { Flag, Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ApiError, apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/Button";

export function FavoriteButton({ listingId }: { listingId: string }) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
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
