# 028 — Notifikacije: email za novu poruku + in-app

Status: done
Prioritet: P3

## Problem

`NotificationService` je prazan stub koji nigde nije povezan. Korisnik koji nije na sajtu nikad ne sazna da je dobio poruku, da mu je oglas odobren/odbijen (email postoji samo za moderaciju), ili da mu je oglas pred istekom. Bedž iz taska 018 pokriva samo aktivne korisnike.

## Šta uraditi

- [x] Worker task: email "Imate novu poruku" — batching (ne mail po poruci: šalji tek ako je poruka nepročitana ≥ N minuta i nije poslat mail za taj razgovor u zadnjih X sati), kroz postojeći outbox
- [x] Email podsetnik "Oglas vam ističe za 3 dana" sa linkom za produženje (proveri postoji li produženje — ako ne, dodaj `POST /listings/{id}/renew`)
- [x] Podešavanja notifikacija na `/nalog/profil`: opt-out po tipu (poruke, digesti, istek) — kolone na User/Profile modelu + poštovanje u svim taskovima
- [x] Link za odjavu u footeru emaila (token, bez logina)
- [x] Odluči: in-app notifikacioni feed (tabela + zvonce u headeru) — implementiraj ili izbriši `NotificationService` stub da ne stoji mrtav kod

## Kriterijumi prihvatanja

- Nepročitana poruka posle N minuta → tačno jedan email, ne spam
- Opt-out se poštuje u svim email tokovima
- Odjava radi bez logina

## Fajlovi

- `backend/app/services/notification_service.py:1-5` (stub)
- `backend/app/tasks/` (novi task), `backend/app/tasks/worker.py:26-32`
- `backend/app/models/user.py` ili `profile.py` (preference)
- `frontend/src/app/nalog/profil/page.tsx`

## Zavisnosti

- 018 (unread infrastruktura), 019 (pouzdan outbox)
