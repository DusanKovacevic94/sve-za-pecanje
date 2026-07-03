# 013 — CI, ESLint i pokrivenost testovima

Status: todo
Prioritet: P3

## Problem

- Nema CI — ruff/pytest/tsc se pokreću samo ručno
- ESLint nije konfigurisan (`pnpm lint` nudi setup wizard)
- Testova je malo (10): nema testova za authz (da ne-vlasnik ne može PATCH tuđeg oglasa), filtere pretrage, moderaciju, poruke, rate limit
- Integracioni test gađa `dev.db` umesto izolovane test baze

## Šta uraditi

- [ ] GitHub Actions workflow: backend (uv sync, ruff, pytest) + frontend (pnpm install, tsc, next build, lint) na svaki push/PR
- [ ] ESLint setup: `next/core-web-vitals` config, popravi ono što prijavi
- [ ] Test fixtures: pytest fixture sa in-memory SQLite (ili tmp fajl) + `TestClient`, factory helperi za usera/oglas
- [ ] Prioritetni testovi:
  - [ ] authz: PATCH/DELETE tuđeg oglasa → 403/404; ne-admin na `/admin/*` → 403
  - [ ] listing filteri: kategorija, cena min/max, stanje, atributi
  - [ ] auth flow: register → verify → login → forgot → reset (sa mock emailom)
  - [ ] poruke: samo učesnici razgovora vide poruke
  - [ ] review: samo učesnici prodaje, dupla ocena → 409
- [ ] (Opciono) alembic drift check iz taska 006

## Kriterijumi prihvatanja

- PR sa greškom u tipovima ili palim testom ne prolazi CI
- `pytest` ne dira `dev.db`
- Pokrivenost kritičnih authz putanja testovima

## Fajlovi

- `.github/workflows/ci.yml` (novo)
- `frontend/.eslintrc`/`eslint.config.mjs` (novo)
- `backend/app/tests/` (fixtures + novi testovi)
