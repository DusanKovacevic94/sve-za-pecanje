"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { apiFetch, type AdminBrand } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { FieldLabel, Input, Select } from "@/components/ui/Field";

export function BrandManager({ brands }: { brands: AdminBrand[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function createBrand() {
    if (!name.trim()) return;
    setMessage(null);
    try {
      await apiFetch<AdminBrand>("/admin/brands", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), is_verified: true })
      });
      setName("");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Došlo je do greške.");
    }
  }

  async function renameBrand(brand: AdminBrand) {
    const nextName = window.prompt("Novi naziv brenda", brand.name);
    if (!nextName || nextName.trim() === brand.name) return;
    setMessage(null);
    try {
      await apiFetch<AdminBrand>(`/admin/brands/${brand.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: nextName.trim() })
      });
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Došlo je do greške.");
    }
  }

  async function deleteBrand(brand: AdminBrand, replacementId: string) {
    if (!window.confirm(`Obrisati brend "${brand.name}"?`)) return;
    const suffix = replacementId ? `?merge_into_id=${encodeURIComponent(replacementId)}` : "";
    setMessage(null);
    try {
      await apiFetch<{ message: string }>(`/admin/brands/${brand.id}${suffix}`, { method: "DELETE" });
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Došlo je do greške.");
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div>
            <FieldLabel htmlFor="brand-name">Novi brend</FieldLabel>
            <Input id="brand-name" value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <Button type="button" className="self-end" onClick={createBrand}>
            <Plus size={18} /> Dodaj
          </Button>
        </div>
        {message ? <p className="mt-3 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{message}</p> : null}
      </section>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-soft">
        {brands.map((brand) => (
          <BrandRow
            key={brand.id}
            brand={brand}
            brands={brands}
            onRename={() => renameBrand(brand)}
            onDelete={deleteBrand}
          />
        ))}
      </div>
    </div>
  );
}

function BrandRow({
  brand,
  brands,
  onRename,
  onDelete
}: {
  brand: AdminBrand;
  brands: AdminBrand[];
  onRename: () => void;
  onDelete: (brand: AdminBrand, replacementId: string) => Promise<void>;
}) {
  const [replacementId, setReplacementId] = useState("");
  return (
    <div className="grid gap-3 border-b border-slate-100 p-4 md:grid-cols-[1fr_220px_auto]">
      <div>
        <p className="font-bold">{brand.name}</p>
        <p className="text-sm text-slate-500">{brand.slug}</p>
      </div>
      <Select value={replacementId} onChange={(event) => setReplacementId(event.target.value)} aria-label="Spoji u">
        <option value="">Bez spajanja</option>
        {brands
          .filter((item) => item.id !== brand.id)
          .map((item) => (
            <option key={item.id} value={item.id}>
              Spoji u {item.name}
            </option>
          ))}
      </Select>
      <div className="flex gap-2">
        <Button type="button" variant="secondary" onClick={onRename} aria-label="Preimenuj brend" title="Preimenuj brend">
          <Pencil size={18} />
        </Button>
        <Button
          type="button"
          variant="danger"
          onClick={() => onDelete(brand, replacementId)}
          aria-label="Obriši brend"
          title="Obriši brend"
        >
          <Trash2 size={18} />
        </Button>
      </div>
    </div>
  );
}
