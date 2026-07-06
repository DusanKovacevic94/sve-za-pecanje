# 016 — Sačuvane pretrage: kreiranje i brisanje

Status: done
Prioritet: P1

## Problem

Dugme "Sačuvaj pretragu" na `/oglasi` je mrtvo: linkuje na `/nalog/sacuvane-pretrage?<query>`, ali ta stranica ignoriše query parametre i samo lista postojeće pretrage. Ne postoji nikakav UI za kreiranje ni brisanje sačuvane pretrage — funkcionalnost je polu-implementirana (backend endpointi za digest već rade u workeru).

## Šta uraditi

- [x] Proveri backend: postoji li `POST /saved-searches` i `DELETE /saved-searches/{id}`; ako ne, dodaj ih (naziv pretrage + JSON filteri + `notify` flag)
- [x] Frontend: `sacuvane-pretrage/page.tsx` — kada stigne query string, prikaži formu "Sačuvaj ovu pretragu" (predlog imena iz filtera) koja POST-uje pretragu
- [x] Frontend: dugme za brisanje pored svake sačuvane pretrage (klijentska komponenta, confirm)
- [x] Frontend: link sa svake sačuvane pretrage nazad na `/oglasi?<filteri>` da se pretraga ponovo pokrene
- [x] Ograniči broj sačuvanih pretraga po korisniku (npr. 20) sa jasnom porukom

## Kriterijumi prihvatanja

- Klik na "Sačuvaj pretragu" sa aktivnim filterima → pretraga se pojavi u listi
- Brisanje radi i lista se osveži
- Worker digest i dalje šalje email za nove sačuvane pretrage (E2E ručno kroz log)

## Fajlovi

- `frontend/src/app/oglasi/page.tsx:44` (dugme)
- `frontend/src/app/nalog/sacuvane-pretrage/page.tsx` (read-only lista)
- `backend/app/api/v1/` (saved-searches endpointi)
- `backend/app/tasks/saved_search_tasks.py` (digest — ne dirati logiku, samo proveriti kompatibilnost)
