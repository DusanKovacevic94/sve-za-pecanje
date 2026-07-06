# 005 — Nalog: profil i ocene stranice

Status: done
Prioritet: P1

## Problem

- `/nalog/profil` je stub — backend `PATCH /users/me/profile` postoji (display name, grad, bio, telefon...)
- `/nalog/ocene` je stub — backend `POST /reviews` postoji, prikaz ocena ide preko javnog profila prodavca

## Šta uraditi

- [x] `/nalog/profil`: forma (RHF + zod) koja učitava trenutni profil i šalje `PATCH /users/me/profile`
- [x] Backend: proveri da li postoji `GET` za sopstveni puni profil (ako ne, dodaj ili proširi `/auth/me`)
- [x] `/nalog/ocene`: prikaži primljene ocene (i date, tab/sekcija); backend endpoint za listanje ocena po korisniku verovatno treba dodati (`GET /users/me/reviews` ili reuse javnog profila)
- [x] Ostavljanje ocene: posle kupovine (oglas `sold`), forma/dugme na detalju oglasa ili u razgovoru — `POST /reviews` traži da je korisnik učesnik prodaje (`sold_to_user_id`)
- [x] Proveri kako se `sold_to_user_id` uopšte postavlja pri `mark-sold` — ako ne postoji način da prodavac izabere kupca, ocene su praktično nedostižne; dodaj izbor kupca (iz razgovora) pri označavanju kao prodato

## Kriterijumi prihvatanja

- Korisnik izmeni display name/grad/bio i vidi promene na javnom profilu
- Prodaja → kupac ostavi ocenu → ocena se vidi na `/nalog/ocene` i na javnom profilu prodavca (rating agregat)

## Fajlovi

- `frontend/src/app/nalog/profil/page.tsx`, `frontend/src/app/nalog/ocene/page.tsx` (stubovi)
- `backend/app/api/v1/users.py` (PATCH profil postoji), `backend/app/api/v1/reviews.py`
- `backend/app/api/v1/listings.py` (mark-sold — postavljanje kupca)
