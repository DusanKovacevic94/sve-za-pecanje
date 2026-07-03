# 003 — Omiljeni oglasi (favorites)

Status: done
Prioritet: P1

## Problem

Toggle endpointi postoje (`POST/DELETE /listings/{id}/favorite`) i dugme na detalju oglasa radi, ali:

1. Ne postoji endpoint za **listanje** omiljenih — `/nalog/omiljeni` je stub
2. `FavoriteButton` ne zna početno stanje (da li je oglas već u omiljenim) — uvek kreće od "nije sačuvano"
3. Srce na `ListingCard` je i dalje mrtvo dugme bez handlera

## Šta uraditi

- [x] Backend: `GET /users/me/favorites` — vraća listu oglasa (reuse `serialize_listing_card`, `selectinload` da se izbegne N+1)
- [x] Backend: u `GET /listings/{slug}` dodaj `is_favorited` polje kada je korisnik ulogovan (`get_optional_user` je već dostupan u deps)
- [x] Frontend: `nalog/omiljeni/page.tsx` — grid `ListingCard`-ova sa empty state-om
- [x] Frontend: `FavoriteButton` prima `initialSaved` prop iz detalja oglasa
- [x] Frontend: srce na `ListingCard.tsx:40` — ili ukloni ili poveži sa toggle-om (klijentska komponenta)

## Kriterijumi prihvatanja

- Ulogovan korisnik vidi sve svoje omiljene oglase na `/nalog/omiljeni`
- Dugme na detalju pokazuje tačno stanje posle reload-a stranice
- `favorite_count` na detalju se ne raskorači sa stvarnim stanjem

## Fajlovi

- `backend/app/api/v1/users.py` ili `listings.py` (novi GET endpoint)
- `backend/app/models/favorite.py`, `backend/app/services/listing_service.py`
- `frontend/src/app/nalog/omiljeni/page.tsx` (stub)
- `frontend/src/components/listings/ListingActions.tsx` (FavoriteButton)
- `frontend/src/components/listings/ListingCard.tsx` (mrtvo srce-dugme)
