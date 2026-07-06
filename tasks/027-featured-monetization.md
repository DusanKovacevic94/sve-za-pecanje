# 027 — Isticanje oglasa: self-serve tok (monetizacija)

Status: todo
Prioritet: P3

## Problem

Isticanje oglasa (`is_featured` + `featured_until`) postoji i utiče na sortiranje, ali ga može dodeliti samo admin ručno. Nema nikakvog puta da korisnik sam plati i istakne oglas — jedina monetizaciona poluga je potpuno ručna.

## Šta uraditi

- [ ] Odluči model plaćanja za start (preporuka za Srbiju: prva faza **ručna uplata** — korisnik pošalje zahtev, admin potvrdi po uplati na račun; kartice/provajder u drugoj fazi)
- [ ] Model `FeatureRequest` (ili `Order`): listing, korisnik, paket (7/14/30 dana), cena, status (`pending` / `paid` / `rejected`), migracija
- [ ] Backend: `POST /listings/{id}/feature-request` (samo vlasnik, samo aktivan oglas), admin endpoint za potvrdu (postavlja `featured_until`) — reuse postojeći feature mehanizam
- [ ] Frontend: dugme "Istakni oglas" na `/nalog/oglasi` + stranica sa paketima, cenama i instrukcijama za uplatu (poziv na broj = ID zahteva)
- [ ] Admin: lista zahteva sa potvrdi/odbij
- [ ] Email potvrda korisniku kad isticanje krene (kroz postojeći outbox)
- [ ] Druga faza (poseban task kad dođe vreme): kartično plaćanje (Stripe nije dostupan u RS — istražiti lokalne: ChipCard, AllSecure, NestPay banke)

## Kriterijumi prihvatanja

- Korisnik može da pošalje zahtev i vidi njegov status
- Admin potvrda odmah ističe oglas na dogovoreni period
- Postojeći worker cleanup (`featured_until`) i dalje gasi isteklo isticanje

## Fajlovi

- `backend/app/models/` (novi model), `backend/db/migrations/versions/`
- `backend/app/api/v1/listings.py`, `admin.py`
- `frontend/src/app/nalog/oglasi/`, `frontend/src/app/admin/istaknuto/page.tsx`
