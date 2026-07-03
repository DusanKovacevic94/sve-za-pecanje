# 014 — View count i analytics ispravke

Status: todo
Prioritet: P3

## Problem

`ListingService.get_by_slug` (`listing_service.py`) na **svaki** javni GET detalja:

1. Inkrementira `view_count` i radi `commit()` — write-on-read, contention na vrućim oglasima
2. Upisuje `AnalyticsEvent` red — tabela raste neograničeno, bez dedup-a (refresh = novi "pregled", bot = stotine pregleda)

Ovo takođe blokira keširanje detalja oglasa (task 012).

## Šta uraditi

- [ ] Razdvoji čitanje od beleženja: GET ne sme da piše; view tracking prebaci u poseban lagani endpoint (`POST /listings/{id}/track-view`) koji frontend zove klijentski (beacon), ili u worker preko Redis brojača
- [ ] Dedup: ne broji ponovljeni pregled istog IP/user-a u kratkom prozoru (Redis `SET NX EX`)
- [ ] Ignoriši očigledne botove (User-Agent) za view count; sitemap crawl ne treba da duva brojke
- [ ] `view_count` flush: Redis `INCR` po oglasu + periodični flush u Postgres (worker iz taska 009), ili zadrži direktan upis ali bez commit-a na GET putanji
- [ ] Analytics events: odluči šta se zaista koristi (admin dashboard?) — ako ništa, ukloni upis; ako da, dodaj retenciju (brisanje starijih od N dana u workeru)

## Kriterijumi prihvatanja

- GET detalja oglasa ne izvršava nijedan INSERT/UPDATE
- Refresh stranice 10× u minuti = +1 pregled
- Detalj oglasa može da se kešira bez gubljenja brojanja

## Fajlovi

- `backend/app/services/listing_service.py` (`get_by_slug`)
- `backend/app/services/analytics_service.py`, `backend/app/models/analytics.py`
- `frontend/src/app/oglasi/[slug]/page.tsx` (beacon poziv)
