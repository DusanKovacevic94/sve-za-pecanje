# 038 — Kartično plaćanje za promocije i pretplate

Status: todo
Prioritet: P3

## Problem

Ručna uplata (poziv na broj + admin potvrda) je dobar start, ali gubi impulsivne kupovine —
bump od ~120 RSD niko neće plaćati odlaskom u e-banking. Stripe nije dostupan u Srbiji, pa
treba lokalni PSP. Vidi `docs/business-model.md`, stream 4.

## Šta uraditi

- [ ] Istraži i izaberi PSP: ChipCard, AllSecure, NestPay (banke), Payspot — kriterijumi: fiksni + procentualni trošak po transakciji, mesečna naknada, kvalitet API/webhook dokumentacije, vreme onboardinga; odluku i poređenje zapiši u `docs/business-model.md`
- [ ] Backend: `PaymentService` sa provider interfejsom (da PSP bude zamenljiv); tok: kreiraj porudžbinu → redirect/widget PSP-a → webhook potvrda → ista aktivaciona logika kao admin potvrda iz 027/036
- [ ] Webhook: idempotentan (ponovljeni event ne aktivira duplo), verifikacija potpisa, log svih eventova
- [ ] Frontend: "Plati karticom" pored postojeće opcije uplatnice; status stranica posle povratka sa PSP-a (uspeh/neuspeh/na čekanju)
- [ ] Fiskalizacija/računi: proveri obaveze za online naplatu usluga (eFiskalizacija, izdavanje računa) — konsultuj knjigovođu pre puštanja; minimalno automatski email sa specifikacijom plaćanja
- [ ] Ručna uplata ostaje kao fallback opcija
- [ ] Test mode PSP-a u dev okruženju; E2E test toka sa mock providerom

## Kriterijumi prihvatanja

- Kupovina bumpa karticom → oglas promovisan bez ikakve admin akcije
- Duplirani webhook ne pravi duplu aktivaciju ni dupli email
- Neuspešno plaćanje jasno prikazano, porudžbina ostaje `pending`

## Fajlovi

- `backend/app/services/` (payment_service — novo), `backend/app/api/v1/` (webhook ruta)
- `backend/app/core/config.py` (PSP kredencijali)
- `frontend/src/app/nalog/` (tok plaćanja)
- `docs/business-model.md` (PSP odluka)

## Zavisnosti

- 036 (generalizovane porudžbine), 037 (pretplate — naplata istim tokom)
