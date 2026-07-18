import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { publicApiUrl, type Category } from "@/lib/api";
import { serverApiFetch } from "@/lib/server-api";

type Dashboard = {
  pending_listings: number;
  active_listings: number;
  new_users_last_7_days: number;
  unresolved_reports: number;
  messages_last_7_days: number;
  listings_last_7_days: number;
  failed_emails: number;
};

type MarketplaceSummary = {
  active_listings: number;
  new_approved_listings: number;
  unique_active_sellers: number;
  photo_quality_rate: number | null;
  searches: number;
  zero_result_rate: number | null;
  listing_views: number;
  conversations_started: number;
  contact_conversion_rate: number | null;
  sold_listings: number;
  sold_within_30_days_rate: number | null;
  median_days_to_sale: number | null;
  reports: number;
  report_rate_per_1000_views: number | null;
};

type MarketplaceDay = MarketplaceSummary & {
  date: string;
  zero_result_searches: number;
  listings_with_three_images: number;
  sold_within_30_days: number;
};

type MarketplaceDashboard = {
  period: {
    days: number;
    from: string;
    to: string;
    category_id: string | null;
    category_name: string | null;
  };
  has_data: boolean;
  summary: MarketplaceSummary | null;
  previous_summary: MarketplaceSummary | null;
  changes: Partial<Record<keyof MarketplaceSummary, number | null>>;
  series: MarketplaceDay[];
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function flattenCategories(categories: Category[]): Category[] {
  return categories.flatMap((category) => [
    category,
    ...flattenCategories(category.children)
  ]);
}

function value(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

function percent(metric: number | null) {
  return metric === null ? "—" : `${metric.toLocaleString("sr-RS")}%`;
}

function number(metric: number | null) {
  return metric === null ? "—" : metric.toLocaleString("sr-RS");
}

function change(metric: number | null | undefined) {
  if (metric === null || metric === undefined) return "Nema prethodnih podataka";
  const sign = metric > 0 ? "+" : "";
  return `${sign}${metric.toLocaleString("sr-RS")}% prema prethodnom periodu`;
}

function queryFor(days: number, categoryId?: string) {
  const query = new URLSearchParams({ days: String(days) });
  if (categoryId) query.set("category_id", categoryId);
  return `/admin?${query.toString()}`;
}

export default async function AdminPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const requestedDays = Number(value(params.days) ?? 30);
  const days = ([7, 30, 90] as const).includes(requestedDays as 7 | 30 | 90)
    ? requestedDays
    : 30;
  const categoryId = value(params.category_id);
  const analyticsQuery = new URLSearchParams({ days: String(days) });
  if (categoryId) analyticsQuery.set("category_id", categoryId);

  const [dashboard, marketplace, categories] = await Promise.all([
    serverApiFetch<Dashboard>("/admin/dashboard").catch(() => ({ data: null })),
    serverApiFetch<MarketplaceDashboard>(
      `/admin/analytics/marketplace?${analyticsQuery.toString()}`
    ).catch(() => ({ data: null })),
    serverApiFetch<Category[]>("/categories").catch(() => ({ data: [] }))
  ]);
  const data = dashboard.data;
  const marketplaceData = marketplace.data;
  const summary = marketplaceData?.summary;
  const categoryOptions = flattenCategories(categories.data);
  const cards = data ? [
    ["Na čekanju", data.pending_listings],
    ["Aktivni oglasi", data.active_listings],
    ["Novi korisnici 7 dana", data.new_users_last_7_days],
    ["Nerešene prijave", data.unresolved_reports],
    ["Neuspeli emailovi", data.failed_emails],
    ["Poruke 7 dana", data.messages_last_7_days],
    ["Oglasi 7 dana", data.listings_last_7_days]
  ] : [];
  const healthCards = summary ? [
    {
      label: "Aktivni oglasi",
      value: number(summary.active_listings),
      change: marketplaceData.changes.active_listings
    },
    {
      label: "Novi odobreni oglasi",
      value: number(summary.new_approved_listings),
      change: marketplaceData.changes.new_approved_listings
    },
    {
      label: "Aktivni prodavci",
      value: number(summary.unique_active_sellers),
      change: marketplaceData.changes.unique_active_sellers
    },
    {
      label: "Oglasi sa 3+ fotografije",
      value: percent(summary.photo_quality_rate),
      change: marketplaceData.changes.photo_quality_rate
    },
    {
      label: "Pretrage",
      value: number(summary.searches),
      change: marketplaceData.changes.searches
    },
    {
      label: "Pretrage bez rezultata",
      value: percent(summary.zero_result_rate),
      change: marketplaceData.changes.zero_result_rate
    },
    {
      label: "Pregledi oglasa",
      value: number(summary.listing_views),
      change: marketplaceData.changes.listing_views
    },
    {
      label: "Kontakt nakon pregleda",
      value: percent(summary.contact_conversion_rate),
      change: marketplaceData.changes.contact_conversion_rate
    },
    {
      label: "Prodati oglasi",
      value: number(summary.sold_listings),
      change: marketplaceData.changes.sold_listings
    },
    {
      label: "Prodato u 30 dana",
      value: percent(summary.sold_within_30_days_rate),
      change: marketplaceData.changes.sold_within_30_days_rate
    },
    {
      label: "Medijana dana do prodaje",
      value: number(summary.median_days_to_sale),
      change: marketplaceData.changes.median_days_to_sale
    },
    {
      label: "Prijave / 1.000 pregleda",
      value: number(summary.report_rate_per_1000_views),
      change: marketplaceData.changes.report_rate_per_1000_views
    }
  ] : [];
  const csvUrl = `${publicApiUrl}/admin/analytics/marketplace.csv?${analyticsQuery.toString()}`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-3xl font-black">Admin</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(([label, cardValue]) => (
          <div key={String(label)} className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
            <p className="text-sm font-semibold text-slate-500">{String(label)}</p>
            <p className="mt-2 text-3xl font-black text-river-700">{String(cardValue)}</p>
          </div>
        ))}
        {!data ? <p className="rounded-lg bg-white p-6 text-slate-600">Administratorska prijava je obavezna.</p> : null}
      </div>

      {data ? (
        <section className="mt-12">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-river-700">Likvidnost tržišta</p>
              <h2 className="mt-1 text-2xl font-black">Zdravlje marketplace-a</h2>
              <p className="mt-2 text-sm text-slate-600">
                {marketplaceData
                  ? `${marketplaceData.period.from} — ${marketplaceData.period.to}`
                  : "Dnevni podaci još nisu dostupni."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {[7, 30, 90].map((range) => (
                <Link
                  key={range}
                  href={queryFor(range, categoryId)}
                  className={`focus-ring rounded-md px-4 py-2 text-sm font-bold ${
                    days === range
                      ? "bg-river-700 text-white"
                      : "bg-white text-river-700 shadow-soft"
                  }`}
                >
                  {range} dana
                </Link>
              ))}
              <Button href={csvUrl} variant="secondary">CSV izvoz</Button>
            </div>
          </div>

          <form method="get" className="mt-5 flex flex-col gap-3 rounded-lg bg-white p-4 shadow-soft sm:flex-row sm:items-end">
            <input type="hidden" name="days" value={days} />
            <label className="flex-1 text-sm font-semibold text-slate-700">
              Kategorija
              <select
                name="category_id"
                defaultValue={categoryId ?? ""}
                className="focus-ring mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2"
              >
                <option value="">Sve kategorije</option>
                {categoryOptions.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.parent_id ? `— ${category.name_sr}` : category.name_sr}
                  </option>
                ))}
              </select>
            </label>
            <Button type="submit">Primeni</Button>
          </form>

          {marketplaceData?.has_data && summary ? (
            <>
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {healthCards.map((card) => (
                  <article key={card.label} className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
                    <p className="text-sm font-semibold text-slate-500">{card.label}</p>
                    <p className="mt-2 text-3xl font-black text-river-700">{card.value}</p>
                    <p className="mt-2 text-xs text-slate-500">{change(card.change)}</p>
                  </article>
                ))}
              </div>

              <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-soft">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Datum</th>
                      <th className="px-4 py-3">Aktivni</th>
                      <th className="px-4 py-3">Pretrage</th>
                      <th className="px-4 py-3">Bez rezultata</th>
                      <th className="px-4 py-3">Pregledi</th>
                      <th className="px-4 py-3">Kontakti</th>
                      <th className="px-4 py-3">Prodati</th>
                      <th className="px-4 py-3">Prijave</th>
                    </tr>
                  </thead>
                  <tbody>
                    {marketplaceData.series.map((day) => (
                      <tr key={day.date} className="border-t border-slate-100">
                        <td className="whitespace-nowrap px-4 py-3 font-semibold">{day.date}</td>
                        <td className="px-4 py-3">{number(day.active_listings)}</td>
                        <td className="px-4 py-3">{number(day.searches)}</td>
                        <td className="px-4 py-3">{percent(day.zero_result_rate)}</td>
                        <td className="px-4 py-3">{number(day.listing_views)}</td>
                        <td className="px-4 py-3">{number(day.conversations_started)}</td>
                        <td className="px-4 py-3">{number(day.sold_listings)}</td>
                        <td className="px-4 py-3">{number(day.reports)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="mt-6 rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">
              Dnevni podaci za izabrani period još nisu dostupni. Worker će napraviti prvi
              presek najkasnije u narednih 15 minuta.
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
