# 023 — UX polish: loading states, mobilna navigacija, pristupačnost

Status: done
Prioritet: P2

## Problem

1. Ne postoji nijedan `loading.tsx` niti `Suspense` — svaka stranica blokira na server fetch bez ikakvog vizuelnog signala
2. Mobilna navigacija ne prikazuje "Poruke" ni "Bezbednost" (desktop-only linkovi)
3. Forme ne povezuju greške sa inputima (`aria-invalid`/`aria-describedby` nedostaju u `Field.tsx`)
4. Nema skip-linka; nema `global-error.tsx` (greška u root layoutu = beli ekran)

## Šta uraditi

- [x] `loading.tsx` sa skeleton UI za ključne rute: `/oglasi`, `/oglasi/[slug]`, `/nalog/poruke`, `/nalog/omiljeni`, početna
- [x] Mobilni red u `Header.tsx` — dodaj "Poruke" (sa bedžom iz taska 018) i po potrebi hamburger za ostalo
- [x] `Field.tsx`: `aria-invalid` + `aria-describedby` ka poruci o grešci; poruka dobija `id`
- [x] Skip-link ("Preskoči na sadržaj") + `id="sadrzaj"` na `<main>`
- [x] `global-error.tsx` (root error boundary)
- [x] `viewport`/`themeColor` export u `layout.tsx` (brand boja za mobilni browser chrome)

## Kriterijumi prihvatanja

- Spora konekcija: prelaz na /oglasi odmah pokazuje skeleton
- Sve glavne sekcije dostupne sa telefona
- Greška forme se čita screen readerom uz pripadajući input
- `pnpm build` čist

## Fajlovi

- `frontend/src/app/**/loading.tsx` (novi fajlovi)
- `frontend/src/components/layout/Header.tsx:19,33,51-61`
- `frontend/src/components/ui/Field.tsx`
- `frontend/src/app/layout.tsx:25-35`

## Zavisnosti

- 018 (bedž za poruke) — zbog mobilnog linka "Poruke"
