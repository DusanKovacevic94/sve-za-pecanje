"use client";

import type { ChangeEvent } from "react";

import type { Brand, Category, City } from "@/lib/api";
import {
  conditionOptions,
  deliveryMethodOptions,
  priceTypeOptions
} from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { FieldLabel, Input, Select } from "@/components/ui/Field";

type SearchParams = Record<string, string | string[] | undefined>;

function findCategory(categories: Category[], slug: string): Category | undefined {
  for (const category of categories) {
    if (category.slug === slug) return category;
    const child = findCategory(category.children, slug);
    if (child) return child;
  }
}

function rootCategory(categories: Category[], category: Category) {
  return categories.find(
    (root) => root.id === category.id || root.children.some((child) => child.id === category.id)
  );
}

function selectedValues(value: SearchParams[string]) {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
}

function conditionMatches(searchParams: SearchParams, condition?: Record<string, string | string[]>) {
  if (!condition) return true;
  return Object.entries(condition).every(([key, expected]) => {
    const actual = selectedValues(searchParams[`attributes[${key}]`]);
    const allowed = Array.isArray(expected) ? expected : [expected];
    return actual.some((value) => allowed.includes(value));
  });
}

function conditionalData(condition?: Record<string, string | string[]>) {
  if (!condition) return {};
  const [key, expected] = Object.entries(condition)[0];
  return {
    "data-conditional-key": key,
    "data-conditional-values": (Array.isArray(expected) ? expected : [expected]).join(",")
  };
}

function clearCategoryAttributes(event: ChangeEvent<HTMLInputElement>) {
  const form = event.currentTarget.form;
  form?.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[name^="attributes["]')
    .forEach((control) => {
      control.disabled = true;
    });
}

function updateCategoryChoice(event: ChangeEvent<HTMLInputElement>) {
  const input = event.currentTarget;
  const form = input.form;
  const root = input.dataset.categoryRoot;
  if (input.checked && form && root) {
    const choices = form.querySelectorAll<HTMLInputElement>(
      `input[name="category"][data-category-root="${root}"]`
    );
    choices.forEach((choice) => {
      if (choice === input) return;
      if (
        input.dataset.categoryLevel === "parent"
        || choice.dataset.categoryLevel === "parent"
      ) {
        choice.checked = false;
      }
    });
  }
  clearCategoryAttributes(event);
}

function choiceSummary(
  selected: string[],
  labels: Map<string, string>,
  emptyLabel: string
) {
  if (!selected.length) return emptyLabel;
  if (selected.length === 1) return labels.get(selected[0]) ?? selected[0];
  return `${labels.get(selected[0]) ?? selected[0]} + još ${selected.length - 1}`;
}

function updateConditionalControls(event: ChangeEvent<HTMLSelectElement>) {
  const key = event.currentTarget.name.match(/^attributes\[([^\]]+)\]$/)?.[1];
  const form = event.currentTarget.form;
  if (!key || !form) return;
  form.querySelectorAll<HTMLElement>("[data-conditional-key]").forEach((container) => {
    if (container.dataset.conditionalKey !== key) return;
    const allowed = (container.dataset.conditionalValues ?? "").split(",");
    const selected = Array.from(event.currentTarget.selectedOptions, (option) => option.value);
    const visible = selected.some((value) => allowed.includes(value));
    container.hidden = !visible;
    container.querySelectorAll<HTMLInputElement | HTMLSelectElement>("input, select")
      .forEach((control) => {
        control.disabled = !visible;
      });
  });
}

export function FilterSidebar({
  categories,
  brands,
  cities,
  searchParams
}: {
  categories: Category[];
  brands: Brand[];
  cities: City[];
  searchParams: SearchParams;
}) {
  const selectedCategorySlugs = selectedValues(searchParams.category);
  const selectedBrandIds = selectedValues(searchParams.brand_id);
  const selectedPriceTypes = selectedValues(searchParams.price_type);
  const selectedDeliveryMethods = selectedValues(searchParams.delivery_method);
  const sort = typeof searchParams.sort === "string" ? searchParams.sort : "";
  const selectedCategories = selectedCategorySlugs
    .map((slug) => findCategory(categories, slug))
    .filter((item): item is Category => Boolean(item));
  const selectedRoots = new Set(
    selectedCategories
      .map((item) => rootCategory(categories, item)?.id)
      .filter(Boolean)
  );
  const selectedCategory = selectedCategories.length === 1
    ? selectedCategories[0]
    : selectedRoots.size === 1
      ? categories.find((item) => selectedRoots.has(item.id))
      : undefined;
  const categoryLabels = new Map(
    categories.flatMap((item) => [
      [item.slug, item.name_sr] as const,
      ...item.children.map((child) => [child.slug, child.name_sr] as const)
    ])
  );
  const brandLabels = new Map(brands.map((brand) => [brand.id, brand.name]));
  return (
    <form action="/oglasi" className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-soft">
      {sort ? <input type="hidden" name="sort" value={sort} /> : null}
      <div>
        <FieldLabel htmlFor="q">Pretraga</FieldLabel>
        <Input id="q" name="q" defaultValue={typeof searchParams.q === "string" ? searchParams.q : ""} placeholder="Shimano, štap, varalice..." />
      </div>
      <fieldset>
        <legend className="text-sm font-semibold text-slate-800">Kategorije</legend>
        <details id="category-filter-options" className="group mt-1 rounded-lg border border-slate-200 bg-white">
          <summary className="focus-ring flex min-h-11 cursor-pointer list-none items-center justify-between px-3 py-2 text-sm">
            <span className="truncate">
              {choiceSummary(selectedCategorySlugs, categoryLabels, "Sve kategorije")}
            </span>
            <span aria-hidden className="ml-2 text-slate-400 transition group-open:rotate-180">⌄</span>
          </summary>
          <div className="max-h-80 space-y-3 overflow-y-auto border-t border-slate-100 p-3">
            {categories.map((item) => (
              <div key={item.id}>
                <label className="flex cursor-pointer items-center gap-2 font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    name="category"
                    value={item.slug}
                    data-category-root={item.id}
                    data-category-level="parent"
                    defaultChecked={selectedCategorySlugs.includes(item.slug)}
                    onChange={updateCategoryChoice}
                  />
                  {item.name_sr}
                </label>
                {item.children.length ? (
                  <div className="mt-2 space-y-2 border-l border-slate-200 pl-5">
                    {item.children.map((child) => (
                      <label key={child.id} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          name="category"
                          value={child.slug}
                          data-category-root={item.id}
                          data-category-level="child"
                          defaultChecked={selectedCategorySlugs.includes(child.slug)}
                          onChange={updateCategoryChoice}
                        />
                        {child.name_sr}
                      </label>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </details>
        <p className="mt-1 text-xs text-slate-500">Možete izabrati više kategorija.</p>
      </fieldset>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel htmlFor="price_min">Cena od</FieldLabel>
          <Input id="price_min" name="price_min" inputMode="numeric" defaultValue={typeof searchParams.price_min === "string" ? searchParams.price_min : ""} />
        </div>
        <div>
          <FieldLabel htmlFor="price_max">Cena do</FieldLabel>
          <Input id="price_max" name="price_max" inputMode="numeric" defaultValue={typeof searchParams.price_max === "string" ? searchParams.price_max : ""} />
        </div>
      </div>
      <div>
        <FieldLabel htmlFor="currency">Valuta</FieldLabel>
        <Select id="currency" name="currency" defaultValue={typeof searchParams.currency === "string" ? searchParams.currency : ""}>
          <option value="">Sve</option>
          <option value="RSD">RSD</option>
          <option value="EUR">EUR</option>
        </Select>
      </div>
      <fieldset>
        <legend className="text-sm font-semibold text-slate-800">Tip cene</legend>
        <div className="mt-2 grid gap-2">
          {priceTypeOptions.map(({ value, label }) => (
            <label key={value} className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                name="price_type"
                value={value}
                defaultChecked={selectedPriceTypes.includes(value)}
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="text-sm font-semibold text-slate-800">Preuzimanje i dostava</legend>
        <div className="mt-2 grid gap-2">
          {deliveryMethodOptions.map(({ value, label }) => (
            <label key={value} className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                name="delivery_method"
                value={value}
                defaultChecked={selectedDeliveryMethods.includes(value)}
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="text-sm font-semibold text-slate-800">Brendovi</legend>
        <details id="brand-filter-options" className="group mt-1 rounded-lg border border-slate-200 bg-white">
          <summary className="focus-ring flex min-h-11 cursor-pointer list-none items-center justify-between px-3 py-2 text-sm">
            <span className="truncate">
              {choiceSummary(selectedBrandIds, brandLabels, "Svi brendovi")}
            </span>
            <span aria-hidden className="ml-2 text-slate-400 transition group-open:rotate-180">⌄</span>
          </summary>
          <div className="max-h-64 space-y-2 overflow-y-auto border-t border-slate-100 p-3">
            {brands.map((brand) => (
              <label key={brand.id} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  name="brand_id"
                  value={brand.id}
                  defaultChecked={selectedBrandIds.includes(brand.id)}
                />
                {brand.name}
              </label>
            ))}
          </div>
        </details>
        <p className="mt-1 text-xs text-slate-500">Izabrani brendovi se kombinuju.</p>
      </fieldset>
      <div>
        <FieldLabel htmlFor="city">Grad</FieldLabel>
        <Select id="city" name="city" defaultValue={typeof searchParams.city === "string" ? searchParams.city : ""}>
          <option value="">Svi gradovi</option>
          {cities.map((city) => (
            <option value={city.name} key={city.id}>{city.name}</option>
          ))}
        </Select>
      </div>
      <div>
        <FieldLabel htmlFor="condition">Stanje</FieldLabel>
        <Select id="condition" name="condition" defaultValue={typeof searchParams.condition === "string" ? searchParams.condition : ""}>
          <option value="">Sva stanja</option>
          {conditionOptions.map(({ value, label }) => (
            <option value={value} key={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <FieldLabel htmlFor="seller_type">Prodavac</FieldLabel>
        <Select id="seller_type" name="seller_type" defaultValue={typeof searchParams.seller_type === "string" ? searchParams.seller_type : ""}>
          <option value="">Svi prodavci</option>
          <option value="private">Privatni prodavac</option>
          <option value="shop">Prodavnica</option>
        </Select>
      </div>
      <div>
        <FieldLabel htmlFor="posted_within">Objavljeno</FieldLabel>
        <Select id="posted_within" name="posted_within" defaultValue={typeof searchParams.posted_within === "string" ? searchParams.posted_within : ""}>
          <option value="">Bilo kada</option>
          <option value="24h">U poslednja 24 sata</option>
          <option value="7d">U poslednjih 7 dana</option>
          <option value="30d">U poslednjih 30 dana</option>
        </Select>
      </div>
      <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <input
          type="checkbox"
          name="with_images"
          value="true"
          defaultChecked={searchParams.with_images === "true"}
        />
        Samo oglasi sa slikom
      </label>
      {selectedCategory?.attributes.some((attribute) => attribute.filterable) ? (
        <fieldset className="space-y-4 border-t border-slate-200 pt-4">
          <legend className="text-base font-black">Detalji: {selectedCategory.name_sr}</legend>
          {selectedCategory.attributes.filter(
            (attribute) => attribute.filterable && conditionMatches(searchParams, attribute.validation.visible_when)
          ).map((attribute) => {
            const name = `attributes[${attribute.key}]`;
            const filterMode = attribute.validation.filter_mode;
            if (filterMode === "range") {
              return (
                <div key={attribute.id} {...conditionalData(attribute.validation.visible_when)}>
                  <FieldLabel htmlFor={`attributes[${attribute.key}][min]`}>
                    {attribute.label_sr}{attribute.unit ? ` (${attribute.unit})` : ""}
                  </FieldLabel>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      aria-label={`${attribute.label_sr} od`}
                      name={`attributes[${attribute.key}][min]`}
                      type="number"
                      placeholder="Od"
                      min={attribute.validation.min}
                      max={attribute.validation.max}
                      step={attribute.validation.step ?? 1}
                      defaultValue={typeof searchParams[`attributes[${attribute.key}][min]`] === "string" ? searchParams[`attributes[${attribute.key}][min]`] : ""}
                    />
                    <Input
                      aria-label={`${attribute.label_sr} do`}
                      name={`attributes[${attribute.key}][max]`}
                      type="number"
                      placeholder="Do"
                      min={attribute.validation.min}
                      max={attribute.validation.max}
                      step={attribute.validation.step ?? 1}
                      defaultValue={typeof searchParams[`attributes[${attribute.key}][max]`] === "string" ? searchParams[`attributes[${attribute.key}][max]`] : ""}
                    />
                  </div>
                </div>
              );
            }
            if (attribute.field_type === "boolean" || filterMode === "boolean") {
              return (
                <div key={attribute.id} {...conditionalData(attribute.validation.visible_when)}>
                  <FieldLabel htmlFor={name}>{attribute.label_sr}</FieldLabel>
                  <Select
                    id={name}
                    name={name}
                    defaultValue={typeof searchParams[name] === "string" ? searchParams[name] : ""}
                    onChange={updateConditionalControls}
                  >
                    <option value="">Sve</option>
                    <option value="true">Da</option>
                    <option value="false">Ne</option>
                  </Select>
                </div>
              );
            }
            if (attribute.options.options?.length) {
              return (
                <div key={attribute.id} {...conditionalData(attribute.validation.visible_when)}>
                  <FieldLabel htmlFor={name}>{attribute.label_sr}</FieldLabel>
                  <Select
                    id={name}
                    name={name}
                    multiple
                    className="min-h-28"
                    defaultValue={selectedValues(searchParams[name])}
                    onChange={updateConditionalControls}
                  >
                    {attribute.options.options.map((option) => (
                      <option value={option.value} key={option.value}>{option.label_sr}</option>
                    ))}
                  </Select>
                  <p className="mt-1 text-xs text-slate-500">Možete izabrati više stavki.</p>
                </div>
              );
            }
            return (
              <div key={attribute.id} {...conditionalData(attribute.validation.visible_when)}>
                <FieldLabel htmlFor={name}>{attribute.label_sr}{attribute.unit ? ` (${attribute.unit})` : ""}</FieldLabel>
                <Input
                  id={name}
                  name={name}
                  defaultValue={typeof searchParams[name] === "string" ? searchParams[name] : ""}
                />
              </div>
            );
          })}
        </fieldset>
      ) : selectedCategorySlugs.length ? (
        <p className="rounded-md bg-slate-50 p-3 text-sm text-slate-600">
          {selectedRoots.size > 1
            ? "Specifični filteri su dostupni kada izabrane kategorije pripadaju istoj glavnoj kategoriji."
            : "Za ovu kategoriju još nema posebnih filtera."}
        </p>
      ) : (
        <p className="rounded-md bg-river-50 p-3 text-sm text-river-800">
          Izaberite kategoriju da biste videli specifične filtere.
        </p>
      )}
      <div className="grid gap-2">
        <Button type="submit" className="w-full">Primeni filtere</Button>
        <Button href="/oglasi" variant="ghost" className="w-full">Poništi sve</Button>
      </div>
    </form>
  );
}
