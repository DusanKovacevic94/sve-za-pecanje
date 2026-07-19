"use client";

import { CheckCircle2, Circle, Lightbulb } from "lucide-react";

import type { Category, ListingDetail } from "@/lib/api";

type ChecklistValues = Record<string, unknown>;
type ListingImage = ListingDetail["images"][number];

function hasValue(value: unknown) {
  return value !== undefined
    && value !== null
    && value !== ""
    && (!Array.isArray(value) || value.length > 0);
}

export function ListingQualityChecklist({
  values,
  category,
  images
}: {
  values: ChecklistValues;
  category?: Category;
  images: ListingImage[];
}) {
  const description = String(values.description ?? "").trim();
  const hasDeliveryInfo = /(dostav|slanj|šalj|salj|preuzim|ličn|licn)/i.test(description);
  const importantAttributes = (category?.attributes ?? []).filter(
    (attribute) => attribute.required || attribute.searchable
  );
  const completedImportant = importantAttributes.filter((attribute) =>
    hasValue(values[`attr_${attribute.key}`])
  ).length;
  const checks = [
    {
      done: images.some((image) => image.is_cover),
      label: "Naslovna fotografija",
      suggestion: "Dodajte jasnu naslovnu fotografiju opreme."
    },
    {
      done: images.length >= 3,
      label: "Najmanje tri fotografije",
      suggestion: "Prikažite opremu iz više uglova i eventualna oštećenja."
    },
    {
      done: Boolean(category && category.children.length === 0 && category.parent_id),
      label: "Precizna potkategorija",
      suggestion: "Izaberite najužu potkategoriju da bi kupci lakše pronašli oglas."
    },
    {
      done: hasValue(values.brand_id) && hasValue(values.model),
      label: "Brend i model",
      suggestion: "Navedite brend i model kada su poznati."
    },
    {
      done: description.length >= 100,
      label: "Koristan opis",
      suggestion: "Dodajte stanje, starost, tragove korišćenja i šta ulazi u cenu."
    },
    {
      done: String(values.city ?? "").trim().length >= 2,
      label: "Lokacija",
      suggestion: "Dodajte grad ili mesto preuzimanja."
    },
    {
      done: hasDeliveryInfo,
      label: "Način dostave",
      suggestion: "U opisu navedite da li šaljete paket ili nudite lično preuzimanje."
    },
    {
      done: importantAttributes.length === 0 || completedImportant === importantAttributes.length,
      label: "Važni detalji kategorije",
      suggestion: `Popunite važne karakteristike (${completedImportant}/${importantAttributes.length}).`
    }
  ];
  const completed = checks.filter((check) => check.done).length;

  return (
    <aside className="rounded-lg border border-river-100 bg-river-50 p-5">
      <div className="flex items-start gap-3">
        <Lightbulb className="mt-0.5 text-river-700" size={22} aria-hidden />
        <div>
          <h2 className="text-lg font-black">Kvalitet oglasa: {completed}/{checks.length}</h2>
          <p className="mt-1 text-sm text-river-900">
            Predlozi nisu uslov za objavu i trenutno ne utiču na redosled oglasa.
          </p>
        </div>
      </div>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {checks.map((check) => (
          <li key={check.label} className="flex items-start gap-2 text-sm">
            {check.done ? (
              <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-700" size={18} aria-hidden />
            ) : (
              <Circle className="mt-0.5 shrink-0 text-slate-400" size={18} aria-hidden />
            )}
            <span>
              <span className="font-bold">{check.label}</span>
              {!check.done ? <span className="mt-0.5 block text-slate-600">{check.suggestion}</span> : null}
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
