# 021 — Backup baze i prelazak uploada na object storage

Status: done
Prioritet: P2

## Problem

Backup postoji **samo kao dokumentacija** (`docs/deployment.md`) — nema skripte ni automatike. Upload-ovane slike u produkciji žive na lokalnom disku VPS-a (`backend_uploads` volume) — jedan disk je single point of failure, a lokalni uploads se ne backup-uju nikako. S3 kod postoji (`storage.py`), samo nije uključen u produkciji.

## Šta uraditi

- [x] `scripts/backup_db.sh` (ili poseban compose servis): `pg_dump` na raspored, rotacija (7 dnevnih + 4 nedeljna), upload off-site (rclone na Hetzner Object Storage / Backblaze)
- [x] Compose: dodaj backup servis/cron u `docker-compose.prod.yml` (ne oslanjati se na ručni crontab)
- [x] Uputstvo za restore + **jednom probaj restore** na čistoj bazi (backup koji nije testiran ne postoji)
- [x] Uključi S3 storage u produkciji: Hetzner Object Storage bucket, `USE_S3_STORAGE=true`, migracija postojećih fajlova iz `backend_uploads` (skripta za jednokratnu sinhronizaciju)
- [x] Proveri da li se fajlovi brišu iz storage-a pri brisanju oglasa/slike — ako ne, dodaj čišćenje (i worker task za orphan fajlove)
- [x] `docs/deployment.md`: ažuriraj da odgovara stvarnom stanju

## Kriterijumi prihvatanja

- Backup se pravi automatski i završava off-site; restore proveren
- Nove slike idu na object storage; stare dostupne
- Brisanje oglasa ne ostavlja orphan fajlove

## Fajlovi

- `backend/scripts/` (nova backup skripta)
- `docker-compose.prod.yml`
- `backend/app/core/storage.py:17-38`, `backend/app/core/config.py:92-104`
- `backend/app/services/image_service.py` (brisanje)
