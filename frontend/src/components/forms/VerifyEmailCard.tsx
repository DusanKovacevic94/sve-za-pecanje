"use client";

import { useState } from "react";

import { apiFetch } from "@/lib/api";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";

export function VerifyEmailCard({ token }: { token: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [verified, setVerified] = useState(false);

  async function onVerify() {
    setPending(true);
    setMessage(null);
    try {
      await apiFetch("/auth/verify-email", { method: "POST", body: JSON.stringify({ token }) });
      setVerified(true);
    } catch {
      setMessage("Link za potvrdu je nevažeći ili je već iskorišćen.");
    } finally {
      setPending(false);
    }
  }

  if (verified) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
        <Alert tone="success">Email adresa je potvrđena. Sada možete da postavljate oglase.</Alert>
        <Button href="/prijava" className="mt-4">
          Prijavite se
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
      <p className="text-slate-600">Kliknite na dugme da potvrdite svoju email adresu.</p>
      <Button onClick={onVerify} disabled={pending} className="mt-4">
        Potvrdi email
      </Button>
      {message ? <Alert tone="error" className="mt-3">{message}</Alert> : null}
    </div>
  );
}
