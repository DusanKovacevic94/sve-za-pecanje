"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { ApiError, apiFetch } from "@/lib/api";
import { resetPasswordSchema } from "@/lib/validation";
import { Button } from "@/components/ui/Button";
import { FieldLabel, Input } from "@/components/ui/Field";
import { TurnstileChallenge } from "@/components/forms/TurnstileChallenge";

type FormData = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordForm({ token }: { token: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [challengeRequired, setChallengeRequired] = useState(false);
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [challengeKey, setChallengeKey] = useState(0);
  const { register, handleSubmit, formState } = useForm<FormData>({
    resolver: zodResolver(resetPasswordSchema)
  });

  async function onSubmit(data: FormData) {
    setMessage(null);
    try {
      await apiFetch("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({
          token,
          new_password: data.new_password,
          turnstile_token: challengeToken
        })
      });
      setDone(true);
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

  if (done) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
        <p className="font-semibold">Lozinka je uspešno promenjena.</p>
        <Button href="/prijava" className="mt-4">
          Prijavite se
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
      <div>
        <FieldLabel htmlFor="new_password">Nova lozinka</FieldLabel>
        <Input id="new_password" type="password" {...register("new_password")} />
        <p className="mt-1 text-sm text-red-600">{formState.errors.new_password?.message}</p>
      </div>
      <div>
        <FieldLabel htmlFor="confirm_password">Ponovite lozinku</FieldLabel>
        <Input id="confirm_password" type="password" {...register("confirm_password")} />
        <p className="mt-1 text-sm text-red-600">{formState.errors.confirm_password?.message}</p>
      </div>
      <Button type="submit" disabled={formState.isSubmitting} className="w-full">
        Postavi novu lozinku
      </Button>
      {challengeRequired ? (
        <TurnstileChallenge key={challengeKey} onToken={setChallengeToken} />
      ) : null}
      {message ? <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{message}</p> : null}
    </form>
  );
}
