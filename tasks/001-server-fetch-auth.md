# 001 — Popravi autentifikovane server-side fetch pozive

Status: done
Prioritet: P1 (bug)

## Problem

`apiFetch` u `frontend/src/lib/api.ts` koristi `credentials: "include"`, ali to radi samo u browseru. Kada se pozove iz server komponente (SSR), kolačić sesije se **ne prosleđuje** backendu. Posledica: `/nalog/oglasi` i `/nalog/poruke` uvek prikazuju prazno stanje čak i kada je korisnik ulogovan — API vraća 401/prazno, a `.catch(() => ({ data: [] }))` to proguta.

Jedino `getCurrentUser()` u `frontend/src/lib/auth.ts` ručno prosleđuje kolačiće — zato header i sidebar rade.

## Šta uraditi

- [x] Ne dirati client-safe `apiFetch`; koristi se iz client komponenti i ne sme direktno importovati `next/headers`
- [x] Alternativa ako import `next/headers` u deljeni modul pravi problem: napravi `serverApiFetch` u posebnom fajlu i koristi ga u server komponentama
- [x] Ukloni dupli fetch kod u `auth.ts` tako da i on koristi isti helper
- [x] Proveri sve pozive `apiFetch` u server komponentama koji zavise od sesije: `nalog/oglasi`, `nalog/poruke`, `nalog/sacuvane-pretrage`, admin stranice

## Kriterijumi prihvatanja

- Ulogovan korisnik na `/nalog/oglasi` vidi svoje oglase (SSR, bez klijentskog fetch-a)
- `/nalog/poruke` prikazuje razgovore ulogovanog korisnika
- Neulogovan korisnik i dalje dobija prazna/preusmerena stanja bez greške

## Fajlovi

- `frontend/src/lib/api.ts` (apiFetch)
- `frontend/src/lib/auth.ts` (postojeći primer prosleđivanja kolačića)
- `frontend/src/app/nalog/oglasi/page.tsx`, `frontend/src/app/nalog/poruke/page.tsx`
