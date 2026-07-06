import { type AdminConfig } from "@/lib/api";
import { serverApiFetch } from "@/lib/server-api";

const labels: Record<keyof AdminConfig, string> = {
  app_env: "Okruženje",
  listing_review_mode: "Moderacija oglasa",
  listing_lifetime_days: "Trajanje oglasa",
  max_listing_images: "Maksimalno slika",
  max_image_size_mb: "Maksimalna veličina slike",
  rate_limit_enabled: "Rate limit",
  storage_backend: "Storage backend",
  use_s3_storage: "S3 storage"
};

export default async function SettingsAdminPage() {
  const config = await serverApiFetch<AdminConfig>("/admin/config");
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-black">Podešavanja</h1>
      <p className="mt-2 text-slate-600">Read-only konfiguracija koju aplikacija trenutno koristi.</p>
      <dl className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-soft">
        {Object.entries(config.data).map(([key, value]) => (
          <div key={key} className="grid gap-2 border-b border-slate-100 p-4 sm:grid-cols-2">
            <dt className="font-semibold text-slate-600">{labels[key as keyof AdminConfig]}</dt>
            <dd className="font-bold">{String(value)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
