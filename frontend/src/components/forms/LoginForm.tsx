"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { publicApiUrl } from "@/lib/api";
import { loginSchema } from "@/lib/validation";
import { Button } from "@/components/ui/Button";
import { FieldLabel, Input } from "@/components/ui/Field";

type FormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const { register, handleSubmit, formState, watch } = useForm<FormData>({
    resolver: zodResolver(loginSchema)
  });
  const email = watch("email");

  async function onSubmit(data: FormData) {
    const response = await fetch(`${publicApiUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data)
    });
    const json = await response.json();
    if (response.ok) {
      router.push("/nalog");
      router.refresh();
    } else {
      setMessage(json?.error?.message ?? "Došlo je do greške.");
    }
  }

  async function resendVerification() {
    if (!email) {
      setMessage("Unesite email adresu.");
      return;
    }
    const response = await fetch(`${publicApiUrl}/auth/resend-verification`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    const json = await response.json().catch(() => null);
    setMessage(response.ok ? json.data.message : json?.error?.message ?? "Došlo je do greške.");
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
      {message ? <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{message}</p> : null}
    </form>
  );
}
