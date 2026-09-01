"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { SendIcon } from "@/components/icons";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Alert, type AlertMessage } from "@/components/ui/Alert";
import { FieldLabel, Input, Textarea } from "@/components/ui/Field";

const schema = z.object({
  name: z.string().min(2, "Unesite ime."),
  email: z.string().email("Unesite ispravan email."),
  subject: z.string().min(3, "Unesite temu."),
  message: z.string().min(10, "Poruka je prekratka."),
  website: z.string().optional()
});

type ContactInput = z.infer<typeof schema>;

export function ContactForm() {
  const [status, setStatus] = useState<AlertMessage | null>(null);
  const { register, handleSubmit, reset, formState } = useForm<ContactInput>({
    resolver: zodResolver(schema),
    defaultValues: { website: "" }
  });

  async function onSubmit(data: ContactInput) {
    setStatus(null);
    try {
      await apiFetch<{ message: string }>("/contact", {
        method: "POST",
        body: JSON.stringify(data)
      });
      reset();
      setStatus({ tone: "success", text: "Poruka je poslata." });
    } catch (error) {
      setStatus({ tone: "error", text: error instanceof Error ? error.message : "Poruka nije poslata." });
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-soft">
      <div>
        <FieldLabel htmlFor="name">Ime</FieldLabel>
        <Input id="name" error={formState.errors.name?.message} {...register("name")} />
      </div>
      <div>
        <FieldLabel htmlFor="email">Email</FieldLabel>
        <Input id="email" type="email" error={formState.errors.email?.message} {...register("email")} />
      </div>
      <div>
        <FieldLabel htmlFor="subject">Tema</FieldLabel>
        <Input id="subject" error={formState.errors.subject?.message} {...register("subject")} />
      </div>
      <div>
        <FieldLabel htmlFor="message">Poruka</FieldLabel>
        <Textarea id="message" error={formState.errors.message?.message} {...register("message")} />
      </div>
      <input type="text" tabIndex={-1} autoComplete="off" className="hidden" {...register("website")} />
      {status ? <Alert tone={status.tone}>{status.text}</Alert> : null}
      <Button type="submit" disabled={formState.isSubmitting}>
        <SendIcon size={18} /> Pošalji
      </Button>
    </form>
  );
}
