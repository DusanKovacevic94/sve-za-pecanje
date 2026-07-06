# 018 — Bedž za nepročitane poruke u headeru

Status: done
Prioritet: P1

## Problem

Korisnik nema nikakav signal da je dobio novu poruku dok ručno ne otvori `/nalog/poruke`. Header prikazuje običan link "Poruke" bez brojača, i nigde nema osvežavanja — nove poruke se vide tek posle navigacije/refresha. Backend ima `buyer_unread_count`/`seller_unread_count` po razgovoru, ali ne postoji agregatni endpoint.

## Šta uraditi

- [x] Backend: `GET /users/me/unread-count` — jedan lagani upit (SUM preko razgovora korisnika), bez serijalizacije razgovora
- [x] Frontend: klijentska komponenta bedža u `Header.tsx` — fetch na mount + interval (npr. 60s, samo kad je tab vidljiv preko `document.visibilityState`)
- [x] Bedž prikazati i na mobilnoj navigaciji (link "Poruke" je trenutno `md:inline-flex` — sakriven na mobilnom; dodaj ga u mobilni red)
- [x] Posle otvaranja razgovora brojač se smanjuje (revalidate ili refetch na fokus)

## Kriterijumi prihvatanja

- Nova poruka → bedž se pojavi bez refresha u roku od intervala
- Otvaranje razgovora smanjuje brojač
- Endpoint ne pravi N+1 (jedan agregatni SQL upit)
- Neulogovan korisnik ne izaziva 401 šum u konzoli (bedž se ne renderuje)

## Fajlovi

- `backend/app/api/v1/messages.py` ili `users.py` (novi endpoint)
- `backend/app/models/message.py:27-28` (unread kolone)
- `frontend/src/components/layout/Header.tsx:33,51-61`
