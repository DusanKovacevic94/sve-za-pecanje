# 008 — Redis rate limiter

Status: done
Prioritet: P2

## Problem

`backend/app/core/rate_limit.py` drži brojače u memoriji procesa. Produkcija koristi gunicorn sa 3 workera (`docker-compose.prod.yml:20`), pa svaki worker ima svoje brojače — realan limit je 3× veći od podešenog i resetuje se pri restartu. Redis je već u compose-u ali se ne koristi.

## Šta uraditi

- [x] Implementiraj rate limit preko Redis-a (sliding window ili fixed window sa `INCR` + `EXPIRE` je dovoljan za MVP)
- [x] Zadrži isti interfejs `check_rate_limit(request, key, limit, window_seconds)` da pozivi u `auth.py`, `listings.py`, `messages.py` ostanu netaknuti
- [x] Fallback: ako Redis nije dostupan (lokalni dev bez docker-a), padni na postojeći in-memory limiter umesto da API pukne
- [x] Poštuj postojeći `RATE_LIMIT_ENABLED` flag
- [x] Dodaj `redis` klijent u pyproject (sync verzija, endpointi su sync)

## Kriterijumi prihvatanja

- Sa 3 gunicorn workera, 6. zahtev u prozoru od 5 dobija 429 bez obzira koji worker ga primi
- Lokalni `pytest` prolazi bez pokrenutog Redis-a

## Fajlovi

- `backend/app/core/rate_limit.py`
- `backend/app/core/config.py` (`redis_url` već postoji)
- `backend/pyproject.toml`
