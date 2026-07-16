# 039 — Limiti besplatnih oglasa (tek posle likvidnosti!)

Status: todo
Prioritet: P3

## Problem

KupujemProdajem model naplaćuje oglase preko besplatnog limita — ali limit uveden prerano
ubija ponudu od koje ceo sajt zavisi. Ovaj task se **ne radi po kalendaru nego po metrikama**
(vidi `docs/business-model.md`: stabilan rast ponude + zdrav time-to-sold + konverzija
promocija iznad ~3–5%).

## Šta uraditi

- [ ] Prvo proveri metrike iz `docs/business-model.md` — ako nisu dostignute, task ostaje zamrznut
- [ ] Config: `free_listing_limit` (predlog: 10 aktivnih po korisniku; prodavnice iz 037 imaju svoj veći limit), uključivo/isključivo flagom da se može pustiti postepeno
- [ ] Backend: provera pri objavi — preko limita traži ili kupovinu slota (jednokratno po oglasu, npr. 190 RSD/30 dana) ili pretplatu prodavnice; postojeći aktivni oglasi preko limita se NE diraju (grandfathering)
- [ ] Frontend: brojač "X od Y besplatnih oglasa" na `/nalog/oglasi` i jasna poruka pri objavi preko limita sa obe opcije
- [ ] Komunikacija: najava emailom svim korisnicima najmanje 30 dana pre uključenja; tekst objave na sajtu
- [ ] Naplata slota kroz tok iz 036/038
- [ ] Testovi: limit, grandfathering, prodavnica izuzetak

## Kriterijumi prihvatanja

- Ispod limita ništa se ne menja; preko limita objava nudi slot ili pretplatu
- Nijedan postojeći oglas nije skinut uvođenjem limita
- Limit i cena se menjaju konfiguracijom bez deploja

## Fajlovi

- `backend/app/core/config.py`, `backend/app/services/listing_service.py` (provera pri objavi)
- `frontend/src/app/postavi-oglas/`, `frontend/src/app/nalog/oglasi/`
- `docs/business-model.md` (metrike-kapija)

## Zavisnosti

- 036, 037; 038 poželjno (impulsna naplata slota)
