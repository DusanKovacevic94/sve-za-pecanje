"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Archive, CheckCircle2 } from "lucide-react";
import { z } from "zod";

import type { Brand, BuyerCandidate, Category, ListingDetail } from "@/lib/api";
import { apiFetch } from "@/lib/api";
import { trackEvent } from "@/lib/analytics";
import { conditionOptions } from "@/lib/format";
import { listingSchema } from "@/lib/validation";
import { Button } from "@/components/ui/Button";
import { FieldLabel, Input, Select, Textarea } from "@/components/ui/Field";
import { ListingImageManager } from "@/components/forms/ListingImageManager";

const listingFormSchema = listingSchema.passthrough();

type ListingFormInput = z.input<typeof listingFormSchema>;
type ListingFormOutput = z.output<typeof listingFormSchema>;
type ListingFormDefaults = Partial<ListingFormInput> & {
  attributes?: Record<string, string | number | boolean | string[]>;
};

type ListingFormProps = {
  categories: Category[];
  brands: Brand[];
  mode?: "create" | "edit";
  listingId?: string;
  defaultValues?: ListingFormDefaults;
  images?: ListingDetail["images"];
};

function conditionMatches(
  values: Record<string, unknown>,
  condition?: Record<string, string | string[]>
) {
  if (!condition) return true;
  return Object.entries(condition).every(([key, expected]) => {
    const actual = values[`attr_${key}`];
    const actualValues = Array.isArray(actual) ? actual : [actual];
    const allowed = Array.isArray(expected) ? expected : [expected];
    return actualValues.some((value) => typeof value === "string" && allowed.includes(value));
  });
}

function flattenCategories(categories: Category[]): Category[] {
  return categories.flatMap((category) => [
    category,
    ...flattenCategories(category.children)
  ]);
}

function getDefaultValues(categories: Category[], defaultValues?: ListingFormDefaults): ListingFormInput {
  const values: Record<string, unknown> = {
    currency: "RSD",
    condition: "used_good",
    allow_messages: true,
    phone_visible: false,
    category_id: defaultValues?.category_id ?? categories[0]?.id ?? "",
    ...defaultValues
  };
  Object.entries(defaultValues?.attributes ?? {}).forEach(([key, value]) => {
    values[`attr_${key}`] = Array.isArray(value) ? value : String(value);
  });
  delete values.attributes;
  return values as ListingFormInput;
}

function buildPayload(data: ListingFormOutput, category: Category | undefined, mode: "create" | "edit") {
  const attributes: Record<string, unknown> = {};
  category?.attributes.forEach((attribute) => {
    const value = data[`attr_${attribute.key}`];
    if (value !== undefined && value !== "" && !(Array.isArray(value) && value.length === 0)) {
      if (attribute.field_type === "integer") {
        attributes[attribute.key] = Number.parseInt(String(value), 10);
      } else if (attribute.field_type === "decimal") {
        attributes[attribute.key] = Number.parseFloat(String(value));
      } else if (attribute.field_type === "boolean") {
        attributes[attribute.key] = value === true || value === "true";
      } else if (attribute.field_type === "multi_enum") {
        attributes[attribute.key] = Array.isArray(value) ? value : [String(value)];
      } else {
        attributes[attribute.key] = value;
      }
    }
  });

  const payload: Record<string, unknown> = { ...data, attributes };
  Object.keys(payload).forEach((key) => {
    if (key.startsWith("attr_")) {
      delete payload[key];
    }
  });
  ["brand_id", "brand_name_custom", "model", "municipality"].forEach((key) => {
    if (payload[key] === "") {
      payload[key] = null;
    }
  });
  if (mode === "edit") {
    delete payload.category_id;
  }
  return payload;
}

export function CreateListingForm({
  categories,
  brands,
  mode = "create",
  listingId,
  defaultValues,
  images = []
}: ListingFormProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const isEdit = mode === "edit";
  const submitLabel = isEdit ? "Sačuvaj izmene" : "Pošalji na pregled";
  const initialValues = useMemo(() => getDefaultValues(categories, defaultValues), [categories, defaultValues]);
  const categoryOptions = useMemo(() => flattenCategories(categories), [categories]);
  const { register, handleSubmit, formState, watch } = useForm<ListingFormInput, unknown, ListingFormOutput>({
    resolver: zodResolver(listingFormSchema),
    defaultValues: initialValues,
    shouldUnregister: true
  });
  const categoryId = watch("category_id") || categories[0]?.id || "";
  const watchedValues = watch() as Record<string, unknown>;
  const selectedCategory = useMemo(
    () => categoryOptions.find((item) => item.id === categoryId),
    [categoryOptions, categoryId]
  );

  async function onSubmit(data: ListingFormOutput) {
    setMessage(null);
    const payload = buildPayload(data, selectedCategory, mode);
    try {
      const response = await apiFetch<ListingDetail>(isEdit ? `/listings/${listingId}` : "/listings", {
        method: isEdit ? "PATCH" : "POST",
        body: JSON.stringify(payload)
      });
      if (!isEdit) {
        trackEvent("listing_created", { listing_id: response.data.id });
      }
      router.push(`/oglasi/${response.data.slug}`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Došlo je do greške.");
    }
  }

  async function runOwnerAction(action: "archive" | "mark-sold") {
    if (!listingId) return;
    let soldToUserId: string | null | undefined = null;
    if (action === "mark-sold") {
      const candidates = (await apiFetch<BuyerCandidate[]>(`/listings/${listingId}/buyer-candidates`)).data;
      if (!candidates.length) {
        soldToUserId = window.confirm("Nema razgovora sa kupcima za ovaj oglas. Označiti kao prodato bez kupca?")
          ? null
          : undefined;
      } else {
        const options = candidates
          .map((candidate, index) => `${index + 1}. ${candidate.display_name ?? candidate.username}`)
          .join("\n");
        const selected = window.prompt(`Izaberite kupca unosom broja:\n${options}`);
        if (!selected) return;
        soldToUserId = candidates[Number(selected) - 1]?.id;
      }
    }
    if (soldToUserId === undefined) return;
    const confirmed = action === "archive" ? window.confirm("Arhivirati ovaj oglas?") : true;
    if (!confirmed) return;
    setActionMessage(null);
    try {
      const response = await apiFetch<ListingDetail>(`/listings/${listingId}/${action}`, {
        method: "POST",
        body: action === "mark-sold" ? JSON.stringify({ sold_to_user_id: soldToUserId }) : undefined
      });
      router.push(action === "archive" ? "/nalog/oglasi" : `/oglasi/${response.data.slug}`);
      router.refresh();
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Došlo je do greške.");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
        <h2 className="text-xl font-black">1. Kategorija</h2>
        <div className="mt-4">
          <FieldLabel htmlFor="category_id">Kategorija</FieldLabel>
          <Select
            id="category_id"
            {...register("category_id")}
            disabled={isEdit}
          >
            {categories.flatMap((category) => [
              <option value={category.id} key={category.id}>
                {category.name_sr}
              </option>,
              ...category.children.map((child) => (
                <option value={child.id} key={child.id}>
                  ↳ {child.name_sr}
                </option>
              ))
            ])}
          </Select>
          <p className="mt-1 text-sm text-red-600">{formState.errors.category_id?.message}</p>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
        <h2 className="text-xl font-black">2. Osnovni podaci</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <FieldLabel htmlFor="title">Naslov</FieldLabel>
            <Input id="title" {...register("title")} placeholder="Shimano Stradic FL 2500" />
            <p className="mt-1 text-sm text-red-600">{formState.errors.title?.message}</p>
          </div>
          <div className="md:col-span-2">
            <FieldLabel htmlFor="description">Opis</FieldLabel>
            <Textarea id="description" {...register("description")} />
            <p className="mt-1 text-sm text-red-600">{formState.errors.description?.message}</p>
          </div>
          <div>
            <FieldLabel htmlFor="brand_id">Brend</FieldLabel>
            <Select id="brand_id" {...register("brand_id")}>
              <option value="">Nije navedeno</option>
              {brands.map((brand) => (
                <option value={brand.id} key={brand.id}>
                  {brand.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <FieldLabel htmlFor="model">Model</FieldLabel>
            <Input id="model" {...register("model")} />
          </div>
          <div>
            <FieldLabel htmlFor="condition">Stanje</FieldLabel>
            <Select id="condition" {...register("condition")}>
              {conditionOptions.map(({ value, label }) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <FieldLabel htmlFor="city">Grad</FieldLabel>
            <Input id="city" {...register("city")} placeholder="Beograd" />
          </div>
          <div>
            <FieldLabel htmlFor="price_amount">Cena</FieldLabel>
            <Input id="price_amount" type="number" step="0.01" {...register("price_amount")} />
            <p className="mt-1 text-sm text-red-600">{formState.errors.price_amount?.message}</p>
          </div>
          <div>
            <FieldLabel htmlFor="currency">Valuta</FieldLabel>
            <Select id="currency" {...register("currency")}>
              <option value="RSD">RSD</option>
              <option value="EUR">EUR</option>
            </Select>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
        <h2 className="text-xl font-black">3. Specifični detalji</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {selectedCategory?.attributes.filter(
            (attribute) => conditionMatches(watchedValues, attribute.validation.visible_when)
          ).map((attribute) => {
            const conditionallyRequired = conditionMatches(
              watchedValues,
              attribute.validation.required_when
            );
            const required = attribute.required || (
              Boolean(attribute.validation.required_when) && conditionallyRequired
            );
            const requireInput = required && !isEdit;
            return (
            <div key={attribute.id}>
              <FieldLabel htmlFor={`attr_${attribute.key}`}>
                {attribute.label_sr}{attribute.unit ? ` (${attribute.unit})` : ""}{required ? " *" : ""}
              </FieldLabel>
              {attribute.field_type === "enum" ? (
                <Select id={`attr_${attribute.key}`} required={requireInput} {...register(`attr_${attribute.key}`)}>
                  <option value="">Izaberite</option>
                  {attribute.options.options?.map((option) => (
                    <option value={option.value} key={option.value}>
                      {option.label_sr}
                    </option>
                  ))}
                </Select>
              ) : attribute.field_type === "multi_enum" ? (
                <>
                  <Select
                    id={`attr_${attribute.key}`}
                    multiple
                    className="min-h-32"
                    required={requireInput}
                    {...register(`attr_${attribute.key}`)}
                  >
                    {attribute.options.options?.map((option) => (
                      <option value={option.value} key={option.value}>
                        {option.label_sr}
                      </option>
                    ))}
                  </Select>
                  <p className="mt-1 text-xs text-slate-500">Možete izabrati više stavki.</p>
                </>
              ) : attribute.field_type === "boolean" ? (
                <Select id={`attr_${attribute.key}`} required={requireInput} {...register(`attr_${attribute.key}`)}>
                  <option value="">Nije navedeno</option>
                  <option value="true">Da</option>
                  <option value="false">Ne</option>
                </Select>
              ) : (
                <Input
                  id={`attr_${attribute.key}`}
                  type={attribute.field_type === "integer" || attribute.field_type === "decimal" ? "number" : "text"}
                  min={attribute.validation.min}
                  max={attribute.validation.max}
                  step={attribute.validation.step ?? (attribute.field_type === "integer" ? 1 : undefined)}
                  required={requireInput}
                  {...register(`attr_${attribute.key}`)}
                />
              )}
            </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
        <h2 className="text-xl font-black">4. Pravila i kontakt</h2>
        <div className="mt-4 space-y-3">
          <label className="flex gap-3 text-sm">
            <input type="checkbox" {...register("allow_messages")} defaultChecked />
            Dozvoli poruke za ovaj oglas
          </label>
          <label className="flex gap-3 text-sm">
            <input type="checkbox" {...register("phone_visible")} />
            Prikaži broj telefona prijavljenim korisnicima
          </label>
          <p className="text-sm text-slate-600">
            Zabranjeni su nelegalna oprema, ukradena roba, falsifikati i sadržaj koji podstiče nezakonit ribolov.
          </p>
        </div>
      </section>
      {isEdit && listingId ? <ListingImageManager listingId={listingId} initialImages={images} /> : null}
      {message ? <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{message}</p> : null}
      <Button type="submit" disabled={formState.isSubmitting} className="w-full md:w-auto">
        {submitLabel}
      </Button>
      {isEdit ? (
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
          <h2 className="text-xl font-black">Akcije oglasa</h2>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Button type="button" variant="secondary" onClick={() => runOwnerAction("mark-sold")}>
              <CheckCircle2 size={18} /> Označi kao prodato
            </Button>
            <Button type="button" variant="danger" onClick={() => runOwnerAction("archive")}>
              <Archive size={18} /> Arhiviraj oglas
            </Button>
          </div>
          {actionMessage ? (
            <p className="mt-3 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{actionMessage}</p>
          ) : null}
        </section>
      ) : null}
    </form>
  );
}
