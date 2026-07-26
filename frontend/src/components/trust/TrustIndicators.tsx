import {
  CalendarDays,
  MailCheck,
  PhoneCall,
  ShoppingBag,
  Star,
} from "lucide-react";

import type { TrustSummary } from "@/lib/api";
import { formatMonthYear } from "@/lib/format";

export function TrustIndicators({
  trust,
  compact = false,
}: {
  trust: TrustSummary;
  compact?: boolean;
}) {
  const indicators = [
    trust.email_verified
      ? { key: "email", Icon: MailCheck, text: "Email potvrđen" }
      : null,
    trust.phone_verified
      ? { key: "phone", Icon: PhoneCall, text: "Telefon potvrđen" }
      : null,
    {
      key: "member",
      Icon: CalendarDays,
      text: `Član od ${formatMonthYear(trust.member_since)}`,
    },
    {
      key: "reviews",
      Icon: Star,
      text: trust.review_count
        ? `${trust.rating_average?.toFixed(1) ?? "—"} · ${trust.review_count} ocena`
        : "Još nema ocena",
    },
    {
      key: "sales",
      Icon: ShoppingBag,
      text: `${trust.completed_sale_count} završenih prodaja`,
    },
  ].filter(Boolean) as {
    key: string;
    Icon: typeof MailCheck;
    text: string;
  }[];

  return (
    <div
      className={compact ? "mt-2" : "mt-4"}
      aria-label="Činjenični pokazatelji poverenja"
    >
      <ul className="flex flex-wrap gap-2">
        {indicators.map(({ key, Icon, text }) => (
          <li
            key={key}
            className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700"
          >
            <Icon size={14} className="text-river-700" aria-hidden />
            {text}
          </li>
        ))}
      </ul>
      {!compact ? (
        <p className="mt-2 text-xs text-slate-500">
          Pokazatelji su informativni i nisu garancija bezbedne transakcije.
        </p>
      ) : null}
    </div>
  );
}
