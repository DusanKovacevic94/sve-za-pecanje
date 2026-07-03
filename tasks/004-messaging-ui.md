# 004 — Poruke: kompletan UI za razgovore

Status: done
Prioritet: P1

## Problem

Backend za poruke postoji (`GET /conversations`, `GET /conversations/{id}`, `POST /listings/{id}/messages`, `POST /conversations/{id}/messages`), ali frontend ima samo read-only listu poslednjih poruka. Nema slanja prve poruke, nema prikaza razgovora, nema odgovaranja. Dugme "Pošalji poruku" na detalju oglasa vodi na `/nalog/poruke?listing=...` koji taj parametar ignoriše.

## Šta uraditi

- [x] `/nalog/poruke` — lista razgovora: naslov oglasa (ne sirovi `listing_id`), sagovornik, poslednja poruka, unread badge
- [x] `/nalog/poruke/[id]` — prikaz celog razgovora + forma za odgovor (klijentska komponenta, `POST /conversations/{id}/messages`)
- [x] Slanje prve poruke: na detalju oglasa modal/forma koja gađa `POST /listings/{id}/messages`, ili `/nalog/poruke?listing=...` otvara kompoziciju
- [x] Označavanje pročitanog: proveri kako backend vodi `buyer_unread_count`/`seller_unread_count` i resetuj pri otvaranju razgovora
- [x] Backend: paginacija poruka u `serialize_conversation` (`message_service.py` trenutno vraća SVE poruke — dugačak razgovor = ogroman payload)
- [x] Unread indikator u headeru ("Poruke" dugme) — može kasnije

## Kriterijumi prihvatanja

- Kupac pošalje poruku sa detalja oglasa; prodavac je vidi i odgovori; oba vide ceo tok
- Razgovor prikazuje naslov i link oglasa
- Razgovor od 200+ poruka se učitava paginirano

## Fajlovi

- `frontend/src/app/nalog/poruke/page.tsx` (postojeća read-only lista)
- `backend/app/api/v1/messages.py`, `backend/app/services/message_service.py`
- `frontend/src/app/oglasi/[slug]/page.tsx` (dugme "Pošalji poruku")

## Zavisnosti

- Task 001 (server-side fetch sa kolačićima) — bez toga SSR lista razgovora ne radi
