"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  BlockUserIcon,
  CheckIcon,
  CloseIcon,
  FileRemoveIcon,
  ReactivateUserIcon,
} from "@/components/icons";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { FieldLabel, Select } from "@/components/ui/Field";

const rejectionReasons = [
  ["prohibited_item", "Zabranjen predmet"],
  ["duplicate", "Dupliran oglas"],
  ["scam", "Sumnja na prevaru"],
  ["poor_quality", "Loš kvalitet oglasa"],
  ["other", "Drugo"]
];

export function AdminReportActions({
  reportId,
  listingId,
  reportedUserId,
  reportedUserStatus
}: {
  reportId: string;
  listingId: string | null;
  reportedUserId: string | null;
  reportedUserStatus?: string | null;
}) {
  const router = useRouter();
  const [reasonCode, setReasonCode] = useState("prohibited_item");
  const [message, setMessage] = useState<string | null>(null);

  async function runAction(action: () => Promise<void>) {
    setMessage(null);
    try {
      await action();
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Akcija nije izvršena.");
    }
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            runAction(async () => {
              await apiFetch(`/admin/reports/${reportId}/resolve`, {
                method: "POST",
                body: JSON.stringify({ status: "resolved" })
              });
            })
          }
        >
          <CheckIcon size={18} /> Reši
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            runAction(async () => {
              await apiFetch(`/admin/reports/${reportId}/resolve`, {
                method: "POST",
                body: JSON.stringify({ status: "dismissed" })
              });
            })
          }
        >
          <CloseIcon size={18} /> Odbaci
        </Button>
        {reportedUserId ? (
          <Button
            type="button"
            variant={reportedUserStatus === "suspended" ? "secondary" : "danger"}
            onClick={() =>
              runAction(async () => {
                if (reportedUserStatus === "suspended") {
                  await apiFetch(`/admin/users/${reportedUserId}/unsuspend`, { method: "POST" });
                  return;
                }
                const reason = window.prompt("Razlog suspenzije", "Kršenje pravila platforme");
                if (!reason) return;
                await apiFetch(`/admin/users/${reportedUserId}/suspend`, {
                  method: "POST",
                  body: JSON.stringify({ reason })
                });
              })
            }
          >
            {reportedUserStatus === "suspended" ? <ReactivateUserIcon size={18} /> : <BlockUserIcon size={18} />}
            {reportedUserStatus === "suspended" ? "Reaktiviraj" : "Suspenduj"}
          </Button>
        ) : null}
      </div>

      {listingId ? (
        <div className="grid gap-2 sm:grid-cols-[220px_auto]">
          <div>
            <FieldLabel htmlFor={`reject-${reportId}`}>Razlog skidanja oglasa</FieldLabel>
            <Select id={`reject-${reportId}`} value={reasonCode} onChange={(event) => setReasonCode(event.target.value)}>
              {rejectionReasons.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          <Button
            type="button"
            variant="danger"
            className="self-end"
            onClick={() =>
              runAction(async () => {
                await apiFetch(`/admin/listings/${listingId}/reject`, {
                  method: "POST",
                  body: JSON.stringify({ reason_code: reasonCode, reason: "Akcija iz prijave korisnika" })
                });
                await apiFetch(`/admin/reports/${reportId}/resolve`, {
                  method: "POST",
                  body: JSON.stringify({ status: "resolved", resolution_note: "Oglas je skinut nakon prijave." })
                });
              })
            }
          >
            <FileRemoveIcon size={18} /> Skini oglas
          </Button>
        </div>
      ) : null}
      {message ? <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{message}</p> : null}
    </div>
  );
}
