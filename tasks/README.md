# Tasks

Roadmap za naredne korake. Svaki task je poseban fajl — kada je gotov, promeni `Status: todo` u `Status: done` u fajlu i štikliraj ovde.

Prioriteti: **P1** = bitno odmah (bugovi / core UX), **P2** = potrebno pre ozbiljnijeg launcha, **P3** = kvalitet i rast.

## P1 — Core

- [x] [001 — Popravi autentifikovane server-side fetch pozive](001-server-fetch-auth.md)
- [x] [002 — Izmena oglasa (edit listing)](002-edit-listing.md)
- [x] [003 — Omiljeni oglasi (favorites)](003-favorites.md)
- [x] [004 — Poruke: kompletan UI za razgovore](004-messaging-ui.md)
- [x] [005 — Nalog: profil i ocene stranice](005-account-pages.md)

## P2 — Pre launcha

- [x] [006 — Prave Alembic migracije](006-alembic-migrations.md)
- [x] [007 — Auth hardening (opoziv tokena, telefon, ponovna verifikacija)](007-auth-hardening.md)
- [x] [008 — Redis rate limiter](008-redis-rate-limit.md)
- [x] [009 — Background worker (digesti, istek oglasa)](009-background-worker.md)
- [x] [010 — Admin: preostale stranice + route guard](010-admin-pages.md)
- [x] [011 — Slike: galerija, upload zaštita, next/image](011-images.md)

## P3 — Kvalitet i rast

- [x] [012 — SEO i performanse](012-seo-performance.md)
- [x] [013 — CI, ESLint i pokrivenost testovima](013-ci-quality.md)
- [x] [014 — View count i analytics ispravke](014-analytics-viewcount.md)
- [x] [015 — Kontakt forma](015-contact-form.md)

---

# Runda 2 (posle audita 2026-07-06)

## P1 — Bugovi i mrtve funkcionalnosti

- [x] [016 — Sačuvane pretrage: kreiranje i brisanje](016-saved-search-create.md)
- [x] [017 — Admin: akcije nad prijavama + rupe u moderaciji](017-admin-report-actions.md)
- [x] [018 — Bedž za nepročitane poruke u headeru](018-unread-badge.md)
- [x] [019 — Email outbox: tihi ispad emaila u produkciji](019-email-outbox-fix.md)

## P2 — Pre launcha

- [ ] [020 — Observability: Sentry, logovi, health check](020-observability.md)
- [ ] [021 — Backup baze i prelazak uploada na object storage](021-backups-object-storage.md)
- [ ] [022 — Pretraga: full-text umesto ILIKE](022-search-fulltext.md)
- [ ] [023 — UX polish: loading states, mobilna navigacija, pristupačnost](023-ux-polish.md)
- [ ] [024 — Produkcijski overlay: čišćenje i hardening](024-prod-cleanup.md)

## P3 — Kvalitet i rast

- [ ] [025 — E2E testovi (Playwright) i pokrivenost backenda](025-e2e-tests.md)
- [ ] [026 — Web analitika (privacy-friendly)](026-analytics.md)
- [ ] [027 — Isticanje oglasa: self-serve tok (monetizacija)](027-featured-monetization.md)
- [ ] [028 — Notifikacije: email za novu poruku + in-app](028-notifications.md)
