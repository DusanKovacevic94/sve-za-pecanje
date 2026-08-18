"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import {
  BellIcon,
  BellMutedIcon,
  BlockUserIcon,
  ReportIcon,
  UndoIcon,
} from "@/components/icons";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";

const reportReasons = [
  ["spam", "Neželjene poruke"],
  ["harassment", "Uznemiravanje ili pretnje"],
  ["scam", "Sumnja na prevaru"],
  ["off_platform_payment", "Pritisak za uplatu van platforme"],
  ["inappropriate_content", "Neprimeren sadržaj"],
  ["other", "Drugo"],
] as const;

type SafetyControlsProps = {
  conversationId: string;
  initialMuted: boolean;
  conversationAvailable: boolean;
  blockedByViewer: boolean;
};

export function ConversationSafetyControls({
  conversationId,
  initialMuted,
  conversationAvailable,
  blockedByViewer,
}: SafetyControlsProps) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [muted, setMuted] = useState(initialMuted);
  const [pending, setPending] = useState<"mute" | "block" | "unblock" | null>(null);

  async function toggleMute() {
    setPending("mute");
    try {
      await apiFetch(`/conversations/${conversationId}/preferences`, {
        method: "PATCH",
        body: JSON.stringify({ muted: !muted }),
      });
      setMuted(!muted);
      pushToast(
        muted ? "Obaveštenja za razgovor su uključena." : "Razgovor je utišan.",
        "success"
      );
      router.refresh();
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Izmena nije sačuvana.", "error");
    } finally {
      setPending(null);
    }
  }

  async function block() {
    if (!window.confirm("Blokirati ovog korisnika? Više nećete moći da razmenjujete poruke.")) {
      return;
    }
    setPending("block");
    try {
      await apiFetch(`/conversations/${conversationId}/block`, { method: "POST" });
      pushToast("Korisnik je blokiran.", "success");
      router.refresh();
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Blokiranje nije uspelo.", "error");
    } finally {
      setPending(null);
    }
  }

  async function unblock() {
    setPending("unblock");
    try {
      await apiFetch(`/conversations/${conversationId}/block`, { method: "DELETE" });
      pushToast("Vaša blokada je uklonjena.", "success");
      router.refresh();
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Blokada nije uklonjena.", "error");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="secondary" onClick={toggleMute} disabled={pending !== null}>
        {muted ? <BellIcon size={18} /> : <BellMutedIcon size={18} />}
        {muted ? "Uključi obaveštenja" : "Utišaj razgovor"}
      </Button>
      {blockedByViewer ? (
        <Button type="button" variant="secondary" onClick={unblock} disabled={pending !== null}>
          <UndoIcon size={18} /> Ukloni moju blokadu
        </Button>
      ) : conversationAvailable ? (
        <Button type="button" variant="danger" onClick={block} disabled={pending !== null}>
          <BlockUserIcon size={18} /> Blokiraj korisnika
        </Button>
      ) : null}
      <SafetyReportButton conversationId={conversationId} />
    </div>
  );
}

export function SafetyReportButton({
  conversationId,
  messageId,
}: {
  conversationId: string;
  messageId?: string;
}) {
  const { pushToast } = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<(typeof reportReasons)[number][0]>("spam");
  const [explanation, setExplanation] = useState("");
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (reason === "other" && !explanation.trim()) return;
    setPending(true);
    try {
      await apiFetch(`/conversations/${conversationId}/reports`, {
        method: "POST",
        body: JSON.stringify({
          reason,
          explanation: explanation.trim() || null,
          message_id: messageId ?? null,
        }),
      });
      setSubmitted(true);
      setOpen(false);
      pushToast("Prijava je bezbedno poslata moderatorima.", "success");
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Prijava nije poslata.", "error");
    } finally {
      setPending(false);
    }
  }

  if (submitted) {
    return <span className="self-center text-xs font-bold text-slate-500">Prijavljeno</span>;
  }

  return (
    <div className={messageId ? "mt-2" : ""}>
      <Button
        type="button"
        variant="ghost"
        className={messageId ? "min-h-8 px-2 py-1 text-xs" : undefined}
        onClick={() => setOpen((value) => !value)}
      >
        <ReportIcon size={messageId ? 14 : 18} /> {messageId ? "Prijavi poruku" : "Prijavi razgovor"}
      </Button>
      {open ? (
        <form
          onSubmit={submit}
          className="mt-2 w-[min(28rem,80vw)] space-y-3 rounded-md border border-slate-200 bg-white p-3 text-left text-ink shadow-soft"
        >
          <label className="block text-sm font-bold">
            Razlog
            <select
              value={reason}
              onChange={(event) => setReason(event.target.value as typeof reason)}
              className="focus-ring mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-normal"
            >
              {reportReasons.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-bold">
            Dodatno objašnjenje {reason === "other" ? "(obavezno)" : "(opciono)"}
            <Textarea
              value={explanation}
              onChange={(event) => setExplanation(event.target.value)}
              maxLength={1500}
              className="mt-1"
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Otkaži</Button>
            <Button
              type="submit"
              disabled={pending || (reason === "other" && !explanation.trim())}
              isLoading={pending}
            >
              Pošalji prijavu
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
