# 026 — Web analitika (privacy-friendly)

Status: todo
Prioritet: P3

## Problem

Nema nikakve analitike — posle launcha nećemo znati koliko ljudi dolazi, odakle, ni koje stranice/kategorije rade. Interni view_count meri samo preglede oglasa, ne i ponašanje sajta.

## Šta uraditi

- [ ] Izaberi alat: Plausible ili Umami (self-host na istom VPS-u kroz compose, bez cookie bannera) — preporuka: Umami (besplatan self-host)
- [ ] Compose servis + Caddy ruta (subdomen `stats.svezapecanje.rs` ili putanja)
- [ ] Skripta u `layout.tsx` — uslovno na env var (`NEXT_PUBLIC_ANALYTICS_URL`), ne učitavati u dev
- [ ] Custom eventi za ključne konverzije: registracija, postavljen oglas, poslata poruka, sačuvana pretraga
- [ ] `privatnost` stranica: dopuni odeljak o analitici (bez ličnih podataka, bez cookieja)

## Kriterijumi prihvatanja

- Poseta u produkciji vidljiva u dashboardu; dev ne šalje ništa
- Custom eventi stižu
- Nema cookie consent obaveze (potvrdi da izabrani alat ne koristi cookije)

## Fajlovi

- `docker-compose.prod.yml`, `ops/caddy/Caddyfile`
- `frontend/src/app/layout.tsx`
- `frontend/src/app/privatnost/page.tsx`
