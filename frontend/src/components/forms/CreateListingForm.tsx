"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { type FieldErrors, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import {
  AlertIcon,
  ArchiveIcon,
  CloudOfflineIcon,
  SaveIcon,
  SpinnerIcon,
  SuccessIcon,
} from "@/components/icons";
import type { Brand, BuyerCandidate, Category, ListingDetail } from "@/lib/api";
import { ApiError, apiFetch } from "@/lib/api";
import { trackEvent } from "@/lib/analytics";
import {
  conditionOptions,
  deliveryMethodOptions,
  priceTypeOptions
} from "@/lib/format";
import { listingSchema } from "@/lib/validation";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { FieldLabel, Input, Select, Textarea } from "@/components/ui/Field";
import { ListingImageManager } from "@/components/forms/ListingImageManager";
import {
  ListingFormProgress,
  type ListingFormSection
} from "@/components/forms/ListingFormProgress";
import { ListingQualityChecklist } from "@/components/forms/ListingQualityChecklist";
import { TurnstileChallenge } from "@/components/forms/TurnstileChallenge";

const listingFormSchema = listingSchema;

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
    price_type: "fixed",
    delivery_methods: [],
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
    if (attribute.field_type === "multi_enum") {
      const selected = (Array.isArray(value) ? value : typeof value === "string" ? [value] : [])
        .filter((item): item is string => typeof item === "string" && item.length > 0);
      if (selected.length) attributes[attribute.key] = selected;
      return;
    }
    if (value !== undefined && value !== "" && !(Array.isArray(value) && value.length === 0)) {
      if (attribute.field_type === "integer") {
        attributes[attribute.key] = Number.parseInt(String(value), 10);
      } else if (attribute.field_type === "decimal") {
        attributes[attribute.key] = Number.parseFloat(String(value));
      } else if (attribute.field_type === "boolean") {
        attributes[attribute.key] = value === true || value === "true";
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
  ["brand_id", "brand_name_custom", "model", "municipality", "delivery_note"].forEach((key) => {
    if (payload[key] === "") {
      payload[key] = null;
    }
  });
  if (["on_request", "free"].includes(String(payload.price_type))) {
    payload.price_amount = null;
  } else if (mode === "create" && (payload.price_amount === "" || payload.price_amount === undefined)) {
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
    price_type: listing.price_type,
    price_amount: listing.price_amount === null ? undefined : Number(listing.price_amount),
    currency: listing.currency === "EUR" ? "EUR" : "RSD",
    delivery_methods: listing.delivery_methods,
    delivery_note: listing.delivery_note ?? "",
    city: listing.city,
    municipality: listing.municipality ?? "",
    allow_messages: listing.allow_messages,
    phone_visible: listing.phone_visible,
    attributes: listing.attributes
  };
}

type SaveState = "idle" | "saving" | "saved" | "offline" | "error" | "conflict";

const formSectionIds = {
  category: "listing-section-category",
  basics: "listing-section-basics",
  details: "listing-section-details",
  handoff: "listing-section-handoff",
  images: "listing-section-images"
} as const;

function hasFormValue(value: unknown) {
  return value !== undefined
    && value !== null
    && value !== ""
    && (!Array.isArray(value) || value.length > 0);
}

function hasAttributeValue(fieldType: string, value: unknown) {
  if (fieldType === "multi_enum") {
    return Array.isArray(value) && value.some((item) => typeof item === "string" && item.length > 0);
  }
  return hasFormValue(value);
}

function errorMessage(error: unknown) {
  if (!error || typeof error !== "object" || !("message" in error)) return null;
  return typeof error.message === "string" ? error.message : null;
}

type ValidationIssue = {
  field: string;
  sectionId: string;
  message: string;
};

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
  const [currentSection, setCurrentSection] = useState<string>(formSectionIds.category);
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
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
    reset,
    setError,
    clearErrors
  } = useForm<ListingFormInput, unknown, ListingFormOutput>({
    resolver: zodResolver(listingFormSchema),
    defaultValues: initialValues,
    shouldUnregister: true
  });
  const categoryId = watch("category_id") || categories[0]?.id || "";
  const priceType = watch("price_type") ?? "fixed";
  const watchedValues = watch() as Record<string, unknown>;
  const selectedCategory = useMemo(
    () => categoryOptions.find((item) => item.id === categoryId),
    [categoryOptions, categoryId]
  );
  const selectedCategoryPath = useMemo(() => {
    if (!selectedCategory) return "";
    const parent = categories.find((category) => category.id === selectedCategory.parent_id);
    return parent ? `${parent.name_sr} › ${selectedCategory.name_sr}` : selectedCategory.name_sr;
  }, [categories, selectedCategory]);
  const draftIdRef = useRef<string | null>(resumeDraft?.id ?? null);
  const draftVersionRef = useRef(resumeDraft?.draft_version ?? 0);
  const clientDraftIdRef = useRef("");
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savePromiseRef = useRef<Promise<string | null> | null>(null);
  const pendingSaveRef = useRef(false);
  const unsavedRef = useRef(false);
  const hydratingRef = useRef(false);

  const visibleAttributes = selectedCategory?.attributes.filter(
    (attribute) => conditionMatches(watchedValues, attribute.validation.visible_when)
  ) ?? [];
  const requiredAttributes = visibleAttributes.filter((attribute) => {
    const conditionallyRequired = conditionMatches(
      watchedValues,
      attribute.validation.required_when
    );
    return attribute.required || (
      Boolean(attribute.validation.required_when) && conditionallyRequired
    );
  });
  const priceComplete = !["fixed", "negotiable"].includes(String(priceType))
    || Number(watchedValues.price_amount) > 0;
  const basicComplete = String(watchedValues.title ?? "").trim().length >= 8
    && String(watchedValues.description ?? "").trim().length >= 20
    && String(watchedValues.city ?? "").trim().length >= 2
    && hasFormValue(watchedValues.condition)
    && priceComplete;
  const detailsComplete = requiredAttributes.every((attribute) =>
    hasAttributeValue(attribute.field_type, watchedValues[`attr_${attribute.key}`])
  );
  const formErrors = formState.errors as Record<string, unknown>;
  const sections: ListingFormSection[] = [
    {
      id: formSectionIds.category,
      label: "Kategorija",
      complete: hasFormValue(categoryId),
      hasError: Boolean(formErrors.category_id)
    },
    {
      id: formSectionIds.basics,
      label: "Podaci",
      complete: basicComplete,
      hasError: ["title", "description", "condition", "city", "price_type", "price_amount", "currency"]
        .some((field) => Boolean(formErrors[field]))
    },
    {
      id: formSectionIds.details,
      label: "Detalji",
      complete: detailsComplete,
      hasError: Object.keys(formErrors).some((field) => field.startsWith("attr_"))
    },
    {
      id: formSectionIds.handoff,
      label: "Preuzimanje",
      complete: hasFormValue(watchedValues.delivery_methods),
      hasError: Boolean(formErrors.delivery_note)
    },
    {
      id: formSectionIds.images,
      label: "Slike",
      complete: draftImages.length > 0,
      hasError: false
    }
  ];
  const currentSectionData = sections.find((section) => section.id === currentSection) ?? sections[0];
  const stickySaveLabel = saveState === "saving"
    ? "Čuvanje…"
    : saveState === "saved"
      ? "Sačuvano"
      : saveState === "offline"
        ? "Nema interneta"
        : saveState === "conflict"
          ? "Sukob izmena"
          : saveState === "error"
            ? "Nije sačuvano"
            : "Nacrt nije još sačuvan";

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
    const subscription = watch((_values, event) => {
      if (event.type !== "change" || !event.name) return;
      setValidationIssues((current) => current.filter((issue) => issue.field !== event.name));
      if (event.name.startsWith("attr_")) clearErrors(event.name);
    });
    return () => subscription.unsubscribe();
  }, [clearErrors, watch]);

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

  useEffect(() => {
    const elements = Object.values(formSectionIds)
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => Boolean(element));
    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((left, right) => left.boundingClientRect.top - right.boundingClientRect.top);
      if (visible[0]) setCurrentSection(visible[0].target.id);
    }, { rootMargin: "-20% 0px -65% 0px", threshold: 0 });
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  function navigateToSection(sectionId: string, fieldId?: string) {
    setCurrentSection(sectionId);
    const section = document.getElementById(sectionId);
    section?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => {
      const target = fieldId ? document.getElementById(fieldId) : section;
      target?.focus({ preventScroll: true });
    }, 250);
  }

  function validationSection(field: string) {
    if (field === "category_id") return formSectionIds.category;
    if (field.startsWith("attr_")) return formSectionIds.details;
    if (["delivery_methods", "delivery_note", "allow_messages", "phone_visible"].includes(field)) {
      return formSectionIds.handoff;
    }
    return formSectionIds.basics;
  }

  function handleInvalid(errors: FieldErrors<ListingFormInput>) {
    const orderedFields = [
      "category_id",
      "title",
      "description",
      "condition",
      "city",
      "price_type",
      "price_amount",
      "currency",
      "delivery_note"
    ];
    const errorRecord = errors as Record<string, unknown>;
    const issues = orderedFields.flatMap((field) => {
      const message = errorMessage(errorRecord[field]);
      return message ? [{ field, sectionId: validationSection(field), message }] : [];
    });
    setValidationIssues(issues);
    if (issues[0]) navigateToSection(issues[0].sectionId, issues[0].field);
  }

  function missingAttributeIssues(data: Record<string, unknown>) {
    return requiredAttributes.flatMap((attribute) => {
      const field = `attr_${attribute.key}`;
      return hasAttributeValue(attribute.field_type, data[field]) ? [] : [{
        field,
        sectionId: formSectionIds.details,
        message: `Popunite polje „${attribute.label_sr}”.`
      }];
    });
  }

  async function onSubmit(data: ListingFormOutput) {
    setMessage(null);
    const attributeIssues = missingAttributeIssues(data as Record<string, unknown>);
    if (attributeIssues.length) {
      attributeIssues.forEach((issue) => {
        setError(issue.field, { type: "required", message: issue.message });
      });
      setValidationIssues(attributeIssues);
      navigateToSection(attributeIssues[0].sectionId, attributeIssues[0].field);
      return;
    }
    setValidationIssues([]);
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
    <form
      onSubmit={handleSubmit(onSubmit, handleInvalid)}
      noValidate
      className="space-y-6 pb-28 md:pb-0"
    >
      <ListingFormProgress
        sections={sections}
        currentSection={currentSection}
        onNavigate={navigateToSection}
      />
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
            {saveState === "saving" ? <SpinnerIcon className="motion-safe:animate-spin" size={18} /> : null}
            {saveState === "saved" ? <SaveIcon size={18} /> : null}
            {saveState === "offline" ? <CloudOfflineIcon size={18} /> : null}
            {saveState === "error" || saveState === "conflict" ? <AlertIcon size={18} /> : null}
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
      {validationIssues.length ? (
        <Alert tone="error" title="Proverite podatke pre slanja">
          <p>Otvorite prvo polje koje treba dopuniti.</p>
          <ul className="mt-2 space-y-1">
            {validationIssues.map((issue) => (
              <li key={issue.field}>
                <button
                  type="button"
                  className="focus-ring rounded font-bold underline underline-offset-2"
                  onClick={() => navigateToSection(issue.sectionId, issue.field)}
                >
                  {issue.message}
                </button>
              </li>
            ))}
          </ul>
        </Alert>
      ) : null}
      <section
        id={formSectionIds.category}
        tabIndex={-1}
        className="scroll-mt-24 rounded-lg border border-slate-200 bg-white p-5 shadow-soft"
      >
        <h2 className="text-xl font-black">1. Kategorija</h2>
        <div className="mt-4">
          <FieldLabel htmlFor="category_id">Kategorija</FieldLabel>
          <Select
            id="category_id"
            {...register("category_id")}
            disabled={isEdit}
            aria-describedby="category-selection-help"
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
          <p id="category-selection-help" className="mt-2 text-sm text-slate-600">
            {selectedCategoryPath
              ? `Izabrano: ${selectedCategoryPath}.`
              : "Izaberite kategoriju koja najbolje opisuje opremu."}
            {selectedCategory?.children.length
              ? " Uža potkategorija pomaže kupcima da lakše pronađu oglas."
              : null}
          </p>
          <p className="mt-1 text-sm text-red-600">{formState.errors.category_id?.message}</p>
        </div>
      </section>

      <section
        id={formSectionIds.basics}
        tabIndex={-1}
        className="scroll-mt-24 rounded-lg border border-slate-200 bg-white p-5 shadow-soft"
      >
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
            <FieldLabel htmlFor="price_type">Tip cene</FieldLabel>
            <Select id="price_type" {...register("price_type")}>
              {priceTypeOptions.map(({ value, label }) => (
                <option value={value} key={value}>{label}</option>
              ))}
            </Select>
          </div>
          {priceType === "fixed" || priceType === "negotiable" ? (
            <>
              <div>
                <FieldLabel htmlFor="price_amount">Cena</FieldLabel>
                <Input id="price_amount" type="number" min="0.01" step="0.01" {...register("price_amount")} />
                <p className="mt-1 text-sm text-red-600">{formState.errors.price_amount?.message}</p>
              </div>
              <div>
                <FieldLabel htmlFor="currency">Valuta</FieldLabel>
                <Select id="currency" {...register("currency")}>
                  <option value="RSD">RSD</option>
                  <option value="EUR">EUR</option>
                </Select>
              </div>
            </>
          ) : (
            <Alert tone="info" className="self-end">
              Za opciju „{priceType === "free" ? "Poklanjam" : "Na upit"}” iznos se ne unosi.
            </Alert>
          )}
        </div>
      </section>

      <section
        id={formSectionIds.details}
        tabIndex={-1}
        className="scroll-mt-24 rounded-lg border border-slate-200 bg-white p-5 shadow-soft"
      >
        <h2 className="text-xl font-black">3. Specifični detalji</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {visibleAttributes.map((attribute) => {
            const conditionallyRequired = conditionMatches(
              watchedValues,
              attribute.validation.required_when
            );
            const required = attribute.required || (
              Boolean(attribute.validation.required_when) && conditionallyRequired
            );
            const fieldName = `attr_${attribute.key}`;
            const attributeError = errorMessage(formErrors[fieldName]);
            return (
            <div key={attribute.id}>
              {attribute.field_type === "multi_enum" ? (
                <fieldset aria-describedby={attributeError ? `${fieldName}-error` : undefined}>
                  <legend className="text-sm font-bold text-ink-800">
                    {attribute.label_sr}{attribute.unit ? ` (${attribute.unit})` : ""}{required ? " *" : ""}
                  </legend>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {attribute.options.options?.map((option, index) => (
                      <label
                        key={option.value}
                        className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-sand-200 px-3 py-2 text-sm hover:border-river-300 hover:bg-river-50"
                      >
                        <input
                          id={index === 0 ? fieldName : `${fieldName}-${index}`}
                          type="checkbox"
                          value={option.value}
                          aria-invalid={attributeError ? true : undefined}
                          {...register(fieldName)}
                        />
                        {option.label_sr}
                      </label>
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">Izaberite sve opcije koje odgovaraju oglasu.</p>
                </fieldset>
              ) : (
                <>
                  <FieldLabel htmlFor={fieldName}>
                    {attribute.label_sr}{attribute.unit ? ` (${attribute.unit})` : ""}{required ? " *" : ""}
                  </FieldLabel>
                  {attribute.field_type === "enum" ? (
                <Select id={fieldName} aria-invalid={attributeError ? true : undefined} {...register(fieldName)}>
                  <option value="">Izaberite</option>
                  {attribute.options.options?.map((option) => (
                    <option value={option.value} key={option.value}>
                      {option.label_sr}
                    </option>
                  ))}
                </Select>
              ) : attribute.field_type === "boolean" ? (
                <Select id={fieldName} aria-invalid={attributeError ? true : undefined} {...register(fieldName)}>
                  <option value="">Nije navedeno</option>
                  <option value="true">Da</option>
                  <option value="false">Ne</option>
                </Select>
              ) : (
                <Input
                  id={fieldName}
                  type={attribute.field_type === "integer" || attribute.field_type === "decimal" ? "number" : "text"}
                  min={attribute.validation.min}
                  max={attribute.validation.max}
                  step={attribute.validation.step ?? (attribute.field_type === "integer" ? 1 : undefined)}
                  aria-invalid={attributeError ? true : undefined}
                  aria-describedby={attributeError ? `${fieldName}-error` : undefined}
                  {...register(fieldName)}
                />
              )}
                </>
              )}
              {attributeError ? (
                <p id={`${fieldName}-error`} className="mt-1 text-sm text-red-700">{attributeError}</p>
              ) : null}
            </div>
            );
          })}
        </div>
      </section>

      <section
        id={formSectionIds.handoff}
        tabIndex={-1}
        className="scroll-mt-24 rounded-lg border border-slate-200 bg-white p-5 shadow-soft"
      >
        <h2 className="text-xl font-black">4. Preuzimanje i kontakt</h2>
        <div className="mt-4 space-y-3">
          <fieldset>
            <legend className="text-sm font-semibold text-slate-800">Način preuzimanja ili dostave</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {deliveryMethodOptions.map(({ value, label }) => (
                <label key={value} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" value={value} {...register("delivery_methods")} />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
          <div>
            <FieldLabel htmlFor="delivery_note">Napomena o preuzimanju ili dostavi</FieldLabel>
            <Textarea
              id="delivery_note"
              {...register("delivery_note")}
              placeholder="Na primer: lično preuzimanje radnim danima posle 17h."
            />
            <p className="mt-1 text-sm text-red-600">{formState.errors.delivery_note?.message}</p>
          </div>
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
        sectionId={formSectionIds.images}
        listingId={isEdit ? listingId : draftId ?? undefined}
        initialImages={draftImages}
        ensureListingId={isEdit ? undefined : () => persistDraft(true)}
        onImagesChange={handleImagesChange}
      />
      {!isEdit ? (
        <ListingQualityChecklist
          values={watchedValues}
          category={selectedCategory}
          images={draftImages}
        />
      ) : null}
      {message ? <Alert tone="error">{message}</Alert> : null}
      {challengeRequired ? (
        <TurnstileChallenge key={challengeKey} onToken={setChallengeToken} />
      ) : null}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-sand-200 bg-white/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(15,23,42,0.10)] backdrop-blur md:static md:rounded-xl md:border md:p-4 md:shadow-soft">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-ink">
              {sections.findIndex((section) => section.id === currentSectionData.id) + 1}. {currentSectionData.label}
            </p>
            <p className="text-xs text-slate-600">
              {!isEdit ? `${stickySaveLabel} · ` : ""}
              {currentSectionData.complete ? "korak je popunjen" : "korak treba dopuniti"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {!isEdit ? (
              <Button
                type="button"
                variant="secondary"
                className="px-3"
                aria-label="Sačuvaj nacrt"
                title="Sačuvaj nacrt"
                disabled={saveState === "saving"}
                onClick={() => void persistDraft(true)}
              >
                <SaveIcon size={18} /> <span className="hidden sm:inline">Sačuvaj nacrt</span>
              </Button>
            ) : null}
            <Button type="submit" disabled={formState.isSubmitting} className="whitespace-nowrap px-3 sm:px-4">
              {submitLabel}
            </Button>
          </div>
        </div>
      </div>
      {isEdit ? (
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
          <h2 className="text-xl font-black">Akcije oglasa</h2>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Button type="button" variant="secondary" onClick={() => runOwnerAction("mark-sold")}>
              <SuccessIcon size={18} /> Označi kao prodato
            </Button>
            <Button type="button" variant="danger" onClick={() => runOwnerAction("archive")}>
              <ArchiveIcon size={18} /> Arhiviraj oglas
            </Button>
          </div>
          {actionMessage ? <Alert tone="error" className="mt-3">{actionMessage}</Alert> : null}
        </section>
      ) : null}
    </form>
  );
}
