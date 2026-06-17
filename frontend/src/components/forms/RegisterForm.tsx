"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { publicApiUrl } from "@/lib/api";
import { registerSchema } from "@/lib/validation";
import { Button } from "@/components/ui/Button";
import { FieldLabel, Input } from "@/components/ui/Field";

type FormData = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const [message, setMessage] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<FormData>({
    resolver: zodResolver(registerSchema)
  });

  async function onSubmit(data: FormData) {
    setMessage(null);
    const response = await fetch(`${publicApiUrl}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data)
    });
    const json = await response.json();
    setMessage(response.ok ? "Nalog je kreiran. Proverite email za potvrdu." : json?.error?.message ?? "Došlo je do greške.");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
      <div>
        <FieldLabel htmlFor="email">Email</FieldLabel>
        <Input id="email" type="email" {...register("email")} />
        <p className="mt-1 text-sm text-red-600">{formState.errors.email?.message}</p>
      </div>
      <div>
        <FieldLabel htmlFor="username">Korisničko ime</FieldLabel>
        <Input id="username" {...register("username")} />
        <p className="mt-1 text-sm text-red-600">{formState.errors.username?.message}</p>
      </div>
      <div>
        <FieldLabel htmlFor="password">Lozinka</FieldLabel>
        <Input id="password" type="password" {...register("password")} />
        <p className="mt-1 text-sm text-red-600">{formState.errors.password?.message}</p>
      </div>
      <label className="flex gap-3 text-sm">
        <input type="checkbox" className="mt-1" {...register("accepted_terms")} />
        Prihvatam uslove korišćenja i politiku privatnosti.
      </label>
      <p className="text-sm text-red-600">{formState.errors.accepted_terms?.message}</p>
      <Button type="submit" disabled={formState.isSubmitting} className="w-full">
        Registruj se
      </Button>
      {message ? <p className="rounded-md bg-river-50 p-3 text-sm font-semibold text-river-700">{message}</p> : null}
    </form>
  );
}

