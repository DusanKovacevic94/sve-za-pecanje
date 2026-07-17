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

- [x] [020 — Observability: Sentry, logovi, health check](020-observability.md)
- [x] [021 — Backup baze i prelazak uploada na object storage](021-backups-object-storage.md)
- [x] [022 — Pretraga: full-text umesto ILIKE](022-search-fulltext.md)
- [x] [023 — UX polish: loading states, mobilna navigacija, pristupačnost](023-ux-polish.md)
- [x] [024 — Produkcijski overlay: čišćenje i hardening](024-prod-cleanup.md)

## P3 — Kvalitet i rast

- [x] [025 — E2E testovi (Playwright) i pokrivenost backenda](025-e2e-tests.md)
- [x] [026 — Web analitika (privacy-friendly)](026-analytics.md)
- [x] [027 — Isticanje oglasa: self-serve tok (monetizacija)](027-featured-monetization.md)
- [x] [028 — Notifikacije: email za novu poruku + in-app](028-notifications.md)

---

# Runda 3 — Dizajn i osećaj sajta (2026-07-07)

Cilj: skinuti "default Tailwind" utisak — tipografija, boje sa karakterom, kartice koje ne liče na debug ispis, i povratne informacije na svaku akciju. Redosled: 029 prvo (temelji), pa 031, pa ostalo.

## P1 — Vizuelni identitet

- [x] [029 — Dizajn temelji: tipografija, paleta, tokeni](029-design-foundations.md)
- [x] [030 — Header, footer i brend detalji](030-header-footer-brand.md)
- [x] [031 — ListingCard redizajn + čitljivi atributi](031-listing-card-attributes.md)

## P2 — Stranice i interakcije

- [x] [032 — Početna strana: redizajn](032-homepage-redesign.md)
- [x] [033 — /oglasi: sortiranje, aktivni filteri, paginacija](033-browse-page-ux.md)
- [x] [034 — Detalj oglasa: layout, breadcrumbs, slični oglasi](034-detail-page-layout.md)
- [x] [035 — Mikrointerakcije, empty states i povratne informacije](035-micro-interactions.md)

---

# Runda 4 — Monetizacija (2026-07-07)

Model: KupujemProdajem put (naplata vidljivosti, ne transakcija) — obrazloženje i redosled u [docs/business-model.md](../docs/business-model.md). Bez provizije na prodaju, bez escrow-a, bez logistike (Ananas lekcija).

## P2 — Sledeći prihodi

- [x] [036 — Promocije: bump, homepage slot, generalizacija porudžbina](036-promotion-types.md)
- [x] [037 — Prodavnice: pretplate za pecaroške radnje](037-shop-subscriptions.md)

## P3 — Kad dođe vreme

- [ ] [038 — Kartično plaćanje za promocije i pretplate](038-card-payments.md)
- [ ] [039 — Limiti besplatnih oglasa (tek posle likvidnosti!)](039-listing-quotas.md)

---

# Runda 5 — Kategorije i filteri (2026-07-17)

Plan i katalog: [docs/category-filter-plan.md](../docs/category-filter-plan.md).

## P1 — Strukturni podaci i pretraga

- [x] [040 — Kompletan katalog atributa kategorija](040-category-attribute-catalog.md)
- [x] [041 — Tipizirani dinamički atributi oglasa](041-typed-listing-attributes.md)
- [x] [042 — Backend filter engine po kategoriji](042-category-filter-engine.md)
- [x] [043 — Dinamički UI filtera kategorije](043-dynamic-filter-ui.md)

## P2 — Paritet i taksonomija

- [x] [044 — Paritet sačuvanih pretraga](044-saved-search-filter-parity.md)
- [x] [045 — Kompletni globalni filteri](045-global-browse-filters.md)
- [x] [046 — Taksonomija potkategorija](046-leaf-category-taxonomy.md)
