import {
  CalendarIcon,
  InfoIcon,
  RatingIcon,
  ShopBagIcon,
  VerifiedBadgeIcon,
  type IconComponent,
} from "@/components/icons";

import type { TrustSummary } from "@/lib/api";
import { formatMonthYear } from "@/lib/format";

type TrustVariant = "compact" | "full";

function verificationFact(trust: TrustSummary) {
  const channels = [
    trust.email_verified ? "email" : null,
    trust.phone_verified ? "telefon" : null,
  ].filter(Boolean);

  if (!channels.length) {
    return {
      key: "verification",
      Icon: InfoIcon,
      label: "Provera kontakta",
      value: "Kontakt nije potvrđen",
      positive: false,
    };
  }

  return {
    key: "verification",
    Icon: VerifiedBadgeIcon,
    label: "Provera kontakta",
    value: channels.length === 2 ? "Email i telefon potvrđeni" : `${channels[0]} potvrđen`,
    positive: true,
  };
}

export function TrustIndicators({
  trust,
  variant = "full",
  className,
}: {
  trust: TrustSummary;
  variant?: TrustVariant;
  className?: string;
}) {
  const verification = verificationFact(trust);
  const facts: {
    key: string;
    Icon: IconComponent;
    label: string;
    value: string;
    positive?: boolean;
  }[] = [
    verification,
    {
      key: "rating",
      Icon: RatingIcon,
      label: "Ocene",
      value: trust.review_count
        ? `${trust.rating_average?.toFixed(1) ?? "—"} od 5 · ${trust.review_count} ocena`
        : "Još nema ocena",
    },
    {
      key: "sales",
      Icon: ShopBagIcon,
      label: "Završene prodaje",
      value: `${trust.completed_sale_count} završenih prodaja`,
    },
    {
      key: "member",
      Icon: CalendarIcon,
      label: "Članstvo",
      value: `Član od ${formatMonthYear(trust.member_since)}`,
    },
  ];

  if (variant === "compact") {
    const compactFacts = [
      verification.positive ? verification : null,
      trust.review_count ? facts[1] : null,
      trust.completed_sale_count ? facts[2] : null,
    ].filter(Boolean).slice(0, 2) as typeof facts;

    if (!compactFacts.length) return null;

    return (
      <ul
        className={`flex shrink-0 items-center gap-1.5 ${className ?? ""}`}
        aria-label="Sažeti pokazatelji poverenja"
        data-trust-variant="compact"
      >
        {compactFacts.map(({ key, Icon, label, value }) => (
          <li
            key={key}
            className="inline-flex items-center gap-1 text-xs font-semibold text-ink-600"
            title={`${label}: ${value}`}
            data-trust-fact={key}
          >
            <Icon size={13} className="text-river-700" aria-hidden />
            {key === "verification" ? <span className="sr-only">{value}</span> : value.split(" ")[0]}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div
      className={className}
      aria-label="Činjenični pokazatelji poverenja"
      data-trust-variant="full"
    >
      <dl className="grid gap-2 sm:grid-cols-2">
        {facts.map(({ key, Icon, label, value, positive }) => (
          <div
            key={key}
            className="flex min-w-0 items-start gap-2.5 rounded-xl bg-sand-50 p-3"
            data-trust-fact={key}
          >
            <Icon
              size={18}
              className={`mt-0.5 shrink-0 ${positive === false ? "text-ink-500" : "text-river-700"}`}
              aria-hidden
            />
            <div className="min-w-0">
              <dt className="text-xs font-semibold text-ink-500">{label}</dt>
              <dd className="mt-0.5 text-sm font-bold text-ink-800">{value}</dd>
            </div>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-xs leading-5 text-ink-500">
        Pokazatelji su informativni i nisu garancija bezbedne transakcije.
      </p>
    </div>
  );
}
