"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";

import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/Button";

export type FailedEmail = {
  id: string;
  to_email: string;
  subject: string;
  status: string;
  attempts: number;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};

export function FailedEmailManager({ emails }: { emails: FailedEmail[] }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);

  async function retry(emailId: string) {
    setMessage(null);
    try {
      await apiFetch(`/admin/emails/${emailId}/retry`, { method: "POST" });
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Email nije vraćen u red.");
    }
  }

  return (
    <div className="space-y-4">
      {message ? <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{message}</p> : null}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-soft">
        {emails.map((email) => (
          <article key={email.id} className="grid gap-3 border-b border-slate-100 p-4 lg:grid-cols-[1fr_auto]">
            <div>
              <h2 className="font-bold">{email.subject}</h2>
              <p className="mt-1 text-sm text-slate-600">
                {email.to_email} · {email.attempts} pokušaja
              </p>
              {email.last_error ? <p className="mt-2 text-sm text-red-700">{email.last_error}</p> : null}
            </div>
            <Button type="button" variant="secondary" onClick={() => retry(email.id)}>
              <RotateCcw size={18} /> Pokušaj ponovo
            </Button>
          </article>
        ))}
        {!emails.length ? <p className="p-5 text-slate-600">Nema neuspelih emailova.</p> : null}
      </div>
    </div>
  );
}
