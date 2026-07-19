"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { ApiError, apiFetch } from "@/lib/api";
import { forgotPasswordSchema } from "@/lib/validation";
import { Button } from "@/components/ui/Button";
import { FieldLabel, Input } from "@/components/ui/Field";
import { TurnstileChallenge } from "@/components/forms/TurnstileChallenge";

type FormData = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [challengeRequired, setChallengeRequired] = useState(false);
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [challengeKey, setChallengeKey] = useState(0);
  const { register, handleSubmit, formState } = useForm<FormData>({
    resolver: zodResolver(forgotPasswordSchema)
  });

  async function onSubmit(data: FormData) {
    setMessage(null);
    try {
      await apiFetch("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ ...data, turnstile_token: challengeToken })
      });
      setSent(true);
    } catch (error) {
      if (
        error instanceof ApiError
        && ["challenge_required", "challenge_unavailable"].includes(error.code)
      ) {
        setChallengeRequired(true);
        setChallengeToken(null);
        setChallengeKey((value) => value + 1);
      }
      setMessage(error instanceof Error ? error.message : "Došlo je do greške.");
    }
  }

  if (sent) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
        <p className="font-semibold">Ako nalog postoji, poslali smo email sa linkom za reset lozinke.</p>
        <p className="mt-2 text-sm text-slate-600">Proverite prijemno sanduče i spam folder.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
      <div>
        <FieldLabel htmlFor="email">Email</FieldLabel>
        <Input id="email" type="email" {...register("email")} />
        <p className="mt-1 text-sm text-red-600">{formState.errors.email?.message}</p>
      </div>
      <Button type="submit" disabled={formState.isSubmitting} className="w-full">
        Pošalji link za reset
      </Button>
      {challengeRequired ? (
        <TurnstileChallenge key={challengeKey} onToken={setChallengeToken} />
      ) : null}
      {message ? <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{message}</p> : null}
    </form>
  );
}
