import { ShopSettingsForm } from "@/components/forms/ShopSettingsForm";
import { serverApiFetch } from "@/lib/server-api";
import type { ShopPlan, ShopProfile, ShopSubscriptionRequest } from "@/lib/api";

export const metadata = { title: "Prodavnica | Sve Za Pecanje" };

export default async function AccountShopPage() {
  const [shop, plans, requests] = await Promise.all([
    serverApiFetch<ShopProfile>("/shops/me"),
    serverApiFetch<ShopPlan[]>("/shops/plans"),
    serverApiFetch<ShopSubscriptionRequest[]>("/shops/me/subscription-requests").catch(() => ({ data: [] as ShopSubscriptionRequest[] }))
  ]);

  return (
    <div>
      <h1 className="text-3xl font-black">Prodavnica</h1>
      <p className="mt-2 text-slate-600">Podešavanja prodavnice i zahtev za mesečnu ili godišnju pretplatu.</p>
      <div className="mt-6">
        <ShopSettingsForm shop={shop.data} plans={plans.data} requests={requests.data} />
      </div>
    </div>
  );
}
