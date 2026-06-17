# MVP Specification — Serbian Fishing Gear Marketplace

**Working project name:** `Sve Za Pecanje`  
**Internal codename:** `fishing-marketplace-rs`  
**Document purpose:** This is a detailed implementation-ready MVP specification for a coding agent.  
**Plan language:** English  
**User-facing content language:** Serbian, Latin script  
**Primary market:** Serbia  
**Product type:** Niche classifieds marketplace for fishing gear  
**Core inspiration:** KupujemProdajem-style marketplace, but specialized for anglers and fishing equipment  
**Important legal/product constraint:** Do **not** clone KupujemProdajem. Do not copy their UI, brand, data, taxonomy, copy, layout, icons, or workflows. Build an original Serbian fishing marketplace inspired by the general classifieds model.

---

## 0. Agent Instructions

You are building an MVP for a Serbian fishing gear marketplace.

The app must be production-minded, but not over-engineered. Build a functional, clean, deployable MVP with a strong foundation for future growth.

Prioritize:

1. Marketplace listing creation
2. Browsing and searching listings
3. Fishing-specific structured filters
4. User accounts
5. Seller contact / messaging
6. Admin moderation
7. Serbian user-facing copy
8. Clean UX that works well on mobile

Do not build:

- A generic social network
- A full ecommerce checkout
- Escrow payments
- Auctions
- Mobile apps
- AI pricing
- Fishing spot maps
- Tournament system
- Shop subscriptions
- Automatic scraping/importing from other marketplaces

Those are post-MVP features.

When implementing, prefer boring, reliable technology and clear code over clever abstractions.

---

## 1. Product Summary

### 1.1 One-Sentence Description

A specialized Serbian classifieds marketplace where anglers can buy and sell used and new fishing gear with structured filters, trusted profiles, saved searches, and category-specific listing details.

### 1.2 Product Positioning

Do not position this as “another KP.”

Position it as:

> The dedicated marketplace for anglers in Serbia.

KP wins on volume. This product wins on specialization, filtering, trust, and community relevance.

### 1.3 Core Value Proposition

For buyers:

- Find fishing gear faster than on generic classifieds platforms
- Filter by fishing-specific specs, not just generic text
- Save searches for desired rods, reels, lures, and electronics
- See seller reputation and fishing-focused profile information
- Contact sellers directly in a cleaner niche environment

For sellers:

- Reach actual anglers, not a generic marketplace audience
- Create listings with fishing-specific fields
- Sell faster by providing structured information buyers care about
- Build reputation within the fishing community
- Mark listings as sold and receive buyer feedback

For admins:

- Moderate a focused vertical marketplace
- Approve, reject, feature, and remove listings
- Manage categories, attributes, brands, reports, and users

---

## 2. MVP Goals

### 2.1 Primary MVP Goal

Validate whether Serbian anglers will list and browse fishing gear on a dedicated marketplace instead of relying only on generic classifieds platforms, Facebook groups, and forums.

### 2.2 MVP Success Metrics

The MVP should be considered promising if, within 60–90 days of launch, it reaches:

- 300+ registered users
- 150+ active listings
- 30+ new listings per month
- 20%+ of listings receiving at least one contact/message
- 50+ saved searches
- 25+ repeat weekly users
- 10+ successful confirmed sales, even if sale happens offline

These numbers are directional, not hard technical requirements.

### 2.3 MVP Technical Goal

Deliver a stable app that supports:

- Registration/login
- Listing creation with images
- Category-specific fields
- Browse/search/filter listings
- Listing detail pages
- Favorites
- Saved searches
- Basic messaging/contact
- Seller profiles
- Admin moderation
- SEO-friendly public pages
- Deployable Docker-based environment

---

## 3. Target Users

### 3.1 Buyer Persona — Recreational Angler

User example:

- Lives in Serbia
- Buys used rods, reels, lures, and accessories
- Currently searches KP, Facebook groups, and Viber/WhatsApp communities
- Wants better filters and less noise
- Often searches for specific models

Needs:

- Search by brand/model
- Filter by rod length, casting weight, reel size, lure weight, condition, location, price
- Save search alerts
- Contact seller easily
- Trust seller enough to buy used gear

### 3.2 Seller Persona — Hobby Angler

User example:

- Has extra gear, older rods/reels/lures
- Wants to sell to people who understand the equipment
- Currently posts on Facebook groups and KP
- Does not want a complicated listing process

Needs:

- Fast listing creation
- Easy image upload
- Structured fields that make listing look credible
- Direct buyer contact
- Ability to mark item as sold

### 3.3 Seller Persona — Small Fishing Shop

This is not core MVP, but the MVP should not block future shop accounts.

Needs later:

- Shop profile
- Multiple listings
- Featured products
- Promotion tools
- Subscription or paid featured listings

For MVP, shops can register as normal users.

### 3.4 Admin Persona

Needs:

- Review new listings
- Remove spam/scams
- Manage categories and brands
- Handle reports
- Ban abusive users
- Feature/highlight selected listings manually

---

## 4. Product Principles

### 4.1 Niche Beats Generic

Every feature should answer:

> Does this make buying/selling fishing gear better than a generic classifieds site?

If not, it probably belongs post-MVP.

### 4.2 Structured Data Matters

Fishing gear buyers care about details. The platform must capture important specs in a structured way.

Examples:

- Rod length
- Casting weight
- Reel size
- Lure weight
- Technique
- Condition
- Brand
- Model

### 4.3 Mobile First

Serbian users will heavily use the app from phones.

The MVP must work very well on mobile:

- Fast image upload
- Easy listing creation
- Clean browse page
- Large tappable filters
- Simple contact actions

### 4.4 Trust Is Critical

Many used gear transactions depend on trust. The MVP should include trust signals:

- Verified email
- Optional phone number
- Account age
- Profile photo/avatar
- Number of active/sold listings
- Reviews after sale
- Report listing/user flow

### 4.5 Keep Transactions Offline for MVP

Do not implement payments or escrow in MVP. The marketplace facilitates contact. Buyer and seller complete transaction independently.

---

## 5. Legal and Ethical Constraints

### 5.1 Do Not Clone Existing Services

Do not copy:

- KupujemProdajem UI
- KupujemProdajem name, logo, colors, layout, text, or category tree
- Other marketplace data
- Other marketplace listing content
- Images from other listings
- Facebook group posts without permission

### 5.2 No Scraping for MVP

Do not scrape KP, Facebook, forums, Instagram, or other marketplaces.

Manual seeding is acceptable only if:

- User owns the listing
- User gave permission
- Content is original
- Images are uploaded voluntarily

### 5.3 Privacy

The app must protect personal information:

- Do not publicly expose email addresses
- Phone number visibility must be controlled by user
- Do not log passwords, tokens, private messages, or phone numbers in plaintext logs
- Provide Privacy Policy and Terms pages
- Include consent checkbox during registration

### 5.4 Prohibited Items

The marketplace should prohibit:

- Illegal fishing equipment
- Poaching gear
- Explosives, firearms, ammunition
- Electric fishing equipment
- Illegal nets/traps, unless legal and explicitly categorized later
- Counterfeit goods presented as authentic
- Stolen equipment
- Offensive or fraudulent listings
- Protected-species trade or content that encourages illegal fishing

MVP should include basic prohibited-content language in Terms and listing form.

---

## 6. Scope

## 6.1 MVP Includes

### Public Features

- Homepage
- Browse listings
- Search listings
- Filter by category, price, location, condition, brand, and category-specific specs
- Listing detail page
- Seller public profile
- Login/register
- Static pages:
  - About
  - Terms
  - Privacy
  - Contact
  - Safety tips

### Authenticated User Features

- Create listing
- Edit listing
- Delete/archive listing
- Upload listing images
- Mark listing as sold
- Favorite listings
- Save searches
- View own listings
- Contact seller
- Send/receive basic messages
- Manage profile
- Leave review after sale
- Report listing

### Admin Features

- Admin login
- Dashboard metrics
- Review pending listings
- Approve/reject listings
- View/edit/remove listings
- View users
- Suspend users
- View reports
- Resolve reports
- Manage categories
- Manage brands
- Manage featured listings

### Backend Features

- REST API
- PostgreSQL schema
- Search/filtering
- Auth/session handling
- Image upload/storage
- Email notifications
- Admin permissions
- Audit logging
- Rate limiting
- Basic analytics events

### DevOps

- Docker Compose local dev
- PostgreSQL
- Redis
- S3-compatible local storage through MinIO
- Mailpit/Mailhog for local email testing
- Production deployment guide
- Environment variable configuration
- Database migrations
- Seed data script

---

## 6.2 Explicitly Out of Scope for MVP

Do not build these in MVP:

- Payment processing
- Escrow
- Shipping integration
- Auctions
- Bidding
- Price negotiation engine
- Native iOS/Android apps
- Real-time WebSocket chat
- AI image recognition
- AI price recommendation
- Marketplace scraping/importing
- Public fishing spot map
- Catch reports/social feed
- Tournament management
- Advanced shop subscriptions
- Cyrillic interface toggle
- Multi-country expansion
- Loyalty points
- Referral system
- Complex anti-fraud scoring
- Recommendation engine
- Push notifications

---

## 7. Recommended Tech Stack

Use this unless there is a strong reason not to.

### 7.1 Backend

- Python
- FastAPI
- SQLAlchemy 2.x
- Alembic
- Pydantic v2
- PostgreSQL
- Redis
- Celery or RQ for background jobs
- Uvicorn/Gunicorn
- Pytest

### 7.2 Frontend

- Next.js
- TypeScript
- React
- Tailwind CSS
- React Hook Form
- Zod validation
- TanStack Query or similar query library

### 7.3 Storage

For local development:

- MinIO

For production:

- Cloudflare R2, AWS S3, or other S3-compatible storage

### 7.4 Email

For local development:

- Mailpit or Mailhog

For production:

- Resend, Postmark, Mailgun, Amazon SES, or similar

### 7.5 Hosting

Initial production can run on:

- Hetzner VPS
- Docker Compose
- Nginx/Caddy reverse proxy
- Cloudflare DNS/proxy

Later:

- Managed Postgres
- Managed Redis
- Separate image processing workers

### 7.6 Search

MVP:

- PostgreSQL Full Text Search
- B-tree indexes
- GIN indexes for JSONB attributes where needed

Post-MVP:

- OpenSearch, Meilisearch, Typesense, or Elasticsearch

---

## 8. Repository Structure

Use a monorepo.

```text
fishing-marketplace-rs/
  README.md
  .env.example
  docker-compose.yml
  docker-compose.prod.yml
  Makefile

  backend/
    pyproject.toml
    alembic.ini
    app/
      main.py
      core/
        config.py
        security.py
        permissions.py
        rate_limit.py
        logging.py
        email.py
        storage.py
      db/
        base.py
        session.py
        migrations/
      models/
        user.py
        profile.py
        listing.py
        category.py
        brand.py
        image.py
        favorite.py
        saved_search.py
        message.py
        review.py
        report.py
        audit.py
        analytics.py
      schemas/
        auth.py
        user.py
        listing.py
        category.py
        search.py
        message.py
        admin.py
      api/
        v1/
          router.py
          auth.py
          users.py
          listings.py
          categories.py
          brands.py
          search.py
          favorites.py
          saved_searches.py
          messages.py
          reviews.py
          reports.py
          admin.py
      services/
        auth_service.py
        listing_service.py
        search_service.py
        image_service.py
        email_service.py
        moderation_service.py
        notification_service.py
        analytics_service.py
      tasks/
        worker.py
        image_tasks.py
        email_tasks.py
        saved_search_tasks.py
      tests/
        unit/
        integration/
    scripts/
      seed.py
      create_admin.py

  frontend/
    package.json
    next.config.js
    src/
      app/
        layout.tsx
        page.tsx
        oglasi/
          page.tsx
          [slug]/
            page.tsx
        postavi-oglas/
          page.tsx
        prijava/
          page.tsx
        registracija/
          page.tsx
        nalog/
          page.tsx
        poruke/
          page.tsx
        admin/
          page.tsx
      components/
        layout/
        listings/
        forms/
        filters/
        ui/
        admin/
      lib/
        api.ts
        auth.ts
        validation.ts
        format.ts
      styles/
        globals.css

  docs/
    architecture.md
    api.md
    deployment.md
    moderation.md
```

---

## 9. User-Facing Language and Localization

### 9.1 Default Language

All user-facing app content must be Serbian, Latin script.

Examples:

- `Postavi oglas`
- `Pretraga`
- `Kategorije`
- `Štapovi`
- `Mašinice`
- `Varalice`
- `Sačuvaj pretragu`
- `Dodaj u omiljene`
- `Pošalji poruku`
- `Prijavi oglas`
- `Označi kao prodato`
- `Moj nalog`

### 9.2 Code Language

Use English for:

- Code
- Database table names
- API fields
- Internal documentation
- Variable names

### 9.3 Formatting

Use Serbian conventions:

- Date: `16.06.2026.`
- Time: `14:30`
- Currency:
  - `12.000 RSD`
  - `100 €`
- Distance/length:
  - Rod length: `240 cm`
  - Lure weight: `12 g`
  - Reel drag: `8 kg`

### 9.4 MVP Locale Assumptions

- Script: Serbian Latin
- Country: Serbia
- Timezone: Europe/Belgrade
- Supported currencies: RSD and EUR
- Default currency: RSD
- Supported location granularity: city/municipality

---

## 10. Branding Placeholder

Do not over-invest in branding for MVP.

Use temporary working brand:

### Option A

`Sve Za Pecanje`

### Option B

`Pecaroš Oglasi`

### Option C

`Polovna Oprema za Ribolov`

For MVP implementation, use `Sve Za Pecanje` as default placeholder.

### 10.1 Visual Direction

- Clean
- Modern
- Mobile-first
- Fishing/outdoor feel
- Avoid looking like KP
- Avoid marketplace clutter
- Use neutral background
- One strong accent color
- Clear cards
- Large images
- Easy filters

### 10.2 Do Not Use

- KP-like orange branding
- Similar homepage layout to KP
- Similar icons/category hierarchy copied from KP
- Similar listing cards copied from KP

---

## 11. Information Architecture

### 11.1 Public Routes

```text
/                         Homepage
/oglasi                   Listing search/browse
/oglasi/[slug]            Listing detail
/kategorije               Category overview
/kategorije/[slug]        Category listing page
/prodavci/[username]      Public seller profile
/o-nama                   About
/kontakt                  Contact
/uslovi-koriscenja        Terms
/privatnost               Privacy Policy
/saveti-za-bezbednost     Safety tips
```

### 11.2 Auth Routes

```text
/registracija             Register
/prijava                  Login
/zaboravljena-lozinka     Forgot password
/reset-lozinke            Reset password
/verifikacija-emaila      Email verification
```

### 11.3 User Dashboard Routes

```text
/nalog                    Account overview
/nalog/profil             Edit profile
/nalog/oglasi             My listings
/nalog/omiljeni           Favorites
/nalog/sacuvane-pretrage  Saved searches
/nalog/poruke             Messages
/nalog/ocene              Reviews
/postavi-oglas            Create listing
/izmeni-oglas/[id]        Edit listing
```

### 11.4 Admin Routes

```text
/admin                    Admin dashboard
/admin/oglasi             Listing moderation
/admin/korisnici          Users
/admin/prijave            Reports
/admin/kategorije         Categories
/admin/brendovi           Brands
/admin/istaknuto          Featured listings
/admin/podesavanja        Settings
```

---

## 12. Core User Flows

## 12.1 Buyer Browses Listings

1. User opens homepage
2. User clicks `Pogledaj oglase`
3. User lands on `/oglasi`
4. User enters search query, e.g. `Shimano Stradic`
5. User applies filters:
   - Category: `Mašinice`
   - Price: `50–150 €`
   - Location: `Beograd`
   - Condition: `Polovno - odlično`
6. User opens listing detail page
7. User views seller profile and item details
8. User sends message or reveals phone number
9. Analytics event is created: `seller_contacted`

Acceptance criteria:

- Search results update with filters
- Filters are shareable in URL
- Listing detail page loads quickly
- Contact action requires login
- Seller does not receive duplicate spam messages from same user repeatedly

---

## 12.2 Seller Creates Listing

1. User registers/logs in
2. User clicks `Postavi oglas`
3. User selects category
4. User enters title and description
5. User fills category-specific fields
6. User enters price and currency
7. User enters location
8. User uploads images
9. User confirms terms
10. Listing is saved as `pending_review`
11. Admin approves listing
12. Listing becomes public

Acceptance criteria:

- User cannot publish without required fields
- At least one image is recommended, but not strictly required
- Listing status is visible to seller
- Seller can edit listing while pending or active
- Editing active listing can optionally send it back to moderation if major fields change

---

## 12.3 User Saves Search

1. User searches/filter listings
2. User clicks `Sačuvaj pretragu`
3. User names search, e.g. `Vanford 2500 do 150e`
4. System stores query/filter criteria
5. User can see saved searches in dashboard
6. User can delete saved search
7. Background job can later notify user when matching listings appear

MVP notification behavior:

- Store saved search
- Show matching count in dashboard
- Email notifications can be implemented as basic daily digest or left as admin-enabled feature flag

Acceptance criteria:

- Saved search preserves all filters
- User cannot save duplicate identical search without confirmation
- Saved search belongs only to authenticated user

---

## 12.4 Buyer Sends Message

1. Buyer opens listing
2. Buyer clicks `Pošalji poruku`
3. Buyer writes message
4. System creates conversation if not existing
5. Seller receives email notification
6. Seller can reply in dashboard

Acceptance criteria:

- User cannot message own listing
- Empty messages are rejected
- Repeated identical messages are rate limited
- Email notification does not expose buyer email
- Conversation is linked to listing

---

## 12.5 Seller Marks Listing as Sold

1. Seller opens own listing
2. Seller clicks `Označi kao prodato`
3. Optional field: buyer username if sale happened through platform
4. Listing status becomes `sold`
5. Listing remains visible but cannot receive new messages
6. Buyer and seller can leave review if buyer selected

Acceptance criteria:

- Only listing owner or admin can mark as sold
- Sold listings appear with clear badge `Prodato`
- Sold listings are excluded from active browse by default
- Sold listings can still appear in seller profile under sold items

---

## 12.6 User Reports Listing

1. User opens listing
2. User clicks `Prijavi oglas`
3. User selects reason:
   - Prevara
   - Pogrešna kategorija
   - Dupliran oglas
   - Zabranjen predmet
   - Uvredljiv sadržaj
   - Ostalo
4. User adds optional explanation
5. Admin sees report
6. Admin resolves report

Acceptance criteria:

- Auth required for report
- Same user cannot report same listing repeatedly without updating previous report
- Admin can mark report as resolved, rejected, or actioned

---

## 13. MVP Pages in Detail

## 13.1 Homepage

### Goal

Explain the product and get users to browse or post listings.

### Sections

1. Header
   - Logo placeholder
   - Nav: `Oglasi`, `Postavi oglas`, `Prijava`
   - If logged in: `Moj nalog`, `Poruke`

2. Hero
   - Serbian headline:
     - `Polovna i nova oprema za ribolov na jednom mestu`
   - Subheadline:
     - `Pronađi štapove, mašinice, varalice i opremu od ribolovaca iz Srbije.`
   - Search bar
   - CTA buttons:
     - `Pretraži oglase`
     - `Postavi oglas`

3. Category cards
   - Štapovi
   - Mašinice
   - Varalice
   - Elektronika
   - Čamci i oprema
   - Ostala oprema

4. Latest listings
   - 8–12 latest approved active listings

5. Why this marketplace
   - `Filteri za ribolovnu opremu`
   - `Oglasi od ribolovaca`
   - `Sačuvane pretrage`
   - `Ocene prodavaca`

6. Safety tips block
   - Short warning about checking gear and avoiding suspicious payments

7. Footer
   - About
   - Terms
   - Privacy
   - Contact

### Acceptance Criteria

- Homepage loads latest listings
- Search bar redirects to `/oglasi?q=...`
- Category cards redirect to filtered listing pages
- Page is mobile responsive

---

## 13.2 Listing Browse Page `/oglasi`

### Goal

Allow users to find gear quickly.

### Layout

Desktop:

- Left sidebar filters
- Main listing grid/list
- Sort dropdown at top
- Result count
- Search input

Mobile:

- Search input at top
- Filter button opens drawer
- Listing cards in single column

### Filters

Global filters:

- Query
- Category
- Price min
- Price max
- Currency
- Location/city
- Condition
- Seller type
- Brand
- Date posted
- With images only
- Active listings only
- Sold listings toggle

Category-specific filters:

For rods:

- Rod type
- Length min/max
- Casting weight min/max
- Number of sections
- Technique

For reels:

- Reel type
- Size
- Gear ratio
- Drag min/max
- Handle side

For lures:

- Lure type
- Weight min/max
- Length min/max
- Floating/sinking
- Target species

For electronics:

- Device type
- Screen size
- GPS yes/no
- Transducer included yes/no

For boats:

- Boat type
- Length min/max
- Material
- Registered yes/no

### Sorting

- Newest first
- Price low to high
- Price high to low
- Most viewed
- Relevance

### Listing Card Fields

- Main image
- Title
- Price
- Currency
- Location
- Condition
- Category
- Key specs
- Seller username
- Posted date
- Favorite button

### Acceptance Criteria

- URL preserves filters
- Pagination works
- Empty state appears when no results
- Filters do not require full page reload if using SPA behavior
- Browse page still works if JavaScript partially fails, where possible

---

## 13.3 Listing Detail Page `/oglasi/[slug]`

### Goal

Show all relevant details and let buyer contact seller.

### Sections

1. Image gallery
2. Title
3. Price
4. Status badge
5. Category breadcrumb
6. Key specs table
7. Description
8. Seller card
9. Contact actions
10. Safety warning
11. Similar listings
12. Report listing link

### Serbian UI Copy Examples

- `Cena`
- `Stanje`
- `Lokacija`
- `Prodavac`
- `Pošalji poruku`
- `Prikaži broj telefona`
- `Dodaj u omiljene`
- `Prijavi oglas`
- `Slični oglasi`

### Contact Behavior

If user not logged in:

- Show login prompt:
  - `Prijavite se da biste kontaktirali prodavca.`

If user is owner:

- Show owner actions:
  - `Izmeni oglas`
  - `Označi kao prodato`
  - `Arhiviraj oglas`

If listing sold:

- Hide new message form
- Show:
  - `Ovaj oglas je označen kao prodat.`

### Acceptance Criteria

- Listing page is SEO indexable
- Slug remains stable enough for sharing
- Listing view count increments with basic anti-spam protection
- Seller cannot contact themselves
- Report flow works

---

## 13.4 Create Listing Page `/postavi-oglas`

### Goal

Make listing creation simple while capturing useful structured data.

### Steps

Use either a single form with sections or a multi-step flow.

Recommended MVP: multi-step form.

#### Step 1: Category

User selects:

- Štapovi
- Mašinice
- Varalice
- Najlon, struna i predvezi
- Elektronika
- Čamci i oprema
- Odeća i obuća
- Torbe, kutije i pribor
- Kompleti
- Ostalo

#### Step 2: Basic Info

Fields:

- Title
- Description
- Brand
- Model
- Condition
- Price
- Currency
- Location

#### Step 3: Specific Details

Render dynamic fields based on category.

#### Step 4: Images

- Upload up to 10 images
- Reorder images
- First image is cover
- Delete image

#### Step 5: Review

- Preview listing
- Confirm listing rules
- Submit

### Validation

Title:

- Required
- Min 8 chars
- Max 120 chars

Description:

- Required
- Min 20 chars
- Max 5000 chars

Price:

- Required
- Integer or decimal depending implementation
- Must be positive
- Currency: RSD or EUR

Images:

- Max 10
- Max file size 8 MB each
- Allowed: JPG, PNG, WebP
- Convert to WebP server-side
- Strip EXIF

### Acceptance Criteria

- Dynamic fields change by category
- Form autosaves draft locally or server-side if practical
- Invalid fields show Serbian error messages
- Successful submit leads to confirmation page
- Listing status is `pending_review` unless auto-approval is enabled

---

## 13.5 User Dashboard `/nalog`

### Sections

- My active listings
- Pending listings
- Sold listings
- Messages
- Favorites
- Saved searches
- Profile settings

### Acceptance Criteria

- User sees only their own private dashboard data
- User can edit own listing
- User can mark listing as sold
- User can archive listing
- User can update profile and phone visibility

---

## 13.6 Public Seller Profile `/prodavci/[username]`

### Fields

- Username
- Avatar
- Location
- Member since
- Bio
- Fishing styles
- Active listings count
- Sold listings count
- Average rating
- Reviews
- Active listings

### Serbian Labels

- `Član od`
- `Aktivni oglasi`
- `Prodati oglasi`
- `Ocena`
- `Recenzije`
- `Stilovi ribolova`

### Acceptance Criteria

- Email is never shown
- Phone shown only if user allows public visibility
- Profile page includes public listings
- Suspended users do not show public profile

---

## 13.7 Messages `/nalog/poruke`

### MVP Messaging Model

Simple asynchronous inbox.

No WebSockets required.

### Features

- List conversations
- Conversation detail
- Send message
- Email notification on new message
- Mark messages read
- Block messaging if listing sold/archived

### Conversation Rules

- Conversation is between buyer and seller
- Conversation is linked to one listing
- One conversation per buyer/seller/listing combination
- Listing owner cannot message self
- Admin can view messages only if necessary for moderation and only through explicit admin tooling

### Acceptance Criteria

- Messages are persisted
- Unread count works
- Users only see their conversations
- Rate limit message creation
- Basic spam prevention exists

---

## 13.8 Admin Dashboard

### Goals

Allow safe manual moderation.

### Admin Dashboard Metrics

Show:

- Pending listings
- Active listings
- New users last 7 days
- Reports unresolved
- Messages sent last 7 days
- Listings created last 7 days

### Admin Listing Moderation

Listing table:

- ID
- Title
- Seller
- Category
- Price
- Status
- Created date
- Actions

Actions:

- View
- Approve
- Reject
- Edit
- Archive
- Feature
- Delete hard only for severe abuse or testing data

### Reject Flow

Admin chooses reason:

- `Nedostaju informacije`
- `Neodgovarajuća kategorija`
- `Zabranjen predmet`
- `Sumnja na prevaru`
- `Dupliran oglas`
- `Neprimeren sadržaj`
- `Ostalo`

Seller receives notification with reason.

### Acceptance Criteria

- Admin routes require admin role
- Admin actions create audit log entries
- Reject reason is stored
- User receives email on approve/reject
- Admin cannot accidentally delete data without confirmation

---

## 14. Categories and Attributes

## 14.1 Category Tree

Use this initial taxonomy.

```text
Fishing Gear
├── Rods
│   ├── Spinning rods
│   ├── Feeder rods
│   ├── Carp rods
│   ├── Match rods
│   ├── Fly rods
│   ├── Telescopic rods
│   └── Other rods
├── Reels
│   ├── Spinning reels
│   ├── Baitcasting reels
│   ├── Carp reels
│   ├── Fly reels
│   └── Other reels
├── Lures
│   ├── Soft plastics
│   ├── Jig heads
│   ├── Crankbaits
│   ├── Jerkbaits
│   ├── Spinners
│   ├── Spoons
│   ├── Topwater
│   └── Other lures
├── Lines and terminal tackle
│   ├── Braided line
│   ├── Monofilament
│   ├── Fluorocarbon
│   ├── Hooks
│   ├── Swivels/snaps
│   ├── Leaders
│   └── Weights
├── Electronics
│   ├── Fish finders
│   ├── Sonars
│   ├── GPS devices
│   ├── Batteries
│   └── Accessories
├── Boats and watercraft
│   ├── Inflatable boats
│   ├── Aluminum boats
│   ├── Kayaks
│   ├── Electric motors
│   └── Boat accessories
├── Bags, boxes and accessories
│   ├── Tackle boxes
│   ├── Fishing bags
│   ├── Landing nets
│   ├── Rod holders
│   ├── Rod pods
│   └── Tools
├── Clothing and footwear
│   ├── Waders
│   ├── Boots
│   ├── Jackets
│   ├── Polarized glasses
│   └── Gloves
├── Bundles
└── Other
```

### Serbian Category Labels

```text
Štapovi
Mašinice
Varalice
Najlon, struna i završni pribor
Elektronika
Čamci i oprema
Torbe, kutije i pribor
Odeća i obuća
Kompleti
Ostalo
```

---

## 14.2 Global Listing Attributes

All listings should support:

| Field | Type | Required | Notes |
|---|---:|---:|---|
| category_id | UUID/int | yes | Leaf category preferred |
| title | string | yes | Serbian text expected |
| description | text | yes | User-generated |
| brand_id | UUID/int/null | no | Can be unknown |
| brand_name_custom | string/null | no | If brand not found |
| model | string/null | no | Important for search |
| condition | enum | yes | See condition enum |
| price_amount | integer/decimal | yes | Store minor units if possible |
| currency | enum | yes | RSD/EUR |
| city | string | yes | Use normalized city if possible |
| municipality | string/null | no | Optional |
| phone_visible | boolean | no | Default false |
| allow_messages | boolean | yes | Default true |
| status | enum | yes | draft/pending/active/etc. |
| attributes | JSONB | yes | Category-specific fields |
| created_at | datetime | yes | UTC |
| updated_at | datetime | yes | UTC |

---

## 14.3 Condition Enum

Use Serbian labels in UI, English values in DB.

```text
new                       Novo
like_new                  Kao novo
used_excellent            Polovno - odlično
used_good                 Polovno - dobro
used_fair                 Polovno - korektno
for_parts_or_repair       Za delove/popravku
```

---

## 14.4 Rod Attributes

For categories under rods.

| Field | Type | Required | Serbian Label | Example |
|---|---:|---:|---|---|
| rod_type | enum | yes | Tip štapa | spinning |
| length_cm | integer | yes | Dužina | 240 |
| casting_weight_min_g | integer | no | Težina bacanja od | 5 |
| casting_weight_max_g | integer | no | Težina bacanja do | 25 |
| sections | integer | no | Broj delova | 2 |
| transport_length_cm | integer | no | Transportna dužina | 125 |
| rod_power | enum | no | Snaga | medium |
| rod_action | enum | no | Akcija | fast |
| technique | enum/list | no | Tehnika | spin |
| target_species | list | no | Ciljana riba | smuđ, štuka |
| material | enum | no | Materijal | carbon |

Rod type enum:

```text
spinning
feeder
carp
match
fly
telescopic
baitcasting
other
```

Rod power enum:

```text
ultralight
light
medium_light
medium
medium_heavy
heavy
extra_heavy
```

Rod action enum:

```text
slow
moderate
moderate_fast
fast
extra_fast
```

---

## 14.5 Reel Attributes

| Field | Type | Required | Serbian Label | Example |
|---|---:|---:|---|---|
| reel_type | enum | yes | Tip mašinice | spinning |
| reel_size | string/int | yes | Veličina | 2500 |
| gear_ratio | string | no | Prenos | 6.2:1 |
| bearings_count | integer | no | Broj ležajeva | 7 |
| max_drag_kg | decimal | no | Maksimalna kočnica | 9 |
| weight_g | integer | no | Težina | 210 |
| spool_material | enum | no | Materijal špulne | aluminum |
| handle_side | enum | no | Ručica | left_right |
| spare_spool_included | boolean | no | Rezervna špulna | true |

Reel type enum:

```text
spinning
baitcasting
carp
fly
multiplier
other
```

Handle side enum:

```text
left
right
left_right
```

---

## 14.6 Lure Attributes

| Field | Type | Required | Serbian Label | Example |
|---|---:|---:|---|---|
| lure_type | enum | yes | Tip varalice | soft_plastic |
| weight_g | decimal | no | Težina | 12 |
| length_mm | integer | no | Dužina | 90 |
| color | string | no | Boja | natural |
| buoyancy | enum | no | Plovnost | sinking |
| diving_depth_m | decimal | no | Dubina rada | 1.5 |
| pack_quantity | integer | no | Količina u pakovanju | 5 |
| target_species | list | no | Ciljana riba | smuđ |

Lure type enum:

```text
soft_plastic
jig_head
crankbait
jerkbait
spinner
spoon
topwater
swimbait
blade_bait
other
```

Buoyancy enum:

```text
floating
suspending
slow_sinking
sinking
not_applicable
```

---

## 14.7 Electronics Attributes

| Field | Type | Required | Serbian Label | Example |
|---|---:|---:|---|---|
| device_type | enum | yes | Tip uređaja | fish_finder |
| screen_size_inches | decimal | no | Veličina ekrana | 7 |
| gps_included | boolean | no | GPS | true |
| transducer_included | boolean | no | Sonda uključena | true |
| battery_included | boolean | no | Baterija uključena | false |
| warranty_valid | boolean | no | Garancija važi | false |
| condition_notes | string | no | Napomena o stanju | Sitne ogrebotine |

Device type enum:

```text
fish_finder
sonar
gps
battery
charger
transducer
other
```

---

## 14.8 Boats and Watercraft Attributes

| Field | Type | Required | Serbian Label | Example |
|---|---:|---:|---|---|
| boat_type | enum | yes | Tip plovila | inflatable |
| length_cm | integer | no | Dužina | 300 |
| width_cm | integer | no | Širina | 140 |
| material | enum | no | Materijal | pvc |
| capacity_persons | integer | no | Kapacitet osoba | 3 |
| motor_included | boolean | no | Motor uključen | false |
| registration_required | boolean | no | Registracija potrebna | false |
| registered_until | date | no | Registrovan do | 2026-09-01 |

Boat type enum:

```text
inflatable
aluminum
kayak
belly_boat
electric_motor
accessory
other
```

---

## 14.9 Clothing and Footwear Attributes

| Field | Type | Required | Serbian Label | Example |
|---|---:|---:|---|---|
| clothing_type | enum | yes | Tip | waders |
| size | string | no | Veličina | XL |
| shoe_size_eu | integer | no | Broj obuće | 43 |
| waterproof | boolean | no | Vodootporno | true |
| gender | enum | no | Pol | unisex |

---

## 15. Database Model

Use PostgreSQL.

IDs can be UUID or integer. UUID is preferable for public-facing resources, but integer IDs are acceptable for MVP if slugs are used publicly.

### 15.1 Users Table

```sql
users
- id
- email
- password_hash
- username
- role
- status
- email_verified_at
- last_login_at
- created_at
- updated_at
```

Role enum:

```text
user
admin
super_admin
```

Status enum:

```text
active
suspended
deleted
pending_verification
```

Constraints:

- Unique email
- Unique username
- Email lowercase normalized
- Username URL-safe

Indexes:

- email unique
- username unique
- role
- status
- created_at

---

### 15.2 User Profiles Table

```sql
user_profiles
- id
- user_id
- display_name
- avatar_url
- city
- municipality
- phone_number_encrypted
- phone_visible
- bio
- fishing_styles JSONB
- member_badges JSONB
- created_at
- updated_at
```

Fishing styles examples:

```json
["spin", "feeder", "carp", "fly"]
```

Do not publicly expose raw phone unless user explicitly allows.

---

### 15.3 Categories Table

```sql
categories
- id
- parent_id
- slug
- name_sr
- name_en
- description_sr
- sort_order
- is_active
- created_at
- updated_at
```

Indexes:

- slug unique
- parent_id
- is_active

---

### 15.4 Attribute Definitions Table

```sql
attribute_definitions
- id
- category_id
- key
- label_sr
- field_type
- unit
- required
- filterable
- searchable
- options JSONB
- validation JSONB
- sort_order
- created_at
- updated_at
```

Field types:

```text
string
integer
decimal
boolean
enum
multi_enum
date
```

This table enables dynamic category-specific listing forms.

Example options:

```json
{
  "options": [
    {"value": "spinning", "label_sr": "Spin"},
    {"value": "feeder", "label_sr": "Feeder"}
  ]
}
```

---

### 15.5 Brands Table

```sql
brands
- id
- name
- slug
- aliases JSONB
- category_scope JSONB
- is_verified
- created_at
- updated_at
```

Examples:

- Shimano
- Daiwa
- Savage Gear
- Rapala
- Major Craft
- Abu Garcia
- Sakura
- Gunki
- Delphin
- Formax
- Okuma
- Favorite
- Westin

Indexes:

- name
- slug unique
- aliases GIN optional

---

### 15.6 Listings Table

```sql
listings
- id
- public_id
- seller_id
- category_id
- brand_id
- brand_name_custom
- title
- slug
- description
- condition
- price_amount
- currency
- city
- municipality
- status
- attributes JSONB
- allow_messages
- phone_visible
- is_featured
- featured_until
- view_count
- favorite_count
- message_count
- sold_at
- sold_to_user_id
- rejection_reason
- approved_at
- approved_by_admin_id
- expires_at
- created_at
- updated_at
```

Status enum:

```text
draft
pending_review
active
rejected
sold
expired
archived
deleted
```

Indexes:

- seller_id
- category_id
- brand_id
- status
- city
- condition
- currency
- price_amount
- is_featured
- created_at
- updated_at
- slug unique
- public_id unique
- attributes GIN
- full text search vector index

Important:

- Public URLs should use slug, not raw DB ID.
- Preserve slug uniqueness by adding short suffix if needed.

---

### 15.7 Listing Images Table

```sql
listing_images
- id
- listing_id
- storage_key
- original_filename
- content_type
- width
- height
- size_bytes
- sort_order
- is_cover
- created_at
```

Rules:

- Max 10 images per listing
- One image should be cover
- If no cover set, first image is cover

---

### 15.8 Favorites Table

```sql
favorites
- id
- user_id
- listing_id
- created_at
```

Constraints:

- Unique user_id + listing_id

---

### 15.9 Saved Searches Table

```sql
saved_searches
- id
- user_id
- name
- query
- filters JSONB
- notification_enabled
- last_notified_at
- created_at
- updated_at
```

Example filters:

```json
{
  "category": "reels",
  "brand_id": "uuid",
  "price_min": 50,
  "price_max": 150,
  "currency": "EUR",
  "city": "Beograd",
  "attributes": {
    "reel_size": "2500"
  }
}
```

---

### 15.10 Conversations Table

```sql
conversations
- id
- listing_id
- buyer_id
- seller_id
- last_message_at
- buyer_unread_count
- seller_unread_count
- created_at
- updated_at
```

Constraints:

- Unique listing_id + buyer_id + seller_id

---

### 15.11 Messages Table

```sql
messages
- id
- conversation_id
- sender_id
- body
- read_at
- created_at
```

Rules:

- Body max 3000 chars
- No attachments in MVP
- Sanitize output to avoid XSS

---

### 15.12 Reviews Table

```sql
reviews
- id
- listing_id
- reviewer_id
- reviewee_id
- rating
- comment
- status
- created_at
- updated_at
```

Rating:

- 1–5

Status:

```text
published
hidden
disputed
deleted
```

Rules:

- Only allow reviews after listing is sold and buyer/seller relationship exists.
- MVP can simplify by allowing seller to select buyer when marking sold.

---

### 15.13 Reports Table

```sql
reports
- id
- reporter_id
- listing_id
- reported_user_id
- reason
- description
- status
- resolved_by_admin_id
- resolution_note
- created_at
- resolved_at
```

Reason enum:

```text
scam
wrong_category
duplicate
prohibited_item
offensive
spam
other
```

Status enum:

```text
open
reviewing
resolved_action_taken
resolved_no_action
rejected
```

---

### 15.14 Audit Logs Table

```sql
audit_logs
- id
- actor_user_id
- action
- entity_type
- entity_id
- metadata JSONB
- ip_address
- user_agent
- created_at
```

Examples:

- `listing.approved`
- `listing.rejected`
- `user.suspended`
- `report.resolved`
- `admin.login`

---

### 15.15 Analytics Events Table

```sql
analytics_events
- id
- user_id
- anonymous_id
- event_name
- entity_type
- entity_id
- properties JSONB
- ip_address_hash
- user_agent
- created_at
```

MVP events:

- `page_viewed`
- `listing_viewed`
- `search_performed`
- `filter_applied`
- `listing_created`
- `listing_approved`
- `favorite_added`
- `saved_search_created`
- `seller_contacted`
- `message_sent`
- `listing_marked_sold`

Do not overbuild analytics. A simple event table is enough.

---

## 16. API Specification

Use REST-style JSON API.

Base path:

```text
/api/v1
```

### 16.1 Common API Conventions

All API responses should use JSON.

Success example:

```json
{
  "data": {},
  "meta": {}
}
```

Error example:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Podaci nisu ispravni.",
    "details": {}
  }
}
```

Use Serbian messages for user-facing errors.

Use English error codes.

### 16.2 Pagination

Request:

```text
?page=1&page_size=24
```

Response meta:

```json
{
  "meta": {
    "page": 1,
    "page_size": 24,
    "total": 321,
    "total_pages": 14
  }
}
```

Max page size:

- Public browse: 48
- Admin: 100

---

## 16.3 Auth Endpoints

### POST `/auth/register`

Request:

```json
{
  "email": "user@example.com",
  "username": "pecaros123",
  "password": "StrongPassword123!",
  "accepted_terms": true
}
```

Response:

```json
{
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "username": "pecaros123",
      "role": "user",
      "email_verified": false
    }
  }
}
```

Rules:

- Email unique
- Username unique
- Password min 8 chars
- accepted_terms must be true
- Send verification email

---

### POST `/auth/login`

Request:

```json
{
  "email": "user@example.com",
  "password": "StrongPassword123!"
}
```

Response:

```json
{
  "data": {
    "user": {
      "id": "uuid",
      "username": "pecaros123",
      "role": "user"
    }
  }
}
```

Auth strategy:

- Prefer secure HttpOnly cookie session/JWT
- Use CSRF protection if cookie-based
- Do not store JWT in localStorage if avoidable

---

### POST `/auth/logout`

Logs user out.

---

### POST `/auth/forgot-password`

Request:

```json
{
  "email": "user@example.com"
}
```

Always return generic success.

---

### POST `/auth/reset-password`

Request:

```json
{
  "token": "token",
  "new_password": "NewStrongPassword123!"
}
```

---

### POST `/auth/verify-email`

Request:

```json
{
  "token": "token"
}
```

---

### GET `/auth/me`

Returns current user.

---

## 16.4 Category Endpoints

### GET `/categories`

Returns active categories with tree.

### GET `/categories/{slug}`

Returns category detail and attribute definitions.

Response example:

```json
{
  "data": {
    "id": "uuid",
    "slug": "masinice",
    "name_sr": "Mašinice",
    "attributes": [
      {
        "key": "reel_size",
        "label_sr": "Veličina",
        "field_type": "string",
        "required": true,
        "filterable": true
      }
    ]
  }
}
```

---

## 16.5 Brand Endpoints

### GET `/brands`

Query params:

- `q`
- `category_id`

Returns matching brands.

### POST `/admin/brands`

Admin only.

---

## 16.6 Listing Endpoints

### GET `/listings`

Query params:

```text
q
category
brand_id
condition
price_min
price_max
currency
city
status
with_images
sort
page
page_size
attributes[reel_size]
attributes[length_cm_min]
attributes[length_cm_max]
```

Public default:

- Only `active` listings
- Exclude `sold`, unless explicitly requested

Response listing card:

```json
{
  "id": "uuid",
  "public_id": "abc123",
  "title": "Shimano Stradic FL 2500",
  "slug": "shimano-stradic-fl-2500-abc123",
  "price_amount": 140,
  "currency": "EUR",
  "city": "Beograd",
  "condition": "used_excellent",
  "cover_image_url": "https://...",
  "seller": {
    "username": "zanderhunter",
    "rating": 4.9
  },
  "category": {
    "slug": "masinice",
    "name_sr": "Mašinice"
  },
  "key_attributes": {
    "reel_size": "2500",
    "gear_ratio": "6.0:1"
  },
  "created_at": "2026-06-16T12:00:00Z"
}
```

---

### GET `/listings/{slug}`

Returns full listing.

Also increments view count with anti-spam guard.

---

### POST `/listings`

Auth required.

Request:

```json
{
  "category_id": "uuid",
  "title": "Shimano Stradic FL 2500",
  "description": "Mašinica u odličnom stanju, malo korišćena...",
  "brand_id": "uuid",
  "model": "Stradic FL 2500",
  "condition": "used_excellent",
  "price_amount": 140,
  "currency": "EUR",
  "city": "Beograd",
  "municipality": "Novi Beograd",
  "allow_messages": true,
  "phone_visible": false,
  "attributes": {
    "reel_type": "spinning",
    "reel_size": "2500",
    "gear_ratio": "6.0:1",
    "max_drag_kg": 9
  }
}
```

Response:

```json
{
  "data": {
    "id": "uuid",
    "status": "pending_review",
    "slug": "shimano-stradic-fl-2500-abc123"
  }
}
```

---

### PATCH `/listings/{id}`

Auth required.

Rules:

- Owner can edit own listing
- Admin can edit any listing
- If active listing changes important fields, set status back to pending_review:
  - title
  - description
  - category
  - price
  - images
  - prohibited-risk attributes

---

### DELETE `/listings/{id}`

Soft delete/archive.

---

### POST `/listings/{id}/mark-sold`

Auth required.

Request:

```json
{
  "sold_to_user_id": "uuid-or-null"
}
```

---

### POST `/listings/{id}/archive`

Auth required.

---

### POST `/listings/{id}/favorite`

Auth required.

---

### DELETE `/listings/{id}/favorite`

Auth required.

---

### POST `/listings/{id}/report`

Auth required.

Request:

```json
{
  "reason": "scam",
  "description": "Prodavac traži uplatu unapred i odbija proveru."
}
```

---

## 16.7 Image Endpoints

### POST `/listings/{id}/images`

Auth required.

Multipart upload.

Rules:

- Owner/admin only
- Max 10 images per listing
- Validate content type
- Process image in background or immediately
- Store original only if needed; MVP can store processed image + thumbnail

Response:

```json
{
  "data": {
    "id": "uuid",
    "url": "https://...",
    "sort_order": 1,
    "is_cover": true
  }
}
```

---

### PATCH `/listings/{id}/images/reorder`

Request:

```json
{
  "image_ids": ["uuid1", "uuid2", "uuid3"]
}
```

---

### DELETE `/listings/{id}/images/{image_id}`

---

## 16.8 Saved Search Endpoints

### GET `/saved-searches`

Auth required.

### POST `/saved-searches`

Auth required.

Request:

```json
{
  "name": "Vanford 2500 do 150e",
  "query": "Vanford 2500",
  "filters": {
    "category": "masinice",
    "price_max": 150,
    "currency": "EUR"
  },
  "notification_enabled": true
}
```

### DELETE `/saved-searches/{id}`

---

## 16.9 Message Endpoints

### GET `/conversations`

Auth required.

### GET `/conversations/{id}`

Auth required.

### POST `/listings/{id}/messages`

Auth required.

Request:

```json
{
  "body": "Pozdrav, da li je mašinica još dostupna?"
}
```

Rules:

- Creates conversation if needed
- Sends email notification to seller
- Rate limit

### POST `/conversations/{id}/messages`

Auth required.

---

## 16.10 Review Endpoints

### POST `/reviews`

Auth required.

Request:

```json
{
  "listing_id": "uuid",
  "reviewee_id": "uuid",
  "rating": 5,
  "comment": "Sve korektno, preporuka za saradnju."
}
```

Rules:

- Only after sale
- One review per reviewer/listing/reviewee pair

---

## 16.11 Admin Endpoints

Prefix:

```text
/admin
```

All require admin role.

### GET `/admin/dashboard`

Returns metrics.

### GET `/admin/listings`

Filters:

- status
- category
- seller
- created_at range

### POST `/admin/listings/{id}/approve`

### POST `/admin/listings/{id}/reject`

Request:

```json
{
  "reason": "Nedostaju informacije o stanju opreme."
}
```

### POST `/admin/listings/{id}/feature`

Request:

```json
{
  "featured_until": "2026-07-01T00:00:00Z"
}
```

### POST `/admin/users/{id}/suspend`

Request:

```json
{
  "reason": "Spam poruke i sumnjive aktivnosti."
}
```

### GET `/admin/reports`

### POST `/admin/reports/{id}/resolve`

Request:

```json
{
  "status": "resolved_action_taken",
  "resolution_note": "Oglas uklonjen."
}
```

---

## 17. Search and Filtering

### 17.1 MVP Search Strategy

Use PostgreSQL.

Search fields:

- Listing title
- Description
- Brand name
- Custom brand name
- Model
- Category name
- City
- Selected attributes

Implement a weighted search vector:

High weight:

- title
- brand
- model

Medium weight:

- category
- key attributes

Low weight:

- description
- city

### 17.2 Basic Search Behavior

Search query `stradic 2500` should match:

- Title: `Shimano Stradic FL 2500`
- Model: `Stradic FL 2500`
- Description mentioning `stradic`
- Brand Shimano if query includes Shimano

### 17.3 Filtering

Filtering should combine:

- Standard SQL columns for global filters
- JSONB attribute queries for category-specific filters

Examples:

Rod length between 210 and 270:

```sql
(attributes->>'length_cm')::int BETWEEN 210 AND 270
```

Reel size equals 2500:

```sql
attributes->>'reel_size' = '2500'
```

Lure weight between 10g and 20g:

```sql
(attributes->>'weight_g')::numeric BETWEEN 10 AND 20
```

### 17.4 Performance Indexes

Create indexes:

```sql
CREATE INDEX idx_listings_status_created ON listings(status, created_at DESC);
CREATE INDEX idx_listings_category_status ON listings(category_id, status);
CREATE INDEX idx_listings_price ON listings(currency, price_amount);
CREATE INDEX idx_listings_city ON listings(city);
CREATE INDEX idx_listings_attributes_gin ON listings USING GIN (attributes);
CREATE INDEX idx_listings_search_vector ON listings USING GIN (search_vector);
```

If generated search vector is used:

```sql
ALTER TABLE listings ADD COLUMN search_vector tsvector;
```

Update via trigger or application.

### 17.5 Sorting Rules

Featured listings:

- Can appear above regular listings, but must be clearly marked `Istaknuto`
- Avoid making search unusable by over-promoting featured listings

Default sort:

1. Featured active listings
2. Newest active listings

---

## 18. Image Processing

### 18.1 Requirements

Image upload should be robust and safe.

Rules:

- Max 10 images per listing
- Max 8 MB per image
- Allowed formats: JPG, JPEG, PNG, WebP
- Convert to WebP
- Generate thumbnail
- Strip EXIF metadata
- Reject suspicious files
- Store dimensions and file size

### 18.2 Image Sizes

Generate:

- `original_web`: max 1600px longest side
- `card`: 600x450 crop/fit
- `thumbnail`: 200x150 crop/fit

### 18.3 Storage Key Convention

```text
listings/{listing_public_id}/{image_id}/original.webp
listings/{listing_public_id}/{image_id}/card.webp
listings/{listing_public_id}/{image_id}/thumb.webp
```

### 18.4 Image Upload UX

- Show upload progress
- Show previews
- Allow reordering
- Allow delete before submit
- Mark cover image

### 18.5 Placeholder Image

If listing has no image:

- Show neutral placeholder
- Do not break layout

---

## 19. Authentication and Authorization

### 19.1 Registration

Required:

- Email
- Username
- Password
- Terms accepted

Optional during profile setup:

- Display name
- City
- Phone
- Fishing styles

### 19.2 Password Rules

Minimum:

- 8 characters
- Reject common passwords if easy
- Hash with Argon2 or bcrypt
- Never store plaintext password

### 19.3 Session Strategy

Preferred:

- HttpOnly secure cookie
- SameSite=Lax or Strict
- CSRF protection if needed

Alternative:

- Bearer JWT with refresh token, but avoid localStorage if possible

### 19.4 Authorization Rules

User:

- Create listings
- Edit own listings
- Delete/archive own listings
- Message other users
- Favorite listings
- Save searches
- Report listings
- Review after sale

Admin:

- Everything user can do
- Moderate listings
- Manage reports
- Suspend users
- Manage categories/brands
- View dashboard

Super admin:

- Manage admins
- Dangerous operations

### 19.5 Email Verification

MVP behavior:

- Allow registration
- Require email verification before:
  - Creating listing
  - Sending many messages
  - Saving searches with notifications

Simpler option:

- Require verification before listing creation

Recommended:

- Require verification before listing creation

---

## 20. Notifications

### 20.1 Email Notifications MVP

Send email for:

- Registration verification
- Password reset
- Listing approved
- Listing rejected
- New message
- Saved search match, optional
- Report resolution, optional

### 20.2 Serbian Email Templates

#### Verify Email

Subject:

```text
Potvrdite email adresu — Sve Za Pecanje
```

Body:

```text
Zdravo,

Kliknite na dugme ispod da potvrdite svoju email adresu.

Potvrdi email

Ako niste otvorili nalog, ignorišite ovu poruku.
```

#### Listing Approved

Subject:

```text
Vaš oglas je objavljen
```

Body:

```text
Vaš oglas "{listing_title}" je odobren i sada je vidljiv drugim korisnicima.
```

#### New Message

Subject:

```text
Nova poruka za oglas "{listing_title}"
```

Body:

```text
Korisnik {sender_username} vam je poslao poruku za oglas "{listing_title}".

Otvorite poruke da odgovorite.
```

---

## 21. Moderation

### 21.1 Listing Review Modes

Support configuration:

```text
LISTING_REVIEW_MODE=manual
```

Modes:

- `manual`: all new listings pending review
- `auto`: listings active immediately, admin can moderate after reports
- `trusted_users_auto`: users with good history auto-approved

MVP recommended:

- Start with `manual`
- Later switch trusted users to auto

### 21.2 Moderation Rules

Admin should reject listings that:

- Are not fishing-related
- Have misleading title
- Have offensive content
- Sell prohibited items
- Look like scams
- Use stolen images
- Use fake brands/counterfeits
- Lack enough information

### 21.3 Admin Audit

Every admin action should create an audit log.

Required metadata:

- Admin ID
- Action
- Entity type
- Entity ID
- Timestamp
- Reason if provided

---

## 22. Trust and Safety

### 22.1 Safety Tips Page

Create `/saveti-za-bezbednost`.

Serbian copy should include:

```text
Saveti za bezbednu kupovinu

- Proverite opremu uživo kada god je moguće.
- Ne šaljite novac unapred nepoznatim prodavcima.
- Obratite pažnju na oglase sa nerealno niskim cenama.
- Sačuvajte komunikaciju sa prodavcem.
- Prijavite sumnjive oglase administratorima.
- Kod skuplje opreme proverite serijski broj i stanje.
```

### 22.2 Contact Protection

- Do not show email publicly
- Phone number hidden unless seller opts in
- If phone is visible, consider showing it only to logged-in users
- Track phone reveal event
- Rate limit phone reveal endpoint

### 22.3 Spam Prevention

MVP:

- Rate limit registration
- Rate limit login attempts
- Rate limit messages
- Rate limit listing creation
- Basic CAPTCHA can be added later if spam appears
- Admin can suspend users

Suggested limits:

- Login: 5 attempts per 15 minutes per IP/email
- Messages: 20 per hour per user
- Listing creation: 10 per day per user
- Reports: 20 per day per user

---

## 23. SEO Requirements

### 23.1 SEO-Friendly Listing URLs

Example:

```text
/oglasi/shimano-stradic-fl-2500-abc123
```

### 23.2 Meta Title

Listing:

```text
Shimano Stradic FL 2500 — Mašinice | Sve Za Pecanje
```

Category:

```text
Polovne mašinice za ribolov | Sve Za Pecanje
```

### 23.3 Meta Description

Listing:

```text
Shimano Stradic FL 2500, polovno - odlično, Beograd, 140 €. Pogledajte oglas i kontaktirajte prodavca.
```

### 23.4 Sitemap

Generate:

- Homepage
- Categories
- Active listings
- Static pages

Endpoint:

```text
/sitemap.xml
```

### 23.5 Robots

Create:

```text
/robots.txt
```

Allow public pages. Disallow dashboard/admin.

### 23.6 Structured Data

Post-MVP or MVP-light:

- Use basic schema.org Product/Offer for listing pages if straightforward

---

## 24. UI Components

### 24.1 Core Components

Create reusable components:

- `Button`
- `Input`
- `Textarea`
- `Select`
- `Checkbox`
- `Modal`
- `Drawer`
- `Badge`
- `Price`
- `ImageGallery`
- `ListingCard`
- `SellerCard`
- `FilterSidebar`
- `CategorySelect`
- `AttributeField`
- `Pagination`
- `EmptyState`
- `LoadingSkeleton`
- `Alert`
- `ConfirmDialog`

### 24.2 Listing Card

Fields:

- Cover image
- Title
- Price
- Location
- Condition
- Key specs
- Favorite icon
- Featured badge if applicable

### 24.3 Badges

Serbian labels:

```text
Novo
Kao novo
Odlično
Dobro
Korektno
Za delove
Istaknuto
Prodato
Na čekanju
```

### 24.4 Empty States

Browse no results:

```text
Nema oglasa za izabrane filtere.
Pokušajte da proširite pretragu ili sačuvajte pretragu da vas obavestimo kada se pojavi novi oglas.
```

No user listings:

```text
Još nemate postavljenih oglasa.
Postavite prvi oglas i pronađite kupca među ribolovcima.
```

No messages:

```text
Nemate poruke.
Kada kontaktirate prodavca ili neko kontaktira vas, poruke će se prikazati ovde.
```

---

## 25. Validation Messages in Serbian

Use Serbian validation messages.

Examples:

```text
Ovo polje je obavezno.
Naslov mora imati najmanje 8 karaktera.
Opis mora imati najmanje 20 karaktera.
Cena mora biti veća od nule.
Izaberite kategoriju.
Izaberite stanje opreme.
Dozvoljeni formati slika su JPG, PNG i WebP.
Slika ne sme biti veća od 8 MB.
Morate prihvatiti uslove korišćenja.
Ne možete poslati poruku za sopstveni oglas.
```

---

## 26. Seed Data

Create seed script.

### 26.1 Categories

Seed all MVP categories.

### 26.2 Brands

Seed common fishing brands:

```text
Shimano
Daiwa
Rapala
Savage Gear
Abu Garcia
Okuma
Major Craft
Favorite
Westin
Gunki
Sakura
Delphin
Formax
Berkley
Spro
Fox Rage
Illex
Duo
Megabass
Lucky Craft
Owner
VMC
Mustad
Gamakatsu
St. Croix
Sportex
Garmin
Lowrance
Humminbird
Minn Kota
```

### 26.3 Cities

Seed major Serbian cities:

```text
Beograd
Novi Sad
Niš
Kragujevac
Subotica
Zrenjanin
Leskovac
Pančevo
Čačak
Kraljevo
Novi Pazar
Smederevo
Valjevo
Kruševac
Šabac
Sombor
Kikinda
Užice
Loznica
Vranje
Zaječar
Sremska Mitrovica
Jagodina
Požarevac
Pirot
```

### 26.4 Demo Listings

Create demo listings for local dev only:

1. Shimano Stradic FL 2500
2. Daiwa Legalis LT 3000
3. Major Craft spinning rod 2.40m 7–28g
4. Savage Gear soft lures bundle
5. Rapala wobblers bundle
6. Lowrance fish finder
7. Inflatable boat 300cm
8. Carp rod set
9. Feeder rod
10. Polarized glasses

Do not seed fake production listings unless clearly marked demo.

---

## 27. Environment Variables

Create `.env.example`.

```env
APP_ENV=development
APP_NAME=Sve Za Pecanje
APP_URL=https://svezapecanje.rs
API_URL=http://localhost:8001

DATABASE_URL=postgresql+asyncpg://postgres:postgres@postgres:5432/fishing_marketplace
REDIS_URL=redis://redis:6379/0

SECRET_KEY=change-me
JWT_SECRET=change-me
SESSION_COOKIE_NAME=ro_session

CORS_ALLOWED_ORIGINS=http://localhost:3001,https://svezapecanje.rs

EMAIL_FROM=noreply@example.com
SMTP_HOST=mailpit
SMTP_PORT=1025
SMTP_USERNAME=
SMTP_PASSWORD=
SMTP_USE_TLS=false

S3_ENDPOINT_URL=http://minio:9000
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
S3_BUCKET=fishing-marketplace
S3_PUBLIC_URL=http://localhost:9000/fishing-marketplace

LISTING_REVIEW_MODE=manual
MAX_LISTING_IMAGES=10
MAX_IMAGE_SIZE_MB=8

RATE_LIMIT_ENABLED=true
```

---

## 28. Docker Compose

Local services:

- backend
- frontend
- postgres
- redis
- minio
- mailpit
- worker

The app should start with:

```bash
docker compose up --build
```

Add commands:

```bash
make dev
make migrate
make seed
make test
make create-admin
```

---

## 29. Backend Implementation Details

### 29.1 FastAPI App

Required:

- App factory or clean `main.py`
- CORS configured
- API router mounted at `/api/v1`
- Health endpoint

Health:

```text
GET /health
```

Response:

```json
{
  "status": "ok"
}
```

### 29.2 Database

Use:

- SQLAlchemy models
- Alembic migrations
- Async sessions if comfortable
- Clear repository/service boundaries, but do not overabstract

### 29.3 Services

Recommended services:

- `AuthService`
- `ListingService`
- `SearchService`
- `ImageService`
- `MessageService`
- `ModerationService`
- `EmailService`
- `NotificationService`
- `AnalyticsService`

### 29.4 Error Handling

Centralize API exceptions.

Error codes:

```text
UNAUTHORIZED
FORBIDDEN
NOT_FOUND
VALIDATION_ERROR
RATE_LIMITED
DUPLICATE_RESOURCE
LISTING_NOT_ACTIVE
IMAGE_LIMIT_EXCEEDED
INVALID_IMAGE_TYPE
ADMIN_REQUIRED
```

### 29.5 Logging

Use structured logs.

Do not log:

- Passwords
- Tokens
- Email verification tokens
- Password reset tokens
- Full private message bodies
- Full phone numbers

---

## 30. Frontend Implementation Details

### 30.1 Design Requirements

- Mobile-first
- Responsive
- Clean cards
- Fast filter UX
- No clutter
- Accessible buttons and labels
- Good image display
- Clear Serbian UI

### 30.2 State Management

Use:

- Server data fetching/query library
- Local state for forms
- URL params for listing filters
- Auth state from `/auth/me`

### 30.3 Forms

Use:

- React Hook Form
- Zod validation
- Serbian validation messages
- Dynamic attribute form based on category metadata

### 30.4 Pages Must Handle

- Loading state
- Error state
- Empty state
- Not found state
- Unauthorized state

### 30.5 Responsive Breakpoints

Mobile:

- Single-column listing cards
- Filter drawer

Tablet/desktop:

- Sidebar filters
- Grid/list toggle optional

---

## 31. Permissions Matrix

| Feature | Anonymous | User | Admin |
|---|---:|---:|---:|
| View active listings | yes | yes | yes |
| Search listings | yes | yes | yes |
| View seller profile | yes | yes | yes |
| Register | yes | n/a | n/a |
| Create listing | no | yes | yes |
| Edit own listing | no | yes | yes |
| Edit any listing | no | no | yes |
| Favorite listing | no | yes | yes |
| Save search | no | yes | yes |
| Send message | no | yes | yes |
| Report listing | no | yes | yes |
| Review user | no | conditional | yes |
| Approve listing | no | no | yes |
| Suspend user | no | no | yes |
| Manage categories | no | no | yes |

---

## 32. Listing Status State Machine

```text
draft
  -> pending_review
  -> archived

pending_review
  -> active
  -> rejected
  -> archived

active
  -> sold
  -> expired
  -> archived
  -> pending_review after major edit

rejected
  -> draft after user edits
  -> archived

sold
  -> archived

expired
  -> active after renewal
  -> archived

archived
  -> active only by explicit user/admin action if allowed

deleted
  -> terminal soft-deleted state
```

Rules:

- Public browse shows only `active`
- Seller dashboard shows all except `deleted`
- Admin sees all
- Sold listings are hidden from public search by default unless user enables sold toggle

---

## 33. Security Requirements

### 33.1 General

- Use HTTPS in production
- Secure cookies in production
- Validate all input server-side
- Sanitize rendered user-generated content
- Prevent XSS
- Prevent SQL injection by using ORM/query parameters
- Protect admin routes
- Rate limit sensitive endpoints
- Keep dependencies updated

### 33.2 File Upload Security

- Check MIME type
- Check file extension
- Decode image server-side to verify it is real
- Strip metadata
- Reject SVG for listing images
- Store outside app filesystem
- Do not trust original filename

### 33.3 Messaging Safety

- Escape message content on render
- Rate limit repeated messages
- Allow reporting users/listings
- Consider admin visibility only for moderation cases

### 33.4 Admin Safety

- Admin actions require confirmation for destructive operations
- Log all admin actions
- Super admin required for creating another admin

---

## 34. Accessibility

MVP should include:

- Semantic HTML
- Keyboard-accessible forms
- Visible focus states
- Alt text for images where possible
- Labels for inputs
- Color contrast
- Buttons not just icons
- Error messages connected to fields

---

## 35. Performance Requirements

### 35.1 MVP Targets

- Homepage initial load under 2 seconds on average connection
- Browse page under 2.5 seconds for first page
- Listing detail under 2 seconds
- Image uploads can take longer but should show progress
- Search results should return under 500ms for small dataset

### 35.2 Backend

- Paginate all listing queries
- Avoid N+1 queries
- Use indexes
- Cache category tree and attribute definitions
- Use background jobs for email and image processing if needed

### 35.3 Frontend

- Optimize images
- Lazy load listing images
- Avoid huge client bundles
- Use skeleton loaders
- Debounce search input

---

## 36. Analytics

### 36.1 Events

Track:

- User registered
- Email verified
- Listing created
- Listing approved
- Listing viewed
- Search performed
- Filter applied
- Favorite added
- Message sent
- Phone revealed
- Listing marked sold
- Saved search created

### 36.2 Admin Metrics

Show:

- Active listings
- Pending listings
- New listings this week
- New users this week
- Message count this week
- Most searched terms
- Categories with most listings
- Report count

### 36.3 Privacy

- Avoid storing raw IP if possible
- Hash or truncate IP
- Do not expose analytics publicly

---

## 37. Content Pages

### 37.1 About Page `/o-nama`

Draft Serbian copy:

```text
Sve Za Pecanje je mesto za kupovinu i prodaju ribolovačke opreme u Srbiji.

Napravljen je za ribolovce koji žele brže da pronađu štapove, mašinice, varalice, elektroniku i drugu opremu, uz filtere koji imaju smisla za ribolov.

Naš cilj je da oglasi budu pregledniji, detaljniji i korisniji nego na generičkim oglasnicima.
```

### 37.2 Contact Page `/kontakt`

Fields:

- Name
- Email
- Subject
- Message

Serbian labels:

```text
Ime
Email
Tema
Poruka
Pošalji
```

### 37.3 Terms Page `/uslovi-koriscenja`

Include placeholder legal text.

Must mention:

- Users are responsible for their listings
- Platform does not own listed items
- Platform is not party to offline transactions
- Prohibited items
- Admin can remove content
- Abuse can lead to suspension

### 37.4 Privacy Page `/privatnost`

Include placeholder privacy text.

Must mention:

- What data is collected
- Why data is collected
- Account data
- Listing data
- Messaging data
- Cookies/session
- Contact for deletion request

### 37.5 Safety Tips Page `/saveti-za-bezbednost`

Use content from Trust and Safety section.

---

## 38. MVP Admin Workflow

### 38.1 Daily Admin Checklist

Admin should be able to:

1. Open pending listings
2. Approve/reject them
3. Review unresolved reports
4. Check suspicious users
5. Feature selected listings
6. Review recent messages count for spam patterns

### 38.2 Admin Notes

Add optional internal notes later. Not required MVP.

---

## 39. Testing Requirements

### 39.1 Backend Unit Tests

Test:

- Password hashing
- Auth token/session creation
- Listing validation
- Attribute validation by category
- Slug generation
- Permission checks
- Search filter parsing
- Message permissions
- Review rules

### 39.2 Backend Integration Tests

Test:

- Register/login flow
- Create listing
- Upload image
- Admin approves listing
- Public listing appears
- Buyer messages seller
- Seller replies
- Buyer favorites listing
- User saves search
- User reports listing
- Admin resolves report

### 39.3 Frontend Tests

Minimum:

- Homepage renders
- Browse page renders listings
- Filters update URL
- Listing detail displays correct data
- Create listing form validates fields
- Login/register forms validate fields

### 39.4 E2E Tests

Use Playwright or similar.

Critical E2E flows:

1. Register user
2. Verify or bypass verification in test mode
3. Create listing
4. Admin approves listing
5. Second user searches and messages seller
6. Seller sees message
7. Seller marks listing sold

### 39.5 Manual QA Checklist

Before launch:

- Create account
- Verify email
- Reset password
- Create listing in every main category
- Upload 10 images
- Search by brand/model
- Filter by category-specific fields
- Message seller
- Mark sold
- Leave review
- Report listing
- Admin approve/reject
- Admin suspend user
- Test mobile layout
- Test slow connection image loading
- Test invalid image upload
- Test Serbian characters in title/search

---

## 40. Deployment Plan

### 40.1 MVP Production Setup

Recommended simple setup:

- Hetzner VPS
- Docker Compose
- Caddy or Nginx reverse proxy
- Cloudflare DNS
- Postgres container or managed Postgres
- Redis container
- S3-compatible storage
- Automated database backups

### 40.2 Services

Production containers:

- frontend
- backend
- worker
- postgres
- redis
- reverse-proxy

Optional:

- watchtower or manual deploy scripts
- backup container

### 40.3 Deployment Steps

1. Provision VPS
2. Install Docker and Docker Compose
3. Configure firewall
4. Configure domain
5. Configure Cloudflare
6. Add production `.env`
7. Start services
8. Run migrations
9. Run seed script for categories/brands/cities
10. Create admin user
11. Test health endpoint
12. Test homepage
13. Test registration email
14. Test image upload
15. Enable backups

### 40.4 Backups

At minimum:

- Daily Postgres dump
- Keep 7 daily backups
- Keep 4 weekly backups
- Store off-server if possible

### 40.5 Monitoring

MVP simple monitoring:

- Uptime check
- Basic error logs
- Disk usage alert
- Database backup success check

---

## 41. Milestones

## Milestone 0 — Project Bootstrap

Deliverables:

- Monorepo setup
- Docker Compose
- Backend app runs
- Frontend app runs
- Postgres/Redis/MinIO/Mailpit running
- Health endpoint
- Basic README

Acceptance:

- `docker compose up --build` starts all services
- Backend health endpoint returns OK
- Frontend homepage placeholder loads

---

## Milestone 1 — Auth and Core Data

Deliverables:

- User model
- Profile model
- Auth endpoints
- Register/login/logout
- Email verification
- Password reset
- Category model
- Brand model
- Seed script

Acceptance:

- User can register/login
- Categories and brands seeded
- Admin user can be created from CLI

---

## Milestone 2 — Listings and Images

Deliverables:

- Listing model
- Attribute definitions
- Create listing endpoint
- Edit listing endpoint
- Listing image upload
- Image processing
- Seller dashboard listings
- Listing status flow

Acceptance:

- Logged-in user can create listing
- Image upload works
- Listing goes pending
- Seller can edit listing
- Seller can archive listing

---

## Milestone 3 — Public Browse/Search

Deliverables:

- Homepage
- Browse page
- Listing cards
- Search
- Filters
- Listing detail page
- SEO slugs
- Favorites

Acceptance:

- Anonymous user can browse active listings
- Search works
- Filters work
- Listing detail works
- Logged-in user can favorite listings

---

## Milestone 4 — Messaging and Saved Searches

Deliverables:

- Conversations
- Messages
- Email notification for new message
- Saved searches
- User dashboard pages

Acceptance:

- Buyer can message seller
- Seller can reply
- User can save and delete searches
- User can view favorites

---

## Milestone 5 — Admin Moderation

Deliverables:

- Admin dashboard
- Pending listing review
- Approve/reject listings
- Reports
- User suspension
- Featured listings
- Audit logs

Acceptance:

- Admin can approve listing and make it public
- Admin can reject with reason
- Admin can resolve reports
- Admin actions are audited

---

## Milestone 6 — Launch Readiness

Deliverables:

- Static pages
- Safety tips
- Terms/privacy placeholders
- Sitemap
- Robots
- Production Docker config
- Deployment docs
- Tests for critical flows
- Seed production categories/brands/cities

Acceptance:

- App deploys successfully
- Critical flows pass
- Mobile layout is acceptable
- No obvious security issues
- Admin can operate the marketplace manually

---

## 42. Acceptance Criteria Summary

The MVP is complete when:

- Anonymous users can browse active listings
- Users can register, log in, and verify email
- Verified users can create fishing gear listings
- Listings support category-specific fields
- Users can upload images
- Admin can approve/reject listings
- Approved listings appear publicly
- Search and filters work
- Users can favorite listings
- Users can save searches
- Buyers can message sellers
- Sellers can mark listings sold
- Users can leave simple reviews after sale
- Users can report listings
- Admin can resolve reports
- Public pages are in Serbian
- App is mobile responsive
- App can be deployed with Docker
- Basic tests exist
- No KP assets/content/design are copied

---

## 43. Post-MVP Roadmap

### Phase 2 — Trust and Growth

- Phone verification
- Seller badges
- Trusted seller status
- Better review system
- Public sold price history
- Report abuse improvements
- Auto-approval for trusted users

### Phase 3 — Community

- Gear reviews
- Catch reports
- User collections
- Fishing styles
- Forum/comments
- Clubs

### Phase 4 — Monetization

- Featured listings paid
- Shop profiles
- Monthly shop subscriptions
- Sponsored placements
- Affiliate links to fishing shops
- Promoted category pages

### Phase 5 — Advanced Marketplace

- Escrow/payment
- Shipping integration
- Offers/negotiation
- Price alerts
- AI price suggestions
- Duplicate detection
- Image-based gear recognition

### Phase 6 — Wider Region

- Montenegro
- Bosnia and Herzegovina
- Croatia
- North Macedonia
- Cyrillic support
- Multi-currency improvements

---

## 44. Agent Build Rules

The coding agent should follow these rules:

1. Build MVP features only.
2. Keep user-facing text in Serbian Latin.
3. Keep code and database names in English.
4. Do not copy existing marketplace UI.
5. Use clean, original design.
6. Use mobile-first layout.
7. Build with Docker from day one.
8. Include migrations for every schema change.
9. Include seed script.
10. Include tests for critical flows.
11. Avoid overengineering.
12. Avoid premature microservices.
13. Avoid implementing payments.
14. Avoid WebSockets in MVP.
15. Avoid scraping.
16. Use structured category attributes.
17. Use PostgreSQL search first.
18. Make admin moderation functional.
19. Make listing creation smooth.
20. Make search/filtering reliable.

---

## 45. First Implementation Prompt for Agent

Use this prompt to start implementation:

```text
Build the MVP described in this specification.

Start with Milestone 0 and Milestone 1.

Create a monorepo with:
- FastAPI backend
- Next.js frontend
- PostgreSQL
- Redis
- MinIO
- Mailpit
- Docker Compose

Implement:
- Health endpoint
- Environment config
- Database connection
- Alembic migrations
- User model
- Profile model
- Category model
- Brand model
- Auth register/login/logout/me
- Email verification token generation
- Seed script for categories, brands, and cities
- Admin creation script

Use Serbian Latin for all user-facing UI and error messages.
Use English for code and database naming.
Do not copy UI/branding from any existing marketplace.
```

---

## 46. Implementation Notes for Future Developer

The most important part of this MVP is not the technical complexity. It is whether anglers actually list gear.

Therefore:

- Launch with manual moderation.
- Prioritize fast listing creation.
- Make listings look better than generic classifieds.
- Make category filters genuinely useful.
- Seed categories and brands carefully.
- Encourage users to cross-post but treat this app as their fishing-specific home.
- Track seller contact events because that is the strongest early signal.

The MVP should feel like a focused tool for anglers, not a generic classifieds template with fishing labels.
