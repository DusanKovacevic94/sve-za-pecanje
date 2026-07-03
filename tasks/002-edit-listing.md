# 002 — Izmena oglasa (edit listing)

Status: done
Prioritet: P1

## Problem

`frontend/src/app/izmeni-oglas/[id]/page.tsx` je stub koji samo ispisuje ime backend endpointa. Backend `PATCH /listings/{listing_id}` postoji i radi. Dugme "Izmeni oglas" na detalju oglasa (prikazuje se samo vlasniku) vodi na praznu stranicu.

## Šta uraditi

- [x] Napravi `EditListingForm` — najbolje refaktorisati `CreateListingForm` da prima `defaultValues` + mod (create/edit) umesto dupliranja
- [x] Stranica učitava postojeći oglas (`GET /listings/{slug}` vraća detalje; proveri da li treba GET po ID-u za vlasnika, uključujući oglase koji nisu aktivni)
- [x] Submit šalje `PATCH /listings/{id}` i redirektuje na detalj oglasa
- [x] Guard: samo vlasnik sme da vidi formu (server-side provera preko `getCurrentUser`, zavisi od taska 001)
- [x] Dodaj akcije za vlasnika: arhiviraj (`POST /{id}/archive`), označi kao prodato (`POST /{id}/mark-sold`) — endpointi već postoje
- [x] Usput popravi poznati problem u `CreateListingForm`: `FormData = Record<string, unknown>` i `resolver as never` gube zod tipove; `category_id` ima dupli izvor istine (RHF + useState)

## Kriterijumi prihvatanja

- Vlasnik menja naslov/cenu/opis/atribute i vidi izmene na detalju oglasa
- Ne-vlasnik dobija 403/redirect
- Arhiviranje i označavanje kao prodato rade sa `/nalog/oglasi` ili sa forme

## Fajlovi

- `frontend/src/app/izmeni-oglas/[id]/page.tsx` (stub)
- `frontend/src/components/forms/CreateListingForm.tsx` (osnova za refaktor)
- `backend/app/api/v1/listings.py` (PATCH, archive, mark-sold već postoje)
