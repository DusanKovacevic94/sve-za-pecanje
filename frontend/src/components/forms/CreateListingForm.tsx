"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import type { Brand, Category } from "@/lib/api";
import { publicApiUrl } from "@/lib/api";
import { listingSchema } from "@/lib/validation";
import { Button } from "@/components/ui/Button";
import { FieldLabel, Input, Select, Textarea } from "@/components/ui/Field";

type FormData = Record<string, unknown>;

export function CreateListingForm({ categories, brands }: { categories: Category[]; brands: Brand[] }) {
  const router = useRouter();
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const selectedCategory = useMemo(() => categories.find((item) => item.id === categoryId), [categories, categoryId]);
  const { register, handleSubmit, formState } = useForm<FormData>({
    resolver: zodResolver(listingSchema) as never,
    defaultValues: { currency: "RSD", condition: "used_good", allow_messages: true, phone_visible: false, category_id: categoryId }
  });

  async function onSubmit(data: FormData) {
    const attributes: Record<string, unknown> = {};
    selectedCategory?.attributes.forEach((attribute) => {
      const value = data[`attr_${attribute.key}`];
      if (value !== undefined && value !== "") attributes[attribute.key] = value;
    });
    const payload = { ...data, category_id: categoryId, attributes };
    Object.keys(payload).forEach((key) => {
      if (key.startsWith("attr_")) delete (payload as Record<string, unknown>)[key];
    });
    const response = await fetch(`${publicApiUrl}/listings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload)
    });
    const json = await response.json();
    if (response.ok) {
      router.push(`/oglasi/${json.data.slug}`);
      router.refresh();
    } else {
      setMessage(json?.error?.message ?? "Došlo je do greške.");
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
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
          >
            {categories.map((category) => (
              <option value={category.id} key={category.id}>
                {category.name_sr}
              </option>
            ))}
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
              <option value="new">Novo</option>
              <option value="like_new">Kao novo</option>
              <option value="used_excellent">Polovno - odlično</option>
              <option value="used_good">Polovno - dobro</option>
              <option value="used_fair">Polovno - korektno</option>
              <option value="for_parts_or_repair">Za delove/popravku</option>
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
          {selectedCategory?.attributes.map((attribute) => (
            <div key={attribute.id}>
              <FieldLabel htmlFor={`attr_${attribute.key}`}>
                {attribute.label_sr}{attribute.unit ? ` (${attribute.unit})` : ""}
              </FieldLabel>
              {attribute.field_type === "enum" ? (
                <Select id={`attr_${attribute.key}`} {...register(`attr_${attribute.key}`)}>
                  <option value="">Izaberite</option>
                  {attribute.options.options?.map((option) => (
                    <option value={option.value} key={option.value}>
                      {option.label_sr}
                    </option>
                  ))}
                </Select>
              ) : attribute.field_type === "boolean" ? (
                <Select id={`attr_${attribute.key}`} {...register(`attr_${attribute.key}`)}>
                  <option value="">Nije navedeno</option>
                  <option value="true">Da</option>
                  <option value="false">Ne</option>
                </Select>
              ) : (
                <Input id={`attr_${attribute.key}`} {...register(`attr_${attribute.key}`)} />
              )}
            </div>
          ))}
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
      {message ? <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{message}</p> : null}
      <Button type="submit" disabled={formState.isSubmitting} className="w-full md:w-auto">
        Pošalji na pregled
      </Button>
    </form>
  );
}
