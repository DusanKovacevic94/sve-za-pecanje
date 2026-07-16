# 036 — Promocije: bump, homepage slot, generalizacija porudžbina

Status: done
Prioritet: P2

## Problem

Task 027 je isporučio samo jedan tip promocije (isticanje kroz `FeatureRequest`). Model
monetizacije (vidi `docs/business-model.md`) traži još tipova — pre svega jeftin **bump**
("Podigni oglas") kao naviku male kupovine — a trenutni model/servis je zakucan za featured
(`package_days` + `featured_until`).

## Šta uraditi

- [x] Generalizuj `FeatureRequest` → `PromotionOrder`: dodaj `type` (`featured` / `bump` / `homepage`), migracija sa backfill-om postojećih redova na `featured`
- [x] Cenovnik po tipu u servisu (featured: postojeći paketi; bump: ~120 RSD jednokratno; homepage: premium paket 7 dana) — jedan izvor istine, endpoint `GET /promotions/packages`
- [x] Bump logika: `bumped_at` kolona na listingu; sortiranje koristi `COALESCE(bumped_at, created_at)` umesto samo `created_at`; bump ne dira `featured_until`
- [x] Homepage slot: sekcija "Istaknuti oglasi" na početnoj čita oglase sa aktivnim `homepage` promocijama (rotacija ako ih je više od 4)
- [x] Frontend: na `/nalog/oglasi` dugme "Promoviši" otvara izbor tipa sa cenama i objašnjenjem; postojeći tok uplate (poziv na broj) reuse
- [x] Admin: postojeća lista zahteva dobija kolonu tipa + filter
- [x] Email potvrde kroz outbox za sve tipove (reuse 027 šablon)
- [x] Testovi: bump menja redosled, potvrda homepage promocije puni sekciju, backfill migracija

## Kriterijumi prihvatanja

- Korisnik može da kupi bump i oglas odmah po admin potvrdi skače na vrh rezultata svoje kategorije
- Postojeći featured zahtevi iz 027 rade netaknuto posle migracije
- Cene se čitaju sa jednog mesta (nema hardkodovanih u frontendu)

## Fajlovi

- `backend/app/models/feature_request.py` (→ promotion_order)
- `backend/app/services/feature_service.py:13` (FEATURE_PACKAGES)
- `backend/app/services/listing_service.py` (sortiranje)
- `backend/db/migrations/versions/` (nova migracija)
- `frontend/src/app/nalog/oglasi/`, `frontend/src/app/page.tsx`

## Zavisnosti

- 027 (isporučeno), `docs/business-model.md`
