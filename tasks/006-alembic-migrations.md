# 006 — Prave Alembic migracije

Status: todo
Prioritet: P2

## Problem

Jedina migracija `backend/db/migrations/versions/0001_initial.py` samo poziva `Base.metadata.create_all()` / `drop_all()`. To znači:

- Buduće izmene šeme neće imati migracioni put — `create_all` ne menja postojeće tabele
- Produkciona baza se ne može evoluirati bez ručnog SQL-a ili gubitka podataka

## Šta uraditi

- [ ] Zameni `0001_initial.py` pravom autogenerisanom migracijom: `alembic revision --autogenerate` protiv prazne baze (proveri da `env.py` importuje sve modele preko `app.models`)
- [ ] Uvedi praksu: svaka izmena modela = nova autogenerisana migracija, pregledana ručno
- [ ] Dodaj CI proveru (kada task 013 bude gotov): `alembic upgrade head` na praznu bazu + provera da `--autogenerate` ne detektuje drift
- [ ] Napomena za SQLite dev bazu: SQLite ne podržava sve ALTER operacije — koristi `render_as_batch=True` u `env.py` ili prihvati da je dev baza disposable (`rm dev.db && alembic upgrade head && python -m scripts.seed`)

## Kriterijumi prihvatanja

- `alembic upgrade head` na praznoj Postgres bazi kreira kompletnu šemu bez `create_all`
- Probna izmena modela (npr. novo polje) dobija ispravnu autogenerisanu migraciju koja prolazi upgrade/downgrade

## Fajlovi

- `backend/db/migrations/versions/0001_initial.py`
- `backend/db/migrations/env.py`
- `backend/alembic.ini`
