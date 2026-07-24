"use client";

import { useRouter } from "next/navigation";
import {
  type ChangeEvent,
  type FocusEvent,
  type KeyboardEvent,
  useEffect,
  useId,
  useRef,
  useState
} from "react";

import { apiFetch, type SearchSuggestion } from "@/lib/api";
import { sendMarketplaceAnalytics } from "@/lib/marketplace-analytics";

const typeLabels: Record<SearchSuggestion["type"], string> = {
  category: "Kategorija",
  brand: "Brend",
  common_query: "Pretraga",
  listing: "Oglas"
};

export function SearchCombobox({
  id,
  defaultValue = "",
  placeholder = "Shimano, štap, varalice...",
  className = ""
}: {
  id: string;
  defaultValue?: string;
  placeholder?: string;
  className?: string;
}) {
  const router = useRouter();
  const generatedId = useId().replaceAll(":", "");
  const listboxId = `${id}-${generatedId}-suggestions`;
  const [value, setValue] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [focused, setFocused] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const requestSequence = useRef(0);

  useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);

  useEffect(() => {
    const sequence = ++requestSequence.current;
    const normalized = value.trim();
    if (normalized.length < 2) {
      setSuggestions([]);
      setActiveIndex(-1);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await apiFetch<SearchSuggestion[]>(
          `/search/suggestions?q=${encodeURIComponent(normalized)}&limit=10`,
          { signal: controller.signal }
        );
        if (sequence !== requestSequence.current) return;
        setSuggestions(response.data);
        setActiveIndex(-1);
        const message = response.data.length
          ? `${response.data.length} predloga je dostupno. Koristite strelice za izbor.`
          : "Nema predloga. Možete pretražiti uneti izraz.";
        setAnnouncement(message);
        if (response.data.length) {
          sendMarketplaceAnalytics("suggestion_impression", {
            query_length: normalized.length,
            suggestion_types: [...new Set(response.data.map((item) => item.type))],
            suggestion_count: response.data.length
          });
        }
      } catch {
        if (controller.signal.aborted) return;
        if (sequence !== requestSequence.current) return;
        setSuggestions([]);
        setActiveIndex(-1);
        setAnnouncement("Predlozi trenutno nisu dostupni. Pretraga i dalje radi.");
      }
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [value]);

  function choose(suggestion: SearchSuggestion, position: number) {
    sendMarketplaceAnalytics("suggestion_selected", {
      query_length: value.trim().length,
      suggestion_type: suggestion.type,
      position
    });
    setValue(suggestion.value);
    setSuggestions([]);
    setActiveIndex(-1);
    router.push(suggestion.href);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setSuggestions([]);
      setActiveIndex(-1);
      setAnnouncement("Predlozi su zatvoreni.");
      return;
    }
    if (!suggestions.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      const next = activeIndex >= suggestions.length - 1 ? 0 : activeIndex + 1;
      setActiveIndex(next);
      setAnnouncement(
        `${suggestions[next].display}, ${typeLabels[suggestions[next].type]}, ${next + 1} od ${suggestions.length}`
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      const next = activeIndex <= 0 ? suggestions.length - 1 : activeIndex - 1;
      setActiveIndex(next);
      setAnnouncement(
        `${suggestions[next].display}, ${typeLabels[suggestions[next].type]}, ${next + 1} od ${suggestions.length}`
      );
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      choose(suggestions[activeIndex], activeIndex);
    }
  }

  function onChange(event: ChangeEvent<HTMLInputElement>) {
    setValue(event.target.value);
  }

  function onBlur(event: FocusEvent<HTMLInputElement>) {
    const next = event.relatedTarget as Node | null;
    if (next && document.getElementById(listboxId)?.contains(next)) return;
    window.setTimeout(() => setFocused(false), 100);
  }

  const open = focused && suggestions.length > 0;
  return (
    <div className="relative min-w-0 flex-1">
      <input
        id={id}
        name="q"
        type="search"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={
          activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
        }
        autoComplete="off"
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={onBlur}
        placeholder={placeholder}
        className={className}
      />
      {open ? (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 z-40 mt-1 max-h-80 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 text-ink shadow-lift"
        >
          {suggestions.map((suggestion, index) => (
            <li
              id={`${listboxId}-option-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              key={suggestion.id}
            >
              <button
                type="button"
                className={`focus-ring flex w-full items-start justify-between gap-3 rounded-md px-3 py-2 text-left ${
                  index === activeIndex ? "bg-river-50 text-river-800" : "hover:bg-slate-50"
                }`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(suggestion, index)}
              >
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{suggestion.display}</span>
                  {suggestion.description ? (
                    <span className="block truncate text-xs text-slate-500">
                      {suggestion.description}
                    </span>
                  ) : null}
                </span>
                <span className="shrink-0 rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                  {typeLabels[suggestion.type]}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </span>
    </div>
  );
}
