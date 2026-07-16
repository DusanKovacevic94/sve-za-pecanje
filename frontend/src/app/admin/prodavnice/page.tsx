import { AdminShopManager, type AdminShop } from "@/components/admin/AdminShopManager";
import { ShopSubscriptionManager } from "@/components/admin/ShopSubscriptionManager";
import type { ShopSubscriptionRequest } from "@/lib/api";
import { serverApiFetch } from "@/lib/server-api";

export const metadata = { title: "Admin prodavnice | Sve Za Pecanje" };

export default async function AdminShopsPage() {
  const [shops, requests] = await Promise.all([
    serverApiFetch<AdminShop[]>("/admin/shops").catch(() => ({ data: [] as AdminShop[] })),
    serverApiFetch<ShopSubscriptionRequest[]>("/admin/shop-subscription-requests?status=pending").catch(() => ({ data: [] as ShopSubscriptionRequest[] }))
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-3xl font-black">Prodavnice</h1>
      <section className="mt-6">
        <h2 className="text-xl font-black">Zahtevi za pretplatu</h2>
        <div className="mt-4">
          <ShopSubscriptionManager requests={requests.data} />
        </div>
      </section>
      <section className="mt-8">
        <h2 className="text-xl font-black">Registrovane prodavnice</h2>
        <div className="mt-4">
          <AdminShopManager shops={shops.data} />
        </div>
      </section>
    </div>
  );
}
