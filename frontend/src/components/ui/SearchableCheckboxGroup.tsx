"use client";

import type { ChangeEvent } from "react";
import { useMemo, useState } from "react";

import { SearchIcon } from "@/components/icons";

type CheckboxOption = {
  value: string;
  label: string;
};

export function SearchableCheckboxGroup({
  id,
  label,
  name,
  options,
  defaultValues = [],
  searchPlaceholder = "Pretraži opcije",
  onChange
}: {
  id: string;
  label: string;
  name: string;
  options: CheckboxOption[];
  defaultValues?: string[];
  searchPlaceholder?: string;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase("sr-Latn");
  const visibleOptions = useMemo(
    () => options.filter((option) =>
      option.label.toLocaleLowerCase("sr-Latn").includes(normalizedQuery)
    ),
    [normalizedQuery, options]
  );
  const visibleValues = new Set(visibleOptions.map((option) => option.value));
  const labelId = `${id}-label`;

  return (
    <div className="min-w-0">
      <p id={labelId} className="text-sm font-bold text-ink-800">{label}</p>
      <div className="mt-1 overflow-hidden rounded-xl border border-sand-300 bg-white">
        <label className="relative block border-b border-sand-200">
          <span className="sr-only">{searchPlaceholder}</span>
          <SearchIcon
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={17}
          />
          <input
            id={`${id}-search`}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder={searchPlaceholder}
            className="focus-ring min-h-11 w-full min-w-0 border-0 bg-white py-2 pl-10 pr-3 text-sm"
          />
        </label>
        <div
          role="group"
          aria-labelledby={labelId}
          className="max-h-56 space-y-1 overflow-y-auto overscroll-contain p-2"
        >
          {!visibleOptions.length ? (
            <p className="px-2 py-3 text-sm text-slate-500">Nema odgovarajućih opcija.</p>
          ) : null}
          {options.map((option) => (
            <label
              key={option.value}
              hidden={!visibleValues.has(option.value)}
              className="flex min-h-10 cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 text-sm text-slate-700 hover:bg-river-50"
            >
              <input
                type="checkbox"
                name={name}
                value={option.value}
                defaultChecked={defaultValues.includes(option.value)}
                onChange={onChange}
              />
              <span className="min-w-0 break-words">{option.label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
