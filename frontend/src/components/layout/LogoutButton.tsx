"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/Button";

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onLogout() {
    setPending(true);
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch {
      // Cookie may already be invalid; continue to refresh either way.
    }
    router.push("/");
    router.refresh();
  }

  return (
    <Button onClick={onLogout} disabled={pending} variant="ghost" className="px-3" aria-label="Odjava">
      <LogOut size={18} /> <span className="hidden lg:inline">Odjava</span>
    </Button>
  );
}
