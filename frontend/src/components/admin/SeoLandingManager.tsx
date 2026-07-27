"use client";

import { useMemo, useState } from "react";

import {
  apiFetch,
  type AdminBrand,
  type Category,
  type SeoLanding,
} from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { FieldLabel, Input, Select, Textarea } from "@/components/ui/Field";

type FormState = {
  category_id: string;
  brand_id: string;
  title: string;
  meta_description: string;
  intro_copy: string;
  indexing_enabled: boolean;
  minimum_active_listings: number;
  threshold_override: boolean;
  override_reason: string;
};

const emptyForm: FormState = {
  category_id: "",
  brand_id: "",
  title: "",
  meta_description: "",
  intro_copy: "",
  indexing_enabled: true,
  minimum_active_listings: 3,
  threshold_override: false,
  override_reason: "",
};

export function SeoLandingManager({
  initialLandings,
  categories,
  brands,
}: {
  initialLandings: SeoLanding[];
  categories: Category[];
  brands: AdminBrand[];
}) {
  const [landings, setLandings] = useState(initialLandings);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [preview, setPreview] = useState<SeoLanding | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const selectedBrand = useMemo(
    () => brands.find((item) => item.id === form.brand_id),
    [brands, form.brand_id],
  );

  function payload() {
    return {
      ...form,
      brand_id: form.brand_id || null,
      override_reason: form.override_reason || null,
    };
  }

  function selectLanding(item: SeoLanding) {
    setEditingId(item.id);
    setPreview(null);
    setMessage(null);
    setForm({
      category_id: item.category.id,
      brand_id: item.brand?.id ?? "",
      title: item.title,
      meta_description: item.meta_description,
      intro_copy: item.intro_copy,
      indexing_enabled: item.indexing_enabled,
      minimum_active_listings: item.minimum_active_listings,
      threshold_override: Boolean(item.threshold_override),
      override_reason: item.override_reason ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function reset() {
    setEditingId(null);
    setForm(emptyForm);
    setPreview(null);
    setMessage(null);
  }

  async function runPreview() {
    setPending(true);
    setMessage(null);
    try {
      const response = await apiFetch<SeoLanding>(
        "/admin/seo-landings/preview",
        { method: "POST", body: JSON.stringify(payload()) },
      );
      setPreview(response.data);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Pregled nije dostupan.");
    } finally {
      setPending(false);
    }
  }

  async function save() {
    setPending(true);
    setMessage(null);
    try {
      const response = await apiFetch<SeoLanding>(
        editingId
          ? `/admin/seo-landings/${editingId}`
          : "/admin/seo-landings",
        {
          method: editingId ? "PATCH" : "POST",
          body: JSON.stringify(payload()),
        },
      );
      setLandings((current) => [
        response.data,
        ...current.filter((item) => item.id !== response.data.id),
      ]);
      setEditingId(response.data.id);
      setPreview(response.data);
      setMessage("SEO landing je sačuvan.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "SEO landing nije sačuvan.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-black">
            {editingId ? "Izmeni landing" : "Novi landing"}
          </h2>
          {editingId ? (
            <Button type="button" variant="ghost" onClick={reset}>
              Novi
            </Button>
          ) : null}
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div>
            <FieldLabel htmlFor="seo-category">Kategorija</FieldLabel>
            <Select
              id="seo-category"
              value={form.category_id}
              onChange={(event) =>
                setForm({ ...form, category_id: event.target.value })
              }
            >
              <option value="">Izaberite kategoriju</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name_sr}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <FieldLabel htmlFor="seo-brand">Brend (opciono)</FieldLabel>
            <Select
              id="seo-brand"
              value={form.brand_id}
              onChange={(event) => {
                const brandId = event.target.value;
                setForm({
                  ...form,
                  brand_id: brandId,
                  minimum_active_listings: brandId ? 5 : 3,
                });
              }}
            >
              <option value="">Stranica kategorije</option>
              {brands.filter((brand) => brand.is_verified).map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="md:col-span-2">
            <FieldLabel htmlFor="seo-title">SEO naslov</FieldLabel>
            <Input
              id="seo-title"
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              placeholder={
                selectedBrand
                  ? `${selectedBrand.name} oglasi u kategoriji`
                  : "Oglasi u kategoriji"
              }
            />
          </div>
          <div className="md:col-span-2">
            <FieldLabel htmlFor="seo-description">Meta opis</FieldLabel>
            <Textarea
              id="seo-description"
              value={form.meta_description}
              onChange={(event) =>
                setForm({ ...form, meta_description: event.target.value })
              }
            />
            <p className="mt-1 text-xs text-slate-500">
              {form.meta_description.length}/320 znakova
            </p>
          </div>
          <div className="md:col-span-2">
            <FieldLabel htmlFor="seo-intro">Uvodni tekst</FieldLabel>
            <Textarea
              id="seo-intro"
              value={form.intro_copy}
              onChange={(event) =>
                setForm({ ...form, intro_copy: event.target.value })
              }
              className="min-h-36"
            />
          </div>
          <div>
            <FieldLabel htmlFor="seo-minimum">Minimum aktivnih oglasa</FieldLabel>
            <Input
              id="seo-minimum"
              type="number"
              min={1}
              max={1000}
              value={form.minimum_active_listings}
              onChange={(event) =>
                setForm({
                  ...form,
                  minimum_active_listings: Number(event.target.value),
                })
              }
            />
          </div>
          <div className="space-y-3 pt-6">
            <label className="flex items-center gap-3 text-sm font-semibold">
              <input
                type="checkbox"
                checked={form.indexing_enabled}
                onChange={(event) =>
                  setForm({ ...form, indexing_enabled: event.target.checked })
                }
              />
              Dozvoli indeksiranje kada su uslovi ispunjeni
            </label>
            <label className="flex items-center gap-3 text-sm font-semibold">
              <input
                type="checkbox"
                checked={form.threshold_override}
                onChange={(event) =>
                  setForm({ ...form, threshold_override: event.target.checked })
                }
              />
              Administratorski override praga
            </label>
          </div>
          {form.threshold_override ? (
            <div className="md:col-span-2">
              <FieldLabel htmlFor="seo-override-reason">
                Razlog za override
              </FieldLabel>
              <Textarea
                id="seo-override-reason"
                value={form.override_reason}
                onChange={(event) =>
                  setForm({ ...form, override_reason: event.target.value })
                }
                placeholder="Obrazloženje ostaje u audit logu."
              />
            </div>
          ) : null}
        </div>
        {message ? (
          <p className="mt-4 rounded-md bg-slate-100 p-3 text-sm font-semibold">
            {message}
          </p>
        ) : null}
        <div className="mt-5 flex flex-wrap gap-3">
          <Button type="button" onClick={save} isLoading={pending}>
            Sačuvaj
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={runPreview}
            disabled={pending}
          >
            Pregledaj uslove
          </Button>
        </div>
        {preview ? (
          <div className="mt-5 rounded-lg border border-river-200 bg-river-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-black">{preview.title}</p>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-bold">
                {preview.is_indexable ? "index,follow" : "noindex,follow"}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-700">{preview.meta_description}</p>
            <p className="mt-3 text-sm">
              {preview.active_listing_count} aktivnih / minimum{" "}
              {preview.minimum_active_listings}
            </p>
            <Button
              href={preview.canonical_path}
              variant="secondary"
              className="mt-3"
            >
              Otvori javnu stranicu
            </Button>
          </div>
        ) : null}
      </section>

      <aside>
        <h2 className="text-xl font-black">Kreirani landinzi</h2>
        <div className="mt-3 space-y-3">
          {landings.map((item) => (
            <article
              key={item.id}
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-soft"
            >
              <p className="font-black">
                {item.brand ? `${item.brand.name} · ` : ""}
                {item.category.name_sr}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {item.active_listing_count}/{item.minimum_active_listings} oglasa ·{" "}
                {item.is_indexable ? "index" : "noindex"}
              </p>
              <Button
                type="button"
                variant="secondary"
                className="mt-3 w-full"
                onClick={() => selectLanding(item)}
              >
                Izmeni
              </Button>
            </article>
          ))}
          {!landings.length ? (
            <p className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
              Još nema ručno kreiranih SEO landinga.
            </p>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
