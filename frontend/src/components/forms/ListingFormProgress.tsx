"use client";

import { AlertIcon, PendingCircleIcon, SuccessIcon } from "@/components/icons";

export type ListingFormSection = {
  id: string;
  label: string;
  complete: boolean;
  hasError: boolean;
};

export function ListingFormProgress({
  sections,
  currentSection,
  onNavigate
}: {
  sections: ListingFormSection[];
  currentSection: string;
  onNavigate: (sectionId: string) => void;
}) {
  const completed = sections.filter((section) => section.complete).length;
  const remaining = sections.length - completed;

  return (
    <nav
      aria-label="Koraci za postavljanje oglasa"
      className="rounded-xl border border-river-100 bg-white p-4 shadow-soft"
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-base font-extrabold text-ink">Napredak oglasa</h2>
          <p className="mt-0.5 text-sm text-ink-600">
            {remaining === 0
              ? "Svi koraci su popunjeni."
              : `${completed}/${sections.length} koraka popunjeno · preostalo ${remaining}`}
          </p>
        </div>
        <span className="text-sm font-bold text-river-800">{Math.round((completed / sections.length) * 100)}%</span>
      </div>
      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-sand-200"
        role="progressbar"
        aria-label="Popunjenost oglasa"
        aria-valuemin={0}
        aria-valuemax={sections.length}
        aria-valuenow={completed}
      >
        <div
          className="h-full rounded-full bg-river-700 motion-safe:transition-[width]"
          style={{ width: `${(completed / sections.length) * 100}%` }}
        />
      </div>
      <ol className="mt-4 flex snap-x gap-2 overflow-x-auto pb-1">
        {sections.map((section, index) => {
          const active = section.id === currentSection;
          return (
            <li key={section.id} className="shrink-0 snap-start">
              <button
                type="button"
                aria-current={active ? "step" : undefined}
                onClick={() => onNavigate(section.id)}
                className={`focus-ring flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm font-bold motion-safe:transition-colors ${
                  active
                    ? "border-river-700 bg-river-50 text-river-900"
                    : "border-sand-200 bg-white text-ink-700 hover:border-river-300"
                }`}
              >
                {section.hasError ? (
                  <AlertIcon className="shrink-0 text-red-700" size={18} />
                ) : section.complete ? (
                  <SuccessIcon className="shrink-0 text-river-700" size={18} />
                ) : (
                  <PendingCircleIcon className="shrink-0 text-ink-400" size={18} />
                )}
                <span>{index + 1}. {section.label}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
