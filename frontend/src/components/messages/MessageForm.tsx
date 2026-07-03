"use client";

import { Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { apiFetch, type Conversation } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";

type MessageFormProps =
  | {
      mode: "new";
      listingId: string;
    }
  | {
      mode: "reply";
      conversationId: string;
    };

export function MessageForm(props: MessageFormProps) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = body.trim();
    if (!value) return;
    setPending(true);
    setMessage(null);
    try {
      const path =
        props.mode === "new"
          ? `/listings/${props.listingId}/messages`
          : `/conversations/${props.conversationId}/messages`;
      const response = await apiFetch<Conversation>(path, {
        method: "POST",
        body: JSON.stringify({ body: value })
      });
      setBody("");
      if (props.mode === "new") {
        router.push(`/nalog/poruke/${response.data.id}`);
      } else {
        router.refresh();
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Došlo je do greške.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <Textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder={props.mode === "new" ? "Napišite poruku prodavcu..." : "Napišite odgovor..."}
        maxLength={3000}
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-semibold text-slate-500">{body.length}/3000</p>
        <Button type="submit" disabled={pending || !body.trim()} className="sm:w-auto">
          <Send size={18} /> Pošalji
        </Button>
      </div>
      {message ? <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{message}</p> : null}
    </form>
  );
}
