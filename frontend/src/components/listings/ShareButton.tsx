"use client";

import { useState } from "react";

import { ShareIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

export function ShareButton({ title }: { title: string }) {
  const [busy, setBusy] = useState(false);
  const { pushToast } = useToast();

  async function onShare() {
    setBusy(true);
    try {
      const url = window.location.href;
      if (navigator.share) {
        await navigator.share({ title, url });
        pushToast("Link je podeljen.", "success");
        return;
      }
      await navigator.clipboard.writeText(url);
      pushToast("Link je kopiran.", "success");
    } catch {
      pushToast("Deljenje nije uspelo.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button type="button" onClick={onShare} variant="ghost" disabled={busy}>
      <ShareIcon size={18} /> Podeli
    </Button>
  );
}
