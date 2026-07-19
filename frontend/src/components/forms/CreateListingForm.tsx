"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Archive, CheckCircle2, CloudOff, LoaderCircle, Save } from "lucide-react";
import { z } from "zod";

import type { Brand, BuyerCandidate, Category, ListingDetail } from "@/lib/api";
import { ApiError, apiFetch } from "@/lib/api";
import { trackEvent } from "@/lib/analytics";
import { conditionOptions } from "@/lib/format";
import { listingSchema } from "@/lib/validation";
import { Button } from "@/components/ui/Button";
import { FieldLabel, Input, Select, Textarea } from "@/components/ui/Field";
import { ListingImageManager } from "@/components/forms/ListingImageManager";
import { ListingQualityChecklist } from "@/components/forms/ListingQualityChecklist";
import { TurnstileChallenge } from "@/components/forms/TurnstileChallenge";

const listingFormSchema = listingSchema.passthrough();

type ListingFormInput = z.input<typeof listingFormSchema>;
type ListingFormOutput = z.output<typeof listingFormSchema>;
type ListingFormDefaults = Partial<ListingFormInput> & {
  attributes?: Record<string, string | number | boolean | string[]>;
};

type ListingFormProps = {
  categories: Category[];
  brands: Brand[];
  mode?: "create" | "edit";
  listingId?: string;
  defaultValues?: ListingFormDefaults;
  images?: ListingDetail["images"];
  resumeDraft?: ListingDetail | null;
};

function conditionMatches(
  values: Record<string, unknown>,
  condition?: Record<string, string | string[]>
) {
  if (!condition) return true;
  return Object.entries(condition).every(([key, expected]) => {
    const actual = values[`attr_${key}`];
    const actualValues = Array.isArray(actual) ? actual : [actual];
    const allowed = Array.isArray(expected) ? expected : [expected];
    return actualValues.some((value) => typeof value === "string" && allowed.includes(value));
  });
}

function flattenCategories(categories: Category[]): Category[] {
  return categories.flatMap((category) => [
    category,
    ...flattenCategories(category.children)
  ]);
}

function getDefaultValues(categories: Category[], defaultValues?: ListingFormDefaults): ListingFormInput {
  const values: Record<string, unknown> = {
    currency: "RSD",
    condition: "used_good",
    allow_messages: true,
    phone_visible: false,
    category_id: defaultValues?.category_id ?? categories[0]?.id ?? "",
    ...defaultValues
  };
  Object.entries(defaultValues?.attributes ?? {}).forEach(([key, value]) => {
    values[`attr_${key}`] = Array.isArray(value) ? value : String(value);
  });
  delete values.attributes;
  return values as ListingFormInput;
}

function buildPayload(
  data: Record<string, unknown>,
  category: Category | undefined,
  mode: "create" | "edit"
) {
  const attributes: Record<string, unknown> = {};
  category?.attributes.forEach((attribute) => {
    const value = data[`attr_${attribute.key}`];
    if (value !== undefined && value !== "" && !(Array.isArray(value) && value.length === 0)) {
      if (attribute.field_type === "integer") {
        attributes[attribute.key] = Number.parseInt(String(value), 10);
      } else if (attribute.field_type === "decimal") {
        attributes[attribute.key] = Number.parseFloat(String(value));
      } else if (attribute.field_type === "boolean") {
        attributes[attribute.key] = value === true || value === "true";
      } else if (attribute.field_type === "multi_enum") {
        attributes[attribute.key] = Array.isArray(value) ? value : [String(value)];
      } else {
        attributes[attribute.key] = value;
      }
    }
  });

  const payload: Record<string, unknown> = { ...data, attributes };
  Object.keys(payload).forEach((key) => {
    if (key.startsWith("attr_")) {
      delete payload[key];
    }
  });
  ["brand_id", "brand_name_custom", "model", "municipality"].forEach((key) => {
    if (payload[key] === "") {
      payload[key] = null;
    }
  });
  if (mode === "create" && (payload.price_amount === "" || payload.price_amount === undefined)) {
    payload.price_amount = 0;
  }
  if (mode === "edit") {
    delete payload.category_id;
  }
  return payload;
}

function listingDefaults(listing: ListingDetail): ListingFormDefaults {
  return {
    category_id: listing.category.id,
    title: listing.title,
    description: listing.description,
    brand_id: listing.brand?.id ?? "",
    brand_name_custom: listing.brand_name_custom ?? "",
    model: listing.model ?? "",
    condition: listing.condition,
    price_amount: Number(listing.price_amount) || undefined,
    currency: listing.currency === "EUR" ? "EUR" : "RSD",
    city: listing.city,
    municipality: listing.municipality ?? "",
    allow_messages: listing.allow_messages,
    phone_visible: listing.phone_visible,
    attributes: listing.attributes
  };
}

type SaveState = "idle" | "saving" | "saved" | "offline" | "error" | "conflict";

export function CreateListingForm({
  categories,
  brands,
  mode = "create",
  listingId,
  defaultValues,
  images = [],
  resumeDraft = null
}: ListingFormProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [challengeRequired, setChallengeRequired] = useState(false);
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [challengeKey, setChallengeKey] = useState(0);
  const [draftId, setDraftId] = useState<string | null>(resumeDraft?.id ?? null);
  const [draftImages, setDraftImages] = useState<ListingDetail["images"]>(
    resumeDraft?.images ?? images
  );
  const [saveState, setSaveState] = useState<SaveState>(resumeDraft ? "saved" : "idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const isEdit = mode === "edit";
  const submitLabel = isEdit ? "Sačuvaj izmene" : "Pošalji na pregled";
  const initialValues = useMemo(
    () => getDefaultValues(
      categories,
      resumeDraft ? listingDefaults(resumeDraft) : defaultValues
    ),
    [categories, defaultValues, resumeDraft]
  );
  const categoryOptions = useMemo(() => flattenCategories(categories), [categories]);
  const {
    register,
    handleSubmit,
    formState,
    watch,
    getValues,
    reset
  } = useForm<ListingFormInput, unknown, ListingFormOutput>({
    resolver: zodResolver(listingFormSchema),
    defaultValues: initialValues,
    shouldUnregister: true
  });
  const categoryId = watch("category_id") || categories[0]?.id || "";
  const watchedValues = watch() as Record<string, unknown>;
  const selectedCategory = useMemo(
    () => categoryOptions.find((item) => item.id === categoryId),
    [categoryOptions, categoryId]
  );
  const draftIdRef = useRef<string | null>(resumeDraft?.id ?? null);
  const draftVersionRef = useRef(resumeDraft?.draft_version ?? 0);
  const clientDraftIdRef = useRef("");
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savePromiseRef = useRef<Promise<string | null> | null>(null);
  const pendingSaveRef = useRef(false);
  const unsavedRef = useRef(false);
  const hydratingRef = useRef(false);

  const markUnsaved = useCallback((value: boolean) => {
    unsavedRef.current = value;
    setHasUnsavedChanges(value);
  }, []);
  const handleImagesChange = useCallback((nextImages: ListingDetail["images"]) => {
    setDraftImages(nextImages);
  }, []);

  const persistDraft = useCallback(async (force = false): Promise<string | null> => {
    if (isEdit) return listingId ?? null;
    if (!force && !unsavedRef.current) return draftIdRef.current;
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    if (!navigator.onLine) {
      setSaveState("offline");
      setSaveError("Nema internet veze. Izmene su ostale u formularu.");
      markUnsaved(true);
      return draftIdRef.current;
    }
    if (savePromiseRef.current) {
      pendingSaveRef.current = true;
      await savePromiseRef.current;
      return draftIdRef.current;
    }

    const values = getValues() as Record<string, unknown>;
    const activeCategory = categoryOptions.find(
      (item) => item.id === String(values.category_id ?? "")
    );
    const payload = buildPayload(values, activeCategory, "create");
    const savedSnapshot = JSON.stringify(values);

    const operation = (async () => {
      setSaveState("saving");
      setSaveError(null);
      try {
        let response;
        if (draftIdRef.current) {
          response = await apiFetch<ListingDetail>(`/listings/drafts/${draftIdRef.current}`, {
            method: "PATCH",
            body: JSON.stringify({
              ...payload,
              expected_version: draftVersionRef.current
            })
          });
        } else {
          if (!clientDraftIdRef.current) {
            clientDraftIdRef.current = crypto.randomUUID();
          }
          response = await apiFetch<ListingDetail>("/listings/drafts", {
            method: "POST",
            body: JSON.stringify({
              ...payload,
              client_draft_id: clientDraftIdRef.current
            })
          });
        }
        draftIdRef.current = response.data.id;
        draftVersionRef.current = response.data.draft_version;
        setDraftId(response.data.id);
        setDraftImages(response.data.images);
        window.localStorage.setItem("szp-active-listing-draft", response.data.id);
        window.history.replaceState(
          window.history.state,
          "",
          `/postavi-oglas?draft=${response.data.id}`
        );
        if (JSON.stringify(getValues()) === savedSnapshot && !pendingSaveRef.current) {
          markUnsaved(false);
          setSaveState("saved");
        } else {
          markUnsaved(true);
          pendingSaveRef.current = true;
        }
        return response.data.id;
      } catch (error) {
        markUnsaved(true);
        if (error instanceof ApiError && error.code === "AUTOSAVE_CONFLICT") {
          setSaveState("conflict");
          setSaveError("Nacrt je promenjen u drugoj sesiji. Učitajte verziju sa servera.");
        } else if (error instanceof ApiError && error.status === 401) {
          setSaveState("error");
          setSaveError("Sesija je istekla. Prijavite se ponovo; podaci su ostali u formularu.");
        } else {
          setSaveState(navigator.onLine ? "error" : "offline");
          setSaveError(
            navigator.onLine
              ? "Nacrt nije sačuvan. Pokušavamo ponovo nakon sledeće izmene."
              : "Nema internet veze. Izmene su ostale u formularu."
          );
        }
        return null;
      }
    })();

    savePromiseRef.current = operation;
    try {
      return await operation;
    } finally {
      savePromiseRef.current = null;
      if (pendingSaveRef.current) {
        pendingSaveRef.current = false;
        if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = setTimeout(() => void persistDraft(), 50);
      }
    }
  }, [categoryOptions, getValues, isEdit, listingId, markUnsaved]);

  const loadDraft = useCallback(async (id: string) => {
    hydratingRef.current = true;
    setSaveError(null);
    try {
      const response = await apiFetch<ListingDetail>(`/listings/${id}/edit`);
      if (response.data.status !== "draft") {
        window.localStorage.removeItem("szp-active-listing-draft");
        return;
      }
      draftIdRef.current = response.data.id;
      draftVersionRef.current = response.data.draft_version;
      setDraftId(response.data.id);
      setDraftImages(response.data.images);
      reset(getDefaultValues(categories, listingDefaults(response.data)));
      markUnsaved(false);
      setSaveState("saved");
      window.localStorage.setItem("szp-active-listing-draft", response.data.id);
      window.history.replaceState(
        window.history.state,
        "",
        `/postavi-oglas?draft=${response.data.id}`
      );
    } catch (error) {
      if (error instanceof ApiError && [403, 404, 409].includes(error.status)) {
        window.localStorage.removeItem("szp-active-listing-draft");
        window.history.replaceState(window.history.state, "", "/postavi-oglas");
      } else {
        setSaveState("error");
        setSaveError("Sačuvani nacrt trenutno nije moguće učitati.");
      }
    } finally {
      hydratingRef.current = false;
    }
  }, [categories, markUnsaved, reset]);

  useEffect(() => {
    if (isEdit) return;
    clientDraftIdRef.current = crypto.randomUUID();
    if (resumeDraft) {
      window.localStorage.setItem("szp-active-listing-draft", resumeDraft.id);
      return;
    }
    const queryId = new URLSearchParams(window.location.search).get("draft");
    const storedId = window.localStorage.getItem("szp-active-listing-draft");
    const existingId = queryId ?? storedId;
    if (existingId) {
      void loadDraft(existingId);
    }
  }, [isEdit, loadDraft, resumeDraft]);

  useEffect(() => {
    if (isEdit) return;
    const subscription = watch((_values, event) => {
      if (hydratingRef.current || event.type !== "change") return;
      markUnsaved(true);
      setSaveError(null);
      if (!navigator.onLine) {
        setSaveState("offline");
        setSaveError("Nema internet veze. Izmene su ostale u formularu.");
        return;
      }
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = setTimeout(() => void persistDraft(), 900);
    });
    return () => {
      subscription.unsubscribe();
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [isEdit, markUnsaved, persistDraft, watch]);

  useEffect(() => {
    if (isEdit) return;
    const onOnline = () => {
      if (unsavedRef.current) void persistDraft(true);
    };
    const onOffline = () => {
      if (unsavedRef.current) {
        setSaveState("offline");
        setSaveError("Nema internet veze. Izmene su ostale u formularu.");
      }
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [isEdit, persistDraft]);

  useEffect(() => {
    if (isEdit || !hasUnsavedChanges) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const onDocumentClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!target || target.getAttribute("target") === "_blank") return;
      if (!window.confirm("Izmene još nisu sačuvane. Napustiti stranicu?")) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onDocumentClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onDocumentClick, true);
    };
  }, [hasUnsavedChanges, isEdit]);

  async function onSubmit(data: ListingFormOutput) {
    setMessage(null);
    try {
      let response;
      if (isEdit) {
        const payload = buildPayload(data, selectedCategory, mode);
        response = await apiFetch<ListingDetail>(`/listings/${listingId}`, {
          method: "PATCH",
          body: JSON.stringify(payload)
        });
      } else {
        const savedDraftId = await persistDraft(true);
        if (!savedDraftId) {
          setMessage("Oglas nije poslat jer nacrt nije sačuvan.");
          return;
        }
        response = await apiFetch<ListingDetail>(`/listings/drafts/${savedDraftId}/publish`, {
          method: "POST",
          body: JSON.stringify({
            expected_version: draftVersionRef.current,
            turnstile_token: challengeToken
          })
        });
        markUnsaved(false);
        window.localStorage.removeItem("szp-active-listing-draft");
        trackEvent("listing_created", { listing_id: response.data.id });
      }
      router.push(`/oglasi/${response.data.slug}`);
      router.refresh();
    } catch (error) {
      if (
        error instanceof ApiError
        && ["challenge_required", "challenge_unavailable"].includes(error.code)
      ) {
        setChallengeRequired(true);
        setChallengeToken(null);
        setChallengeKey((value) => value + 1);
      }
      setMessage(error instanceof Error ? error.message : "Došlo je do greške.");
    }
  }

  async function runOwnerAction(action: "archive" | "mark-sold") {
    if (!listingId) return;
    let soldToUserId: string | null | undefined = null;
    if (action === "mark-sold") {
      const candidates = (await apiFetch<BuyerCandidate[]>(`/listings/${listingId}/buyer-candidates`)).data;
      if (!candidates.length) {
        soldToUserId = window.confirm("Nema razgovora sa kupcima za ovaj oglas. Označiti kao prodato bez kupca?")
          ? null
          : undefined;
      } else {
        const options = candidates
          .map((candidate, index) => `${index + 1}. ${candidate.display_name ?? candidate.username}`)
          .join("\n");
        const selected = window.prompt(`Izaberite kupca unosom broja:\n${options}`);
        if (!selected) return;
        soldToUserId = candidates[Number(selected) - 1]?.id;
      }
    }
    if (soldToUserId === undefined) return;
    const confirmed = action === "archive" ? window.confirm("Arhivirati ovaj oglas?") : true;
    if (!confirmed) return;
    setActionMessage(null);
    try {
      const response = await apiFetch<ListingDetail>(`/listings/${listingId}/${action}`, {
        method: "POST",
        body: action === "mark-sold" ? JSON.stringify({ sold_to_user_id: soldToUserId }) : undefined
      });
      router.push(action === "archive" ? "/nalog/oglasi" : `/oglasi/${response.data.slug}`);
      router.refresh();
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Došlo je do greške.");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {!isEdit ? (
        <div
          className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${
            saveState === "error" || saveState === "conflict"
              ? "border-red-200 bg-red-50 text-red-800"
              : saveState === "offline"
                ? "border-amber-200 bg-amber-50 text-amber-900"
                : "border-river-100 bg-river-50 text-river-900"
          }`}
          role="status"
          aria-live="polite"
        >
          <span className="inline-flex items-center gap-2 font-semibold">
            {saveState === "saving" ? <LoaderCircle className="animate-spin" size={17} /> : null}
            {saveState === "saved" ? <Save size={17} /> : null}
            {saveState === "offline" ? <CloudOff size={17} /> : null}
            {saveState === "error" || saveState === "conflict" ? <AlertTriangle size={17} /> : null}
            {saveState === "saving"
              ? "Čuvanje…"
              : saveState === "saved"
                ? "Sačuvano"
                : saveState === "offline"
                  ? "Nema interneta"
                  : saveState === "conflict"
                    ? "Izmena sa drugog uređaja"
                    : saveState === "error"
                      ? "Greška pri čuvanju"
                      : "Nacrt će se automatski sačuvati nakon prve izmene"}
          </span>
          {saveState === "error" || saveState === "offline" ? (
            <Button type="button" variant="secondary" onClick={() => void persistDraft(true)}>
              Pokušaj ponovo
            </Button>
          ) : null}
          {saveState === "conflict" && draftId ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                if (window.confirm("Učitati verziju sa servera i odbaciti lokalne izmene?")) {
                  void loadDraft(draftId);
                }
              }}
            >
              Učitaj sa servera
            </Button>
          ) : null}
          {saveError ? <span className="w-full text-xs">{saveError}</span> : null}
        </div>
      ) : null}
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
        <h2 className="text-xl font-black">1. Kategorija</h2>
        <div className="mt-4">
          <FieldLabel htmlFor="category_id">Kategorija</FieldLabel>
          <Select
            id="category_id"
            {...register("category_id")}
            disabled={isEdit}
          >
            {categories.flatMap((category) => [
              <option value={category.id} key={category.id}>
                {category.name_sr}
              </option>,
              ...category.children.map((child) => (
                <option value={child.id} key={child.id}>
                  ↳ {child.name_sr}
                </option>
              ))
            ])}
          </Select>
          <p className="mt-1 text-sm text-red-600">{formState.errors.category_id?.message}</p>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
        <h2 className="text-xl font-black">2. Osnovni podaci</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <FieldLabel htmlFor="title">Naslov</FieldLabel>
            <Input id="title" {...register("title")} placeholder="Shimano Stradic FL 2500" />
            <p className="mt-1 text-sm text-red-600">{formState.errors.title?.message}</p>
          </div>
          <div className="md:col-span-2">
            <FieldLabel htmlFor="description">Opis</FieldLabel>
            <Textarea id="description" {...register("description")} />
            <p className="mt-1 text-sm text-red-600">{formState.errors.description?.message}</p>
          </div>
          <div>
            <FieldLabel htmlFor="brand_id">Brend</FieldLabel>
            <Select id="brand_id" {...register("brand_id")}>
              <option value="">Nije navedeno</option>
              {brands.map((brand) => (
                <option value={brand.id} key={brand.id}>
                  {brand.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <FieldLabel htmlFor="model">Model</FieldLabel>
            <Input id="model" {...register("model")} />
          </div>
          <div>
            <FieldLabel htmlFor="condition">Stanje</FieldLabel>
            <Select id="condition" {...register("condition")}>
              {conditionOptions.map(({ value, label }) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <FieldLabel htmlFor="city">Grad</FieldLabel>
            <Input id="city" {...register("city")} placeholder="Beograd" />
          </div>
          <div>
            <FieldLabel htmlFor="price_amount">Cena</FieldLabel>
            <Input id="price_amount" type="number" step="0.01" {...register("price_amount")} />
            <p className="mt-1 text-sm text-red-600">{formState.errors.price_amount?.message}</p>
          </div>
          <div>
            <FieldLabel htmlFor="currency">Valuta</FieldLabel>
            <Select id="currency" {...register("currency")}>
              <option value="RSD">RSD</option>
              <option value="EUR">EUR</option>
            </Select>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
        <h2 className="text-xl font-black">3. Specifični detalji</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {selectedCategory?.attributes.filter(
            (attribute) => conditionMatches(watchedValues, attribute.validation.visible_when)
          ).map((attribute) => {
            const conditionallyRequired = conditionMatches(
              watchedValues,
              attribute.validation.required_when
            );
            const required = attribute.required || (
              Boolean(attribute.validation.required_when) && conditionallyRequired
            );
            const requireInput = required && !isEdit;
            return (
            <div key={attribute.id}>
              <FieldLabel htmlFor={`attr_${attribute.key}`}>
                {attribute.label_sr}{attribute.unit ? ` (${attribute.unit})` : ""}{required ? " *" : ""}
              </FieldLabel>
              {attribute.field_type === "enum" ? (
                <Select id={`attr_${attribute.key}`} required={requireInput} {...register(`attr_${attribute.key}`)}>
                  <option value="">Izaberite</option>
                  {attribute.options.options?.map((option) => (
                    <option value={option.value} key={option.value}>
                      {option.label_sr}
                    </option>
                  ))}
                </Select>
              ) : attribute.field_type === "multi_enum" ? (
                <>
                  <Select
                    id={`attr_${attribute.key}`}
                    multiple
                    className="min-h-32"
                    required={requireInput}
                    {...register(`attr_${attribute.key}`)}
                  >
                    {attribute.options.options?.map((option) => (
                      <option value={option.value} key={option.value}>
                        {option.label_sr}
                      </option>
                    ))}
                  </Select>
                  <p className="mt-1 text-xs text-slate-500">Možete izabrati više stavki.</p>
                </>
              ) : attribute.field_type === "boolean" ? (
                <Select id={`attr_${attribute.key}`} required={requireInput} {...register(`attr_${attribute.key}`)}>
                  <option value="">Nije navedeno</option>
                  <option value="true">Da</option>
                  <option value="false">Ne</option>
                </Select>
              ) : (
                <Input
                  id={`attr_${attribute.key}`}
                  type={attribute.field_type === "integer" || attribute.field_type === "decimal" ? "number" : "text"}
                  min={attribute.validation.min}
                  max={attribute.validation.max}
                  step={attribute.validation.step ?? (attribute.field_type === "integer" ? 1 : undefined)}
                  required={requireInput}
                  {...register(`attr_${attribute.key}`)}
                />
              )}
            </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
        <h2 className="text-xl font-black">4. Pravila i kontakt</h2>
        <div className="mt-4 space-y-3">
          <label className="flex gap-3 text-sm">
            <input type="checkbox" {...register("allow_messages")} defaultChecked />
            Dozvoli poruke za ovaj oglas
          </label>
          <label className="flex gap-3 text-sm">
            <input type="checkbox" {...register("phone_visible")} />
            Prikaži broj telefona prijavljenim korisnicima
          </label>
          <p className="text-sm text-slate-600">
            Zabranjeni su nelegalna oprema, ukradena roba, falsifikati i sadržaj koji podstiče nezakonit ribolov.
          </p>
        </div>
      </section>
      <ListingImageManager
        listingId={isEdit ? listingId : draftId ?? undefined}
        initialImages={isEdit ? images : draftImages}
        ensureListingId={isEdit ? undefined : () => persistDraft(true)}
        onImagesChange={isEdit ? undefined : handleImagesChange}
      />
      {!isEdit ? (
        <ListingQualityChecklist
          values={watchedValues}
          category={selectedCategory}
          images={draftImages}
        />
      ) : null}
      {message ? <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{message}</p> : null}
      {challengeRequired ? (
        <TurnstileChallenge key={challengeKey} onToken={setChallengeToken} />
      ) : null}
      <Button type="submit" disabled={formState.isSubmitting} className="w-full md:w-auto">
        {submitLabel}
      </Button>
      {isEdit ? (
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
          <h2 className="text-xl font-black">Akcije oglasa</h2>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Button type="button" variant="secondary" onClick={() => runOwnerAction("mark-sold")}>
              <CheckCircle2 size={18} /> Označi kao prodato
            </Button>
            <Button type="button" variant="danger" onClick={() => runOwnerAction("archive")}>
              <Archive size={18} /> Arhiviraj oglas
            </Button>
          </div>
          {actionMessage ? (
            <p className="mt-3 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{actionMessage}</p>
          ) : null}
        </section>
      ) : null}
    </form>
  );
}
