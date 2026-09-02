import type { ReactNode } from "react";

import { BrandWaterline } from "@/components/brand/BrandWaterline";
import type { IconComponent } from "@/components/icons";
import {
  ActionRow,
  PageTitle,
  SectionHeading,
  SupportingCopy,
} from "@/components/ui/Primitives";

export function EditorialPage({ children }: { children: ReactNode }) {
  return <article className="mx-auto max-w-5xl px-4 py-10">{children}</article>;
}

export function EditorialIntro({
  eyebrow,
  title,
  summary,
  Icon,
  actions,
}: {
  eyebrow: string;
  title: string;
  summary: string;
  Icon?: IconComponent;
  actions?: ReactNode;
}) {
  return (
    <header className="relative isolate overflow-hidden rounded-2xl border border-river-100 bg-river-50 p-6 sm:p-8">
      <BrandWaterline
        className="pointer-events-none absolute -bottom-10 -right-32 -z-10 w-[34rem] text-reed-500 opacity-20"
        aria-hidden
      />
      {Icon ? (
        <div className="mb-5 grid h-11 w-11 place-items-center rounded-xl bg-white text-river-700 shadow-soft">
          <Icon size={24} aria-hidden />
        </div>
      ) : null}
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-river-700">{eyebrow}</p>
      <PageTitle className="mt-2 max-w-3xl">{title}</PageTitle>
      <SupportingCopy className="mt-4 max-w-3xl text-base sm:text-lg">{summary}</SupportingCopy>
      {actions ? <ActionRow className="mt-6">{actions}</ActionRow> : null}
    </header>
  );
}

export function EditorialFacts({
  facts,
}: {
  facts: Array<{ label: string; value: ReactNode }>;
}) {
  return (
    <dl className="mt-8 grid gap-4 border-y border-sand-200 py-5 sm:grid-cols-3">
      {facts.map((fact) => (
        <div key={fact.label} className="border-l-2 border-reed-400 pl-4">
          <dt className="text-xs font-bold uppercase tracking-[0.1em] text-ink-500">{fact.label}</dt>
          <dd className="mt-1 text-sm font-bold leading-6 text-ink-800">{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function EditorialSection({
  id,
  title,
  intro,
  Icon,
  children,
}: {
  id: string;
  title: string;
  intro?: string;
  Icon?: IconComponent;
  children: ReactNode;
}) {
  const headingId = `${id}-heading`;
  return (
    <section id={id} aria-labelledby={headingId} className="mt-10 scroll-mt-28">
      <div className="flex items-start gap-3">
        {Icon ? (
          <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-river-50 text-river-700">
            <Icon size={20} aria-hidden />
          </div>
        ) : null}
        <div className="min-w-0">
          <SectionHeading id={headingId}>{title}</SectionHeading>
          {intro ? <SupportingCopy className="mt-1 max-w-3xl">{intro}</SupportingCopy> : null}
        </div>
      </div>
      <div className="mt-5 max-w-3xl space-y-4 text-base leading-7 text-ink-700">
        {children}
      </div>
    </section>
  );
}

export function EditorialCallout({
  title,
  children,
  Icon,
  tone = "neutral",
}: {
  title: string;
  children: ReactNode;
  Icon?: IconComponent;
  tone?: "neutral" | "warning";
}) {
  return (
    <aside
      className={`mt-8 rounded-xl border p-5 ${
        tone === "warning"
          ? "border-amber-200 bg-amber-50 text-amber-950"
          : "border-river-100 bg-river-50 text-ink-800"
      }`}
    >
      <div className="flex items-start gap-3">
        {Icon ? <Icon size={21} className="mt-0.5 shrink-0" aria-hidden /> : null}
        <div>
          <h2 className="font-extrabold">{title}</h2>
          <div className="mt-1 text-sm leading-6">{children}</div>
        </div>
      </div>
    </aside>
  );
}

export function EditorialCta({
  title,
  copy,
  actions,
}: {
  title: string;
  copy: string;
  actions: ReactNode;
}) {
  return (
    <section className="mt-10 rounded-xl border border-river-700 bg-river-800 p-6 text-white sm:p-8">
      <h2 className="text-xl font-extrabold sm:text-2xl">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-river-50">{copy}</p>
      <ActionRow className="mt-5">{actions}</ActionRow>
    </section>
  );
}
