"use client";

import { useState } from "react";

import { apiFetch, type ShopProfile } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/Button";

export type AdminShop = ShopProfile & {
  id: string;
  email: string;
  username: string;
  created_at: string;
};

export function AdminShopManager({ shops }: { shops: AdminShop[] }) {
  const [items, setItems] = useState(shops);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function deactivate(userId: string) {
    setBusyId(userId);
    try {
      const response = await apiFetch<ShopProfile>(`/admin/shops/${userId}/deactivate`, { method: "POST" });
      setItems((current) => current.map((shop) => (shop.id === userId ? { ...shop, ...response.data } : shop)));
    } finally {
      setBusyId(null);
    }
  }

  if (!items.length) {
    return <p className="rounded-lg border border-slate-200 bg-white p-5 text-slate-600 shadow-soft">Nema registrovanih prodavnica.</p>;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-soft">
      <div className="grid grid-cols-[1fr_1fr_140px_120px] gap-3 border-b border-slate-100 bg-slate-50 p-3 text-xs font-bold uppercase text-slate-500">
        <span>Prodavnica</span>
        <span>Korisnik</span>
        <span>Status</span>
        <span>Akcija</span>
      </div>
      {items.map((shop) => (
        <div key={shop.id} className="grid grid-cols-[1fr_1fr_140px_120px] items-center gap-3 border-b border-slate-100 p-3 text-sm last:border-0">
          <span className="font-semibold">{shop.shop_name}</span>
          <span className="text-slate-600">{shop.email}</span>
          <span className="text-slate-600">{shop.shop_active ? `do ${formatDate(shop.shop_active_until ?? shop.created_at)}` : "neaktivna"}</span>
          <span>
            {shop.shop_active ? (
              <Button type="button" variant="secondary" className="min-h-9 px-3 py-1 text-xs" onClick={() => deactivate(shop.id)} isLoading={busyId === shop.id}>
                Ugasi
              </Button>
            ) : null}
          </span>
        </div>
      ))}
    </div>
  );
}
