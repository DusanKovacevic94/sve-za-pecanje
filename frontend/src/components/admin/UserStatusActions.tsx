"use client";

import { useState } from "react";
import { Ban, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";

import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/Button";

export function UserStatusActions({ userId, status }: { userId: string; status: string }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);

  async function toggleStatus() {
    setMessage(null);
    try {
      if (status === "suspended") {
        await apiFetch(`/admin/users/${userId}/unsuspend`, { method: "POST" });
      } else {
        const reason = window.prompt("Razlog suspenzije", "Kršenje pravila platforme");
        if (!reason) return;
        await apiFetch(`/admin/users/${userId}/suspend`, {
          method: "POST",
          body: JSON.stringify({ reason })
        });
      }
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Status nije promenjen.");
    }
  }

  return (
    <div>
      <Button type="button" variant={status === "suspended" ? "secondary" : "danger"} onClick={toggleStatus}>
        {status === "suspended" ? <ShieldCheck size={18} /> : <Ban size={18} />}
        {status === "suspended" ? "Reaktiviraj" : "Suspenduj"}
      </Button>
      {message ? <p className="mt-2 text-sm font-semibold text-red-700">{message}</p> : null}
    </div>
  );
}
