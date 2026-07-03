# 007 — Auth hardening

Status: todo
Prioritet: P2

## Problem

1. **JWT važi 7 dana i ne može se opozvati** — logout samo briše kolačić; ukraden token radi do isteka. Nema server-side sesija ni refresh tokena.
2. **`phone_number_encrypted` čuva čist tekst** — `backend/app/models/profile.py` ima kolonu čije ime obećava enkripciju, a `users.py` upisuje sirov broj telefona.
3. **Nema ponovnog slanja verifikacionog emaila** — ako email zaluta, korisnik nema izlaz (token postoji samo do prve registracije).
4. Verifikacioni/reset tokeni se čuvaju kao čist tekst u bazi i nemaju rok trajanja.

## Šta uraditi

- [ ] Skrati access token (npr. 30–60 min) + refresh token u posebnom HttpOnly kolačiću sa rotacijom; ili server-side sesije u Redis-u (jednostavnije za opoziv — Redis već postoji u compose-u)
- [ ] Logout tada zaista poništava sesiju/refresh token
- [ ] Telefon: ili zaista enkriptuj (npr. Fernet sa `SECRET_KEY`) ili preimenuj kolonu u `phone_number` da ne laže (zahteva migraciju — vidi task 006)
- [ ] Endpoint `POST /auth/resend-verification` (rate-limited, radi samo za neverifikovane naloge) + dugme na frontendu posle registracije/prijave
- [ ] Verifikacioni i reset tokeni: dodaj `expires_at` (npr. 24h / 1h) i heširaj ih u bazi (sha256 je dovoljan)

## Kriterijumi prihvatanja

- Logout poništava sesiju odmah (stari token/kolačić ne prolazi)
- Reset token stariji od roka se odbija
- Korisnik može ponovo da zatraži verifikacioni email

## Fajlovi

- `backend/app/core/security.py`, `backend/app/api/v1/deps.py`, `backend/app/api/v1/auth.py`
- `backend/app/services/auth_service.py`
- `backend/app/models/user.py`, `backend/app/models/profile.py`, `backend/app/api/v1/users.py`
