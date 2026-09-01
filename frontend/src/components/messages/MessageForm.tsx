"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { SendIcon } from "@/components/icons";
import { ApiError, apiFetch, type Conversation } from "@/lib/api";
import { trackEvent } from "@/lib/analytics";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Textarea } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { TurnstileChallenge } from "@/components/forms/TurnstileChallenge";

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
  const [challengeRequired, setChallengeRequired] = useState(false);
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [challengeKey, setChallengeKey] = useState(0);
  const { pushToast } = useToast();

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
        body: JSON.stringify({
          body: value,
          turnstile_token: props.mode === "new" ? challengeToken : undefined
        })
      });
      trackEvent("message_sent", { mode: props.mode });
      setBody("");
      pushToast("Poruka je poslata.", "success");
      if (props.mode === "new") {
        router.push(`/nalog/poruke/${response.data.id}`);
      } else {
        router.refresh();
      }
    } catch (error) {
      if (
        error instanceof ApiError
        && ["challenge_required", "challenge_unavailable"].includes(error.code)
      ) {
        setChallengeRequired(true);
        setChallengeToken(null);
        setChallengeKey((value) => value + 1);
      }
      const errorMessage = error instanceof Error ? error.message : "Došlo je do greške.";
      setMessage(errorMessage);
      pushToast(errorMessage, "error");
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
        <Button type="submit" disabled={pending || !body.trim()} isLoading={pending} className="sm:w-auto">
          <SendIcon size={18} /> Pošalji
        </Button>
      </div>
      {challengeRequired ? (
        <TurnstileChallenge key={challengeKey} onToken={setChallengeToken} />
      ) : null}
      {message ? <Alert tone="error">{message}</Alert> : null}
    </form>
  );
}
