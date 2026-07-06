# 020 — Observability: Sentry, logovi, health check

Status: done
Prioritet: P2

## Problem

Kada nešto pukne u produkciji, nema načina da se sazna:

1. Globalni exception handler u `main.py` vraća generički 500 i **ne loguje traceback uopšte**
2. Nema Sentry-ja ni na backendu ni na frontendu
3. Logging je goli `basicConfig` — `extra={...}` polja iz workera se ne renderuju
4. `/health` je statički `{"status":"ok"}` — ne proverava ni bazu ni Redis; worker nema nikakav health signal

## Šta uraditi

- [x] `main.py`: u exception handleru loguj pun traceback (`logger.exception`) pre vraćanja 500
- [x] Sentry backend: `sentry-sdk[fastapi]`, init samo kad je `SENTRY_DSN` podešen; uhvati i worker (init u `worker.py`)
- [x] Sentry frontend: `@sentry/nextjs` (ili minimalno `global-error.tsx` + ručni report), isto uslovno na env var
- [x] Strukturiran logging: JSON format u produkciji (npr. `python-json-logger`), plain u dev; `extra` polja vidljiva
- [x] `/health`: proveri DB (`SELECT 1`) i Redis ping; odvoji `/health/live` (statički) od `/health/ready`
- [x] Worker: upisuj heartbeat (timestamp u Redis) posle svakog ciklusa; `/health/ready` upozorava ako je heartbeat stariji od 5 min
- [x] `.env.example` + `docs/deployment.md`: dokumentuj `SENTRY_DSN`

## Kriterijumi prihvatanja

- Bačen izuzetak u endpointu završava u logu sa punim traceback-om (i u Sentry kad je DSN podešen)
- `/health/ready` pada kada je baza nedostupna
- Worker koji stoji > 5 min vidljiv preko health endpointa

## Fajlovi

- `backend/app/main.py:51-63`
- `backend/app/core/logging.py`
- `backend/app/tasks/worker.py`
- `frontend/src/app/error.tsx` (+ novi `global-error.tsx`)
