"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { apiFetch, type ShopPlan, type ShopProfile, type ShopSubscriptionRequest } from "@/lib/api";
import { formatDate, formatPrice } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Alert, type AlertMessage } from "@/components/ui/Alert";
import { FieldLabel, Input, Select, Textarea } from "@/components/ui/Field";

const shopSchema = z.object({
  shop_name: z.string().min(2).max(160),
  shop_logo_url: z.string().url().optional().or(z.literal("")),
  shop_description: z.string().max(2000).optional(),
  shop_tax_id: z.string().max(40).optional(),
  shop_registration_number: z.string().max(40).optional()
});

type ShopFormInput = z.input<typeof shopSchema>;
type ShopFormOutput = z.output<typeof shopSchema>;

export function ShopSettingsForm({
  shop,
  plans,
  requests
}: {
  shop: ShopProfile;
  plans: ShopPlan[];
  requests: ShopSubscriptionRequest[];
}) {
  const [message, setMessage] = useState<AlertMessage | null>(null);
  const [selectedPlan, setSelectedPlan] = useState(plans[0]?.plan ?? "monthly");
  const { register, handleSubmit, formState } = useForm<ShopFormInput, unknown, ShopFormOutput>({
    resolver: zodResolver(shopSchema),
    defaultValues: {
      shop_name: shop.shop_name ?? "",
      shop_logo_url: shop.shop_logo_url ?? "",
      shop_description: shop.shop_description ?? "",
      shop_tax_id: shop.shop_tax_id ?? "",
      shop_registration_number: shop.shop_registration_number ?? ""
    }
  });
  const pending = requests.find((request) => request.status === "pending");

  async function onSubmit(data: ShopFormOutput) {
    setMessage(null);
    try {
      await apiFetch<ShopProfile>("/shops/me", {
        method: "PATCH",
        body: JSON.stringify(data)
      });
      setMessage({ tone: "success", text: "Prodavnica je sačuvana." });
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Došlo je do greške." });
    }
  }

  async function requestSubscription() {
    setMessage(null);
    try {
      await apiFetch<ShopSubscriptionRequest>("/shops/me/subscription-requests", {
        method: "POST",
        body: JSON.stringify({ plan: selectedPlan })
      });
      setMessage({ tone: "success", text: "Zahtev je poslat. Admin će poslati predračun na email." });
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Došlo je do greške." });
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="rounded-xl border border-sand-200 bg-white p-5 shadow-soft">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <FieldLabel htmlFor="shop_name">Naziv prodavnice</FieldLabel>
            <Input id="shop_name" {...register("shop_name")} />
          </div>
          <div>
            <FieldLabel htmlFor="shop_logo_url">Logo URL</FieldLabel>
            <Input id="shop_logo_url" {...register("shop_logo_url")} placeholder="https://..." />
          </div>
          <div>
            <FieldLabel htmlFor="shop_tax_id">PIB</FieldLabel>
            <Input id="shop_tax_id" {...register("shop_tax_id")} />
          </div>
          <div>
            <FieldLabel htmlFor="shop_registration_number">Matični broj</FieldLabel>
            <Input id="shop_registration_number" {...register("shop_registration_number")} />
          </div>
          <div className="md:col-span-2">
            <FieldLabel htmlFor="shop_description">Opis prodavnice</FieldLabel>
            <Textarea id="shop_description" {...register("shop_description")} />
          </div>
        </div>
        <Button type="submit" disabled={formState.isSubmitting} className="mt-5">
          Sačuvaj prodavnicu
        </Button>
      </form>

      <section className="rounded-xl border border-sand-200 bg-white p-5 shadow-soft">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-extrabold">Pretplata</h2>
            <p className="mt-1 text-sm text-ink-600">
              Status: {shop.shop_active && shop.shop_active_until ? `aktivna do ${formatDate(shop.shop_active_until)}` : "nije aktivna"}
            </p>
            <p className="mt-1 text-sm text-ink-600">Limit aktivnih oglasa: {shop.listing_limit}</p>
          </div>
          {shop.shop_slug ? (
            <Button href={`/prodavnice/${shop.shop_slug}`} variant="secondary">
              Pogledaj stranicu
            </Button>
          ) : null}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
          <Select value={selectedPlan} onChange={(event) => setSelectedPlan(event.target.value as "monthly" | "yearly")} disabled={Boolean(pending)}>
            {plans.map((plan) => (
              <option key={plan.plan} value={plan.plan}>
                {plan.label} — {formatPrice(plan.price_amount, plan.currency)}
              </option>
            ))}
          </Select>
          <Button type="button" onClick={requestSubscription} disabled={Boolean(pending)}>
            Zatraži predračun
          </Button>
        </div>
        {pending ? (
          <Alert tone="warning" className="mt-3">
            Zahtev čeka obradu. Poziv na broj: {pending.payment_reference}
          </Alert>
        ) : null}
      </section>

      {requests.length ? (
        <section className="rounded-xl border border-sand-200 bg-white p-5 shadow-soft">
          <h2 className="text-xl font-extrabold">Zahtevi</h2>
          <div className="mt-3 divide-y divide-sand-200">
            {requests.map((request) => (
              <div key={request.id} className="py-3 text-sm">
                <p className="font-bold">{request.plan_label}</p>
                <p className="text-ink-600">
                  {formatPrice(request.price_amount, request.currency)} · {request.status} · {formatDate(request.created_at)}
                </p>
                <p className="text-ink-600">Poziv na broj: {request.payment_reference}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {message ? <Alert tone={message.tone}>{message.text}</Alert> : null}
    </div>
  );
}
