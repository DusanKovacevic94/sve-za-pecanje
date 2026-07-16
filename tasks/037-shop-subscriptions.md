# 037 — Prodavnice: pretplate za pecaroške radnje

Status: done
Prioritet: P2

## Problem

Pecaroške radnje i mali uvoznici su prirodni B2B kupci (predvidiv mesečni prihod, veći broj
oglasa), a sajt trenutno nema nikakav koncept prodavnice — svi su isti privatni korisnici.
Vidi `docs/business-model.md`, stream 3.

## Šta uraditi

- [x] Model: `shop` polja na User/Profile (ili poseban `Shop` model — odluči): naziv radnje, logo, opis, `shop_active_until`, PIB/matični broj za predračun
- [x] Pretplata: mesečni plan (predlog: 1.990 RSD/mes ili 19.900 RSD/god) — ručno fakturisanje za početak: zahtev iz UI → admin šalje predračun na email → admin potvrda aktivira `shop_active_until`
- [x] Benefiti u kodu: "Prodavnica" bedž na karticama i detalju oglasa, brendirana stranica prodavnice (logo + opis + svi oglasi, `/prodavnice/[slug]`), veći limit aktivnih oglasa, statistika po oglasu (pregledi/omiljeni/poruke — podaci već postoje)
- [x] Frontend: stranica "Za prodavnice" (landing sa benefitima i cenom) + zahtev za otvaranje; podešavanja prodavnice u nalogu
- [x] Admin: lista prodavnica, aktivacija/produženje/gašenje, audit log
- [x] Worker: podsetnik emailom 7 dana pre isteka pretplate; po isteku bedž i benefiti se gase, oglasi ostaju
- [x] Testovi: aktivacija/istek pretplate, limit oglasa

## Kriterijumi prihvatanja

- Radnja sa aktivnom pretplatom ima bedž, svoju stranicu i statistiku
- Istekom pretplate benefiti se automatski gase bez brisanja sadržaja
- Ceo tok (zahtev → predračun → aktivacija) izvodljiv bez dev intervencije

## Fajlovi

- `backend/app/models/user.py` / `profile.py` (ili novi model), migracija
- `backend/app/api/v1/` (shop endpointi), `backend/app/tasks/` (podsetnik isteka)
- `frontend/src/app/prodavnice/` (novo), `frontend/src/app/nalog/`
- `frontend/src/components/listings/ListingCard.tsx` (bedž)

## Zavisnosti

- 036 (zajednički obrazac porudžbina/potvrda), `docs/business-model.md`
