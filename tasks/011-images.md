# 011 — Slike: galerija, upload zaštita, next/image

Status: todo
Prioritet: P2

## Problem

1. Detalj oglasa prikazuje samo `images[0]` — galerija ne postoji iako API vraća niz slika sa `sort_order`/`is_cover`
2. Upload čita ceo fajl u memoriju bez provere veličine pre `read()` (`storage.py`), a Pillow obrada + S3 upload blokiraju request thread
3. Frontend koristi `<img>` bez dimenzija → layout shift, bez optimizacije (`ListingCard`, detalj oglasa)
4. Nema UI za upravljanje slikama pri kreiranju/izmeni oglasa (redosled, cover, brisanje)?  — proveriti šta `POST /listings/{id}/images` podržava i šta forma trenutno radi

## Šta uraditi

- [ ] Galerija na detalju: glavna slika + thumbnails, poštuj `sort_order` i `is_cover` (može čisto CSS/klijentska komponenta, bez biblioteke)
- [ ] Pređi na `next/image` sa `width`/`height`/`sizes` (dodaj `remotePatterns` u `next.config.js` za S3/MinIO domen)
- [ ] Upload guard: odbij fajl veći od `MAX_IMAGE_SIZE_MB` pre učitavanja u memoriju (proveri `content-length` / čitaj u chunk-ovima), ograniči na `MAX_LISTING_IMAGES`
- [ ] Validiraj da je fajl zaista slika (Pillow verify) i normalizuj format (JPEG/WebP) + skini EXIF (privatnost: GPS koordinate!)
- [ ] UI za slike u formi oglasa: pregled, brisanje, izbor cover slike, redosled
- [ ] (Opciono, veže se na task 009) generisanje thumbnail varijanti u worker-u umesto u requestu

## Kriterijumi prihvatanja

- Oglas sa 5 slika ima upotrebljivu galeriju na detalju
- Upload od 50 MB biva odbijen sa jasnom porukom, bez OOM rizika
- Uploadovana slika nema EXIF GPS podatke
- Lighthouse ne prijavljuje CLS zbog slika na `/oglasi`

## Fajlovi

- `backend/app/core/storage.py`, `backend/app/services/image_service.py`, `backend/app/api/v1/listings.py` (images endpoint)
- `frontend/src/app/oglasi/[slug]/page.tsx`, `frontend/src/components/listings/ListingCard.tsx`
- `frontend/next.config.js`
