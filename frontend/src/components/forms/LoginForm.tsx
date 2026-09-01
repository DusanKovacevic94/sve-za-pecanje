"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { publicApiUrl } from "@/lib/api";
import { safeNextPath } from "@/lib/navigation";
import { loginSchema } from "@/lib/validation";
import { Button } from "@/components/ui/Button";
import { Alert, type AlertMessage } from "@/components/ui/Alert";
import { FieldLabel, Input } from "@/components/ui/Field";
import { TurnstileChallenge } from "@/components/forms/TurnstileChallenge";

type FormData = z.infer<typeof loginSchema>;

export function LoginForm({ nextPath = "/nalog" }: { nextPath?: string }) {
  const router = useRouter();
  const [message, setMessage] = useState<AlertMessage | null>(null);
  const [challengeRequired, setChallengeRequired] = useState(false);
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [challengeKey, setChallengeKey] = useState(0);
  const { register, handleSubmit, formState, watch } = useForm<FormData>({
    resolver: zodResolver(loginSchema)
  });
  const email = watch("email");

  async function onSubmit(data: FormData) {
    const response = await fetch(`${publicApiUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ ...data, turnstile_token: challengeToken })
    });
    const json = await response.json();
    if (response.ok) {
      router.push(safeNextPath(nextPath));
      router.refresh();
    } else {
      if (["challenge_required", "challenge_unavailable"].includes(json?.error?.code)) {
        setChallengeRequired(true);
        setChallengeToken(null);
        setChallengeKey((value) => value + 1);
      }
      setMessage({ tone: "error", text: json?.error?.message ?? "Došlo je do greške." });
    }
  }

  async function resendVerification() {
    if (!email) {
      setMessage({ tone: "warning", text: "Unesite email adresu." });
      return;
    }
    const response = await fetch(`${publicApiUrl}/auth/resend-verification`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    const json = await response.json().catch(() => null);
    setMessage({
      tone: response.ok ? "success" : "error",
      text: response.ok ? json.data.message : json?.error?.message ?? "Došlo je do greške."
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
      <div>
        <FieldLabel htmlFor="email">Email</FieldLabel>
        <Input id="email" type="email" error={formState.errors.email?.message} {...register("email")} />
      </div>
      <div>
        <FieldLabel htmlFor="password">Lozinka</FieldLabel>
        <Input id="password" type="password" error={formState.errors.password?.message} {...register("password")} />
      </div>
      <Button type="submit" disabled={formState.isSubmitting} className="w-full">
        Prijavi se
      </Button>
      {challengeRequired ? (
        <TurnstileChallenge key={challengeKey} onToken={setChallengeToken} />
      ) : null}
      <p className="text-sm">
        <a href="/zaboravljena-lozinka" className="focus-ring rounded font-semibold text-river-700">
          Zaboravili ste lozinku?
        </a>
      </p>
      <button
        type="button"
        onClick={resendVerification}
        className="focus-ring rounded text-sm font-semibold text-river-700"
      >
        Pošalji ponovo verifikacioni email
      </button>
      {message ? <Alert tone={message.tone}>{message.text}</Alert> : null}
    </form>
  );
}
