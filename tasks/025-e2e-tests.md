# 025 — E2E testovi (Playwright) i pokrivenost backenda

Status: todo
Prioritet: P3

## Problem

Backend ima 18 testova, ali poruke, moderacija, ocene, prijave, favoriti i worker taskovi (sem dela emaila) su nepokriveni. Frontend nema nijedan test — nema Playwright/Cypress setupa, pa svaka regresija u ključnim tokovima (registracija → oglas → poruka → ocena) prolazi neprimećeno.

## Šta uraditi

- [ ] Playwright setup u `frontend/` (chromium, `webServer` konfiguracija koja diže backend + frontend na test portovima, izolovana SQLite baza)
- [ ] E2E smoke tok: registracija → verifikacija (link iz log fallbacka) → postavi oglas → drugi korisnik šalje poruku → prodavac odgovara → mark sold → ocena
- [ ] E2E: pretraga + filteri + paginacija; favoriti toggle
- [ ] Backend testovi: message_service (slanje, unread counts, autorizacija), moderation_service (approve/reject/suspend + audit log), favorites, reports
- [ ] CI: dodaj Playwright job (`.github/workflows/ci.yml`), cache browsera; pytest sa `--cov` i pragom (npr. 60% za početak)

## Kriterijumi prihvatanja

- `pnpm exec playwright test` zeleno lokalno i u CI
- Backend coverage prag u CI ne pušta pad ispod dogovorenog procenta
- CI ukupno ispod ~10 min

## Fajlovi

- `frontend/` (novi `playwright.config.ts`, `e2e/`)
- `backend/app/tests/` (novi integration testovi)
- `.github/workflows/ci.yml`
