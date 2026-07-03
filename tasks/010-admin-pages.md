# 010 — Admin: preostale stranice + route guard

Status: todo
Prioritet: P2

## Problem

1. Admin stubovi: `admin/brendovi`, `admin/istaknuto`, `admin/podesavanja` su jednolinijski placeholderi; `admin/kategorije` samo re-exportuje javnu stranicu kategorija
2. Nema route-level zaštite — ne-admin koji otvori `/admin` dobija stranicu koja se oslanja na to da API vrati prazno; jedina "zaštita" je `robots.txt` disallow
3. Backend nema admin CRUD za brendove/kategorije (samo javni GET + seed)

## Šta uraditi

- [ ] Route guard: u `admin/layout.tsx` proveri `getCurrentUser()` i `role === "admin"`, inače `redirect("/")` (server-side; zavisi od taska 001 za API pozive)
- [ ] Backend: admin CRUD za brendove (`POST/PATCH/DELETE /admin/brands`) — merge duplikata je čest slučaj kod user-submitted brendova
- [ ] `admin/brendovi`: lista + dodavanje + preimenovanje
- [ ] `admin/istaknuto`: lista istaknutih oglasa + postavljanje `featured_until` (backend `POST /admin/listings/{id}/feature` postoji)
- [ ] `admin/podesavanja`: minimalno — prikaz read-only konfiguracije (review mode, limiti) ili ukloni stranicu dok ne bude pravih podešavanja
- [ ] `admin/kategorije`: ili napravi pravi admin prikaz (sa attribute definitions) ili ukloni link iz admin navigacije

## Kriterijumi prihvatanja

- Ne-admin ne može da otvori nijednu `/admin` rutu (redirect pre renderovanja)
- Admin doda brend i on se odmah pojavljuje u formi za oglas
- Admin istakne oglas sa rokom i oglas nosi "Istaknuto" bedž do isteka

## Fajlovi

- `frontend/src/app/admin/*` (stubovi), `frontend/src/components/admin/` (prazan folder)
- `backend/app/api/v1/admin.py`, `backend/app/core/permissions.py`
