import type { Category } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { FieldLabel, Input, Select } from "@/components/ui/Field";

export function FilterSidebar({ categories, searchParams }: { categories: Category[]; searchParams: Record<string, string | string[] | undefined> }) {
  const category = typeof searchParams.category === "string" ? searchParams.category : "";
  return (
    <form action="/oglasi" className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-soft">
      <div>
        <FieldLabel htmlFor="q">Pretraga</FieldLabel>
        <Input id="q" name="q" defaultValue={typeof searchParams.q === "string" ? searchParams.q : ""} placeholder="Shimano, štap, varalice..." />
      </div>
      <div>
        <FieldLabel htmlFor="category">Kategorija</FieldLabel>
        <Select id="category" name="category" defaultValue={category}>
          <option value="">Sve kategorije</option>
          {categories.map((item) => (
            <option value={item.slug} key={item.id}>
              {item.name_sr}
            </option>
          ))}
        </Select>
      </div>
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
      <div>
        <FieldLabel htmlFor="city">Grad</FieldLabel>
        <Input id="city" name="city" defaultValue={typeof searchParams.city === "string" ? searchParams.city : ""} placeholder="Beograd" />
      </div>
      <div>
        <FieldLabel htmlFor="condition">Stanje</FieldLabel>
        <Select id="condition" name="condition" defaultValue={typeof searchParams.condition === "string" ? searchParams.condition : ""}>
          <option value="">Sva stanja</option>
          <option value="new">Novo</option>
          <option value="like_new">Kao novo</option>
          <option value="used_excellent">Polovno - odlično</option>
          <option value="used_good">Polovno - dobro</option>
          <option value="used_fair">Polovno - korektno</option>
        </Select>
      </div>
      <Button type="submit" className="w-full">Primeni filtere</Button>
    </form>
  );
}

