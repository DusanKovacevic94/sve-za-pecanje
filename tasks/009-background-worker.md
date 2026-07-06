# 009 — Background worker: digesti, istek oglasa, async email

Status: done
Prioritet: P2

## Problem

`backend/app/tasks/worker.py` samo spava u petlji; `email_tasks.py`, `image_tasks.py`, `saved_search_tasks.py` su prazni stubovi. Posledice:

- Sačuvane pretrage nikad ne šalju obaveštenja (obećano u UI: "da vas obavestimo kada se pojavi novi oglas")
- `listings.expires_at` postoji ali se nikad ne postavlja/ne sprovodi — oglasi žive večno
- `featured_until` se nikad ne čisti — istaknuti oglasi ostaju istaknuti
- Slanje emaila blokira HTTP request (Resend poziv je u request putanji)

## Šta uraditi

- [x] Odluči mehanizam: jednostavan scheduler loop u postojećem worker kontejneru (dovoljno za MVP) ili RQ/arq preko Redis-a
- [x] Saved-search digest: periodično (npr. na 15 min) nađi nove oglase koji odgovaraju sačuvanim pretragama i pošalji email (reuse `search_service` matching + `send_email`); zapamti last-run watermark da nema duplikata
- [x] Istek oglasa: postavi `expires_at` pri objavi (npr. +60 dana), worker arhivira isteklo i (opciono) šalje email "produžite oglas"
- [x] Čišćenje `featured_until < now` → `is_featured = false`
- [x] Email queue: `send_email` iz request putanje prebaci u worker (u bazu upiši outbox red ili koristi RQ job); zadrži sync slanje kao fallback u dev-u
- [x] Worker health: loguj svaki ciklus, hvataj izuzetke po tasku da jedan pad ne obori petlju

## Kriterijumi prihvatanja

- Novi oglas koji odgovara sačuvanoj pretrazi → email stiže u sledećem ciklusu, tačno jednom
- Oglas sa prošlim `expires_at` postaje `archived` bez ručne intervencije
- Registracija ne čeka na Resend HTTP poziv

## Fajlovi

- `backend/app/tasks/worker.py`, `backend/app/tasks/*.py` (stubovi)
- `backend/app/services/search_service.py`, `backend/app/core/email.py`
- `docker-compose.yml` (worker servis već postoji)
