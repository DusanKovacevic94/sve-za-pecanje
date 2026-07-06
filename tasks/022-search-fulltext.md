# 022 — Pretraga: full-text umesto ILIKE

Status: done
Prioritet: P2

## Problem

Pretraga je `ILIKE '%upit%'` po naslovu i opisu — bez rangiranja, bez tolerancije na padeže/dijakritike (korisnik kuca "stap" a oglas kaže "štap"), i sa vodećim wildcard-om koji ne može da koristi indeks (sporo kad naraste broj oglasa).

## Šta uraditi

- [x] Postgres: `tsvector` kolona (naslov ponderisan jače od opisa) + GIN indeks, Alembic migracija; trigger ili generated column za održavanje
- [x] `unaccent` ekstenzija da "stap" nađe "štap" (i obrnuto); normalizuj i upit i sadržaj
- [x] Fallback za dev/SQLite: zadrži ILIKE putanju kad dijalekt nije Postgres (ili prebaci dev na Postgres — odluči)
- [x] `search_service.py`: rangiranje po `ts_rank` + svežina; featured boost zadržati
- [x] Razmotri i `pg_trgm` za typo toleranciju na naslovu (opciono, meri pre dodavanja)
- [x] Saved-search digesti koriste isti servis — proveri da digest logika i dalje radi

## Kriterijumi prihvatanja

- "stap" nalazi oglase sa "štap"; rezultati rangirani po relevantnosti
- EXPLAIN pokazuje korišćenje GIN indeksa (na Postgresu)
- Digesti i test suite prolaze

## Fajlovi

- `backend/app/services/search_service.py:31-33`
- `backend/db/migrations/versions/` (nova migracija)
- `backend/app/models/listing.py`
