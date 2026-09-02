"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { apiFetch, type UserProfile } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Alert, type AlertMessage } from "@/components/ui/Alert";
import { FieldLabel, Input, Textarea } from "@/components/ui/Field";
import { PhoneVerificationPanel } from "@/components/forms/PhoneVerificationPanel";

const profileSchema = z.object({
  display_name: z.string().max(120).optional(),
  city: z.string().max(120).optional(),
  municipality: z.string().max(120).optional(),
  phone_number: z.string().max(40).optional(),
  phone_visible: z.boolean().default(false),
  bio: z.string().max(2000).optional(),
  fishing_styles: z.string().max(500).optional(),
  notify_messages: z.boolean().default(true),
  notify_saved_searches: z.boolean().default(true),
  notify_listing_expiry: z.boolean().default(true),
  notify_followed_sellers: z.boolean().default(true)
});

type ProfileFormInput = z.input<typeof profileSchema>;
type ProfileFormOutput = z.output<typeof profileSchema>;

function profileDefaults(profile: UserProfile): ProfileFormInput {
  return {
    display_name: profile.display_name ?? "",
    city: profile.city ?? "",
    municipality: profile.municipality ?? "",
    phone_number: profile.phone_number ?? "",
    phone_visible: profile.phone_visible,
    bio: profile.bio ?? "",
    fishing_styles: profile.fishing_styles.join(", "),
    notify_messages: profile.notify_messages,
    notify_saved_searches: profile.notify_saved_searches,
    notify_listing_expiry: profile.notify_listing_expiry,
    notify_followed_sellers: profile.notify_followed_sellers,
  };
}

export function ProfileForm({ profile }: { profile: UserProfile }) {
  const [currentProfile, setCurrentProfile] = useState(profile);
  const [message, setMessage] = useState<AlertMessage | null>(null);
  const { register, handleSubmit, formState, reset } = useForm<ProfileFormInput, unknown, ProfileFormOutput>({
    resolver: zodResolver(profileSchema),
    defaultValues: profileDefaults(profile),
  });

  function applyProfile(nextProfile: UserProfile) {
    setCurrentProfile(nextProfile);
    reset(profileDefaults(nextProfile));
  }

  async function onSubmit(data: ProfileFormOutput) {
    setMessage(null);
    const payload = {
      ...data,
      fishing_styles: data.fishing_styles
        ?.split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    };
    try {
      const response = await apiFetch<UserProfile>("/users/me/profile", {
        method: "PATCH",
        body: JSON.stringify(payload)
      });
      applyProfile(response.data);
      setMessage({ tone: "success", text: "Profil je ažuriran." });
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Došlo je do greške." });
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="rounded-xl border border-sand-200 bg-white p-5 shadow-soft">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <FieldLabel htmlFor="display_name">Ime za prikaz</FieldLabel>
          <Input id="display_name" {...register("display_name")} />
        </div>
        <div>
          <FieldLabel htmlFor="city">Grad</FieldLabel>
          <Input id="city" {...register("city")} />
        </div>
        <div>
          <FieldLabel htmlFor="municipality">Opština</FieldLabel>
          <Input id="municipality" {...register("municipality")} />
        </div>
        <div>
          <FieldLabel htmlFor="phone_number">Telefon</FieldLabel>
          <Input id="phone_number" {...register("phone_number")} />
        </div>
        <div className="md:col-span-2">
          <FieldLabel htmlFor="fishing_styles">Stilovi ribolova</FieldLabel>
          <Input id="fishing_styles" {...register("fishing_styles")} placeholder="varaličarenje, feeder, šaran" />
          <p className="mt-1 text-xs text-ink-500">Odvojite vrednosti zarezom.</p>
        </div>
        <div className="md:col-span-2">
          <FieldLabel htmlFor="bio">Bio</FieldLabel>
          <Textarea id="bio" {...register("bio")} />
        </div>
        <label className="flex items-center gap-3 text-sm font-semibold md:col-span-2">
          <input type="checkbox" {...register("phone_visible")} />
          Prikaži telefon prijavljenim korisnicima
        </label>
        <PhoneVerificationPanel
          profile={currentProfile}
          phoneDirty={Boolean(formState.dirtyFields.phone_number)}
          onVerified={applyProfile}
        />
        <div className="space-y-3 rounded-xl border border-sand-200 bg-sand-50 p-4 md:col-span-2">
          <p className="text-sm font-extrabold text-ink-800">Email notifikacije</p>
          <label className="flex items-center gap-3 text-sm font-semibold">
            <input type="checkbox" {...register("notify_messages")} />
            Nove poruke
          </label>
          <label className="flex items-center gap-3 text-sm font-semibold">
            <input type="checkbox" {...register("notify_saved_searches")} />
            Sačuvane pretrage
          </label>
          <label className="flex items-center gap-3 text-sm font-semibold">
            <input type="checkbox" {...register("notify_listing_expiry")} />
            Isticanje oglasa
          </label>
          <label className="flex items-center gap-3 text-sm font-semibold">
            <input type="checkbox" {...register("notify_followed_sellers")} />
            Dnevni pregled oglasa prodavaca koje pratim
          </label>
        </div>
      </div>
      {message ? <Alert tone={message.tone} className="mt-4">{message.text}</Alert> : null}
      <Button type="submit" disabled={formState.isSubmitting} className="mt-5">
        Sačuvaj profil
      </Button>
    </form>
  );
}
