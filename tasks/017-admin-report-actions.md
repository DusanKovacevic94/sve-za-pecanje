# 017 — Admin: akcije nad prijavama + rupe u moderaciji

Status: done
Prioritet: P1

## Problem

Admin stranica `/admin/prijave` samo lista prijave — moderator ne može ništa da uradi iz UI-ja. Uz to, u servisu postoje rupe:

1. `resolve_report` prima proizvoljan `status` string (nema validacije/enuma)
2. Suspenzija korisnika je jednosmerna — ne postoji unsuspend/reaktivacija
3. Suspenzija korisnika ne skida njegove aktivne oglase
4. Odbijanje oglasa je slobodan tekst — nema taksonomije razloga

## Šta uraditi

- [x] Frontend: `/admin/prijave` — dugmad "Reši" / "Odbaci" po prijavi (klijentska komponenta), sa opcionim komentarom
- [x] Frontend: iz prijave link na sporni oglas/korisnika + brze akcije (skini oglas, suspenduj korisnika)
- [x] Backend: `resolve_report` — ograniči status na enum (`resolved` / `dismissed`), 422 za ostalo
- [x] Backend: `POST /admin/users/{id}/unsuspend` + dugme u UI
- [x] Backend: pri suspenziji korisnika arhiviraj/sakrij njegove aktivne oglase (i vrati ih pri unsuspend? — odluči i dokumentuj)
- [x] Backend: predefinisani razlozi odbijanja (enum + opcioni slobodan tekst), frontend dropdown
- [x] AuditLog za sve nove akcije

## Kriterijumi prihvatanja

- Moderator ceo tok prijave (pregled → akcija → status) završava iz UI-ja
- Suspendovan korisnik nema vidljive oglase u pretrazi/listingu
- Nevalidan status prijave vraća 422, ne upisuje se u bazu

## Fajlovi

- `frontend/src/app/admin/prijave/page.tsx` (read-only)
- `backend/app/services/moderation_service.py` (resolve_report, suspend)
- `backend/app/api/v1/admin.py`
- `backend/app/models/report.py`, `backend/app/models/audit_log.py`
