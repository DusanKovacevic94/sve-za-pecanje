# Business model

Last updated: 2026-07-07

## Positioning

Sve Za Pecanje is a **C2C/B2C classifieds site** for fishing gear in Serbia: sellers and buyers
find each other on the platform, but the transaction itself (payment, hand-over, shipping)
happens directly between them. This is the KupujemProdajem model, not the Ananas model.

## What we deliberately do NOT do (the Ananas lesson)

Ananas.rs (Delta Holding) runs a full retail marketplace: money flows through the platform via a
licensed e-money institution, with fulfillment centers, returns handling, fiscal receipts, and
customer support in the middle. That machinery let them charge a per-sale commission — and it
costs them ~€20–24M in net losses per year (2.25–2.83 billion RSD annually against revenue of
206M–946M RSD, per public filings), sustainable only with a corporate sponsor buying market share.

Consequences for us:

- **No sales commission.** We never touch the buyer's money, so there is nothing to take a cut
  of — and nothing forcing us to build escrow, refunds, KYC, or dispute arbitration.
- **No logistics.** Shipping is between buyer and seller (lično preuzimanje, post, kurirske
  službe). We can add shipping *guides*, not shipping *services*.
- **No first-party retail.** We do not compete with our own sellers.
- Contrast: KupujemProdajem is profitable in Serbia on promotion fees, quotas, and
  subscriptions. That is the proven local model for classifieds, and it is ours.

## Revenue streams (in rollout order)

### 1. Listing promotions — LIVE (task 027)

Self-serve "Istakni oglas": the seller requests featuring, pays by bank transfer
(poziv na broj = request ID), an admin confirms, the listing gets `featured_until`.

- Packages: 7 days / 490 RSD, 14 days / 790 RSD, 30 days / 1290 RSD
  (`FEATURE_PACKAGES` in `backend/app/services/feature_service.py`).
- Featured listings sort first and carry a badge.

### 2. More promotion types (task 036)

Generalize the feature-request flow into promotion orders with a type:

- **Bump ("Podigni oglas")** — one-time push back to the top of results; micro-price
  (~120 RSD) so it becomes the habitual small purchase.
- **Homepage slot** — rotation in an "Istaknuti oglasi" section on the homepage; premium price.
- Bundles (e.g. featured + bump weekly) once single types prove out.

### 3. Shop subscriptions for tackle dealers (task 037)

Monthly subscription for registered shops (pecaroški dućani, small importers):

- "Prodavnica" badge, branded shop page with logo and all listings, higher active-listing
  limit, basic stats (views, favorites, messages per listing).
- Manual invoicing at first (predračun by email); card/recurring later.
- This is the B2B anchor revenue: fewer customers, higher and more predictable ARPU.

### 4. Card payments (task 038)

Replace manual bank-transfer confirmation with instant card payment for promotions and
subscriptions. Stripe is not available in Serbia — evaluate local PSPs (ChipCard, AllSecure,
NestPay via banks, Payspot). Manual transfer stays as fallback.

### 5. Listing quotas (task 039 — only after liquidity)

Free tier with a cap on simultaneous active listings (e.g. 10); above it, per-listing fee or
shop subscription. **Do not enable before the site has healthy supply** — quotas applied too
early kill the inventory the whole model depends on. Gate on metrics, not on calendar.

### Explicitly out of scope (for now)

- Buyer protection / escrow as a paid option — revisit only at significant volume, with a
  licensed payment partner; this is the first step back toward Ananas-style cost structure.
- Display advertising for external advertisers — low CPMs at our traffic levels; sponsored
  *listings* (our own sellers paying for placement) are the better version of ads.

## Pricing philosophy

- Listing is free, always. Supply is the product; never tax supply before liquidity.
- Charge for *visibility*, not for *transacting*.
- Micro-prices in RSD, rounded to the local pattern (490, not 500). Bump should cost less than
  a beer; featuring less than a spool of good line.
- Everything self-serve first, negotiated deals never — we are not staffed for sales calls.

## Metrics that decide the roadmap

- Supply: new listings/week, active listings, share of listings with photos.
- Liquidity: median time-to-sold, share of listings marked sold in 30 days.
- Demand: searches/week, messages started per listing.
- Monetization: promotion conversion (share of listings that buy any promotion),
  ARPU of shops, repeat purchase rate of bumps.

Quotas (stream 5) switch on when: stable supply growth + healthy time-to-sold + promotion
conversion above ~3–5%. Until then, everything stays free except visibility products.
