import { AccountSecurityPanel } from "@/components/account/AccountSecurityPanel";
import type { AccountClosureStatus, AccountSession, DataExport } from "@/lib/api";
import { serverApiFetch } from "@/lib/server-api";

export const metadata = { title: "Bezbednost i privatnost | Sve Za Pecanje" };

export default async function AccountSecurityPage() {
  const [sessions, exports, closure] = await Promise.all([
    serverApiFetch<AccountSession[]>("/account/sessions"),
    serverApiFetch<DataExport[]>("/account/exports"),
    serverApiFetch<AccountClosureStatus>("/account/closure"),
  ]);

  return (
    <div>
      <h1 className="text-3xl font-extrabold">Bezbednost i privatnost</h1>
      <p className="mt-2 text-ink-600">
        Upravljajte prijavljenim uređajima, izvozom podataka i životnim ciklusom naloga.
      </p>
      <div className="mt-6">
        <AccountSecurityPanel
          initialSessions={sessions.data}
          initialExports={exports.data}
          initialClosure={closure.data}
        />
      </div>
    </div>
  );
}
