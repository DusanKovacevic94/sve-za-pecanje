# 024 — Produkcijski overlay: čišćenje i hardening

Status: done
Prioritet: P2

## Problem

1. Produkcijski compose i dalje diže **Mailpit** (dev mail catcher) i MinIO — u produkciji email ide preko Resend-a, a storage će na Hetzner (task 021); nepotrebne mete i konfuzija
2. `next.config.js` `remotePatterns` dozvoljava `hostname: "**"` — bilo koji HTTPS host može da se provuče kroz Next image optimizer (SSRF/proxy abuse vektor)
3. Backend Dockerfile: nema multi-stage, radi kao root, instalira build-essential u finalni image
4. CORS: `allow_methods/headers=["*"]` uz credentials

## Šta uraditi

- [x] `docker-compose.prod.yml`: izbaci Mailpit i MinIO iz produkcije (`profiles` ili `!reset`)
- [x] `next.config.js`: ograniči `remotePatterns` na sopstveni domen + object storage host
- [x] Backend `Dockerfile`: multi-stage build (builder sa build-essential, slim runtime), non-root user, `--no-cache`
- [x] Frontend `Dockerfile`: proveri `output: "standalone"` i non-root
- [x] CORS: eksplicitna lista metoda i headera
- [x] Config validator: u produkciji odbij default `POSTGRES_PASSWORD` (kao za SECRET_KEY)
- [x] Rebuild + smoke test preko prod overlay-a lokalno

## Kriterijumi prihvatanja

- `docker compose -f docker-compose.yml -f docker-compose.prod.yml config` nema Mailpit/MinIO servise
- Image optimizer odbija tuđe hostove
- Backend kontejner radi kao non-root (`docker exec ... whoami`)

## Fajlovi

- `docker-compose.prod.yml:50-56`
- `frontend/next.config.js`
- `backend/Dockerfile`, `frontend/Dockerfile`
- `backend/app/main.py:15-21`, `backend/app/core/config.py:66-79`
