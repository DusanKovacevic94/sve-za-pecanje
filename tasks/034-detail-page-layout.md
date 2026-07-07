# 034 — Detalj oglasa: layout, breadcrumbs, slični oglasi

Status: done
Prioritet: P2

## Problem

1. Nema breadcrumbs — sa detalja ne možeš u kategoriju ("Početna › Oglasi › Štapovi › ...")
2. Desna kolona je prazna ispod kartice prodavca — na desktopu zjapi belina cele visine stranice
3. Kartica prodavca je siromašna: nema avatar/inicijale, ocenu, broj oglasa, "član od" — a backend te podatke ima (`/prodavci/[username]` stranica ih prikazuje)
4. Nema sekcije "Slični oglasi" na dnu — mrtav kraj, korisnik nema kuda dalje
5. Meta grid (stanje/lokacija/brend/model/objavljeno/pregledi) — šest istih sivih kutija, "Pregledi 0" i "Model: Nije navedeno" zauzimaju ravnopravan prostor sa bitnim podacima

## Šta uraditi

- [x] Breadcrumbs komponenta (Početna › Oglasi › {kategorija} › {naslov}) + `BreadcrumbList` JSON-LD
- [x] Kartica prodavca: inicijali/avatar krug, prosečna ocena (zvezdice) + broj ocena, broj aktivnih oglasa, "Član od {mesec godina}" — proveriti šta backend već vraća u listing detail, dopuniti serializer po potrebi
- [x] Sticky desna kolona na desktopu (`lg:sticky lg:top-20 self-start`)
- [x] "Slični oglasi": 4 kartice iz iste kategorije (isključi trenutni; jednostavan query po kategoriji + featured/recency) — novi backend endpoint ili parametar
- [x] Meta grid: izbaci prazna polja ("Nije navedeno" red se ne renderuje), "Pregledi" premesti u diskretan red pored datuma
- [x] Dugme za deljenje (Web Share API na mobilnom, copy-link fallback)

## Kriterijumi prihvatanja

- Sa detalja se jednim klikom stiže u kategoriju oglasa
- Desna kolona prati skrol; nema praznog zida
- Ispod opisa stoje slični oglasi i vode dalje

## Fajlovi

- `frontend/src/app/oglasi/[slug]/page.tsx`
- `backend/app/api/v1/listings.py` (slični oglasi)
- `frontend/src/components/listings/` (Breadcrumbs, SellerCard, ShareButton)

## Zavisnosti

- 031 (atributi/kartice prvo, koriste se u "Slični oglasi")
