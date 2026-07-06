# 012 — SEO i performanse

Status: done
Prioritet: P3

## Problem

Za classifieds sajt organski saobraćaj je ključan, a trenutno:

- Sve stranice su force-dynamic (`cache: "no-store"` u `apiFetch`) — nema ISR/keširanja čak ni za kategorije i statične stranice
- Nema structured data (JSON-LD `Product`/`Offer`) na detalju oglasa
- Sitemap postoji, ali proveri da li uključuje sve oglase i kategorije sa `lastModified`
- Docker image frontenda kopira ceo `node_modules` — nema `output: "standalone"` u `next.config.js`
- Detalj oglasa povećava `view_count` + upisuje analytics red na svaki GET (vidi task 014) — kešira li se ikad, brojanje se kvari; rešiti zajedno

## Šta uraditi

- [x] Uvedi `revalidate` za polustatične podatke: kategorije (npr. 1h), detalj oglasa (npr. 60s) — `apiFetch` treba opcioni `next: { revalidate }` parametar umesto bezuslovnog `no-store`
- [x] JSON-LD na detalju oglasa: `Product` + `Offer` (cena, valuta, stanje, lokacija, slika)
- [x] `generateMetadata` OpenGraph slike za oglase (cover slika)
- [x] Kanonični URL-ovi i `metadataBase` u root layoutu
- [x] `output: "standalone"` u `next.config.js` + multi-stage Dockerfile (manji image, brži deploy)
- [x] Proveri sitemap: svi aktivni oglasi + kategorije, `lastModified` iz `updated_at`

## Kriterijumi prihvatanja

- Google Rich Results test prolazi za detalj oglasa
- `/kategorije` se služi iz keša (probaj sa ugašenim backendom u okviru revalidate prozora)
- Frontend Docker image znatno manji (standalone)

## Fajlovi

- `frontend/src/lib/api.ts`, `frontend/next.config.js`, `frontend/Dockerfile`
- `frontend/src/app/oglasi/[slug]/page.tsx`, `frontend/src/app/sitemap.xml/route.ts`, `frontend/src/app/layout.tsx`
