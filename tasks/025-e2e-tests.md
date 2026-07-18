# 025 — E2E testovi (Playwright) i pokrivenost backenda

Status: done
Prioritet: P3

## Problem

Backend ima 18 testova, ali poruke, moderacija, ocene, prijave, favoriti i worker taskovi (sem dela emaila) su nepokriveni. Frontend nema nijedan test — nema Playwright/Cypress setupa, pa svaka regresija u ključnim tokovima (registracija → oglas → poruka → ocena) prolazi neprimećeno.

## Šta uraditi

- [x] Playwright setup u `frontend/` (chromium, `webServer` konfiguracija koja diže backend + frontend na test portovima, izolovana SQLite baza)
- [x] E2E smoke tok: registracija → verifikacija (link iz log fallbacka) → postavi oglas → drugi korisnik šalje poruku → prodavac odgovara → mark sold → ocena
- [x] E2E: pretraga + filteri + paginacija; favoriti toggle
- [x] Backend testovi: message_service (slanje, unread counts, autorizacija), moderation_service (approve/reject/suspend + audit log), favorites, reports
- [x] CI: dodaj Playwright job (`.github/workflows/ci.yml`), cache browsera; pytest sa `--cov` i pragom (npr. 60% za početak)

## Kriterijumi prihvatanja

- `pnpm exec playwright test` zeleno lokalno i u CI
- Backend coverage prag u CI ne pušta pad ispod dogovorenog procenta
- CI ukupno ispod ~10 min

## Fajlovi

- `frontend/` (novi `playwright.config.ts`, `e2e/`)
- `backend/app/tests/` (novi integration testovi)
- `.github/workflows/ci.yml`

## Follow-up correction (2026-07-18)

The original completion record overstated the Playwright coverage. Task 025 delivered
the Playwright setup, basic page smoke checks, filter URL coverage, backend service
tests, and CI integration; it did not yet enforce the complete registration-to-sale
browser journey listed above. The full journey, deterministic test adapters, manual
moderation, release repetitions, failure artifacts, and post-deployment smoke command
are implemented and tracked by [task 048](048-critical-marketplace-e2e.md).
