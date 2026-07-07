# 030 — Header, footer i brend detalji

Status: done
Prioritet: P1

## Problem

1. **Footer izgleda nedovršeno**: četiri kolone od kojih su tri jedan usamljeni link; nema linka ka `/kontakt` ni `/saveti-za-bezbednost`, nema copyright reda, ničeg
2. Header je funkcionalan ali ravan: nema aktivno stanje navigacije (ne vidi se na kojoj si stranici), "Prijava" dugme je belo na belom sa jedva vidljivim okvirom
3. Logo je generična Lucide ribica u kvadratu — prihvatljivo za MVP, ali lockup može biti bolji (veličina, spacing)
4. Nema OG slike za deljenje linkova (društvene mreže prikazuju prazno)

## Šta uraditi

- [x] Footer redizajn: 3–4 prave kolone (Sajt: oglasi/kategorije/postavi oglas · Podrška: kontakt/bezbednost/o nama · Pravno: uslovi/privatnost) + red sa copyright i godinom; tamnija pozadina (`river-900` sa svetlim tekstom) da sajt ima "kraj"
- [x] Header: aktivan link podvučen ili obojen (`usePathname` u maloj klijentskoj nav komponenti); "Prijava" sa vidljivijim okvirom ili ghost stilom
- [x] Logo lockup: doterati veličinu/razmak, razmisliti o zaobljenom obliku ikone; isti lockup u footeru
- [x] OG slika: statička `opengraph-image.png` (1200×630) sa logoom, taglineom i brend gradijentom — Next je automatski servira; proveriti i `twitter:card`
- [x] Favicon set: proveriti kako postojeći `icon.svg` izgleda u tabu na tamnoj/svetloj temi; dodati `icon.png` fallback ako treba

## Kriterijumi prihvatanja

- Footer ima sve glavne linkove uključujući kontakt, i copyright red
- Aktivna stranica se vidi u navigaciji
- Deljenje linka na Viber/WhatsApp/Facebook prikazuje OG karticu sa slikom

## Fajlovi

- `frontend/src/components/layout/Footer.tsx`
- `frontend/src/components/layout/Header.tsx`
- `frontend/src/app/layout.tsx`, `frontend/src/app/` (opengraph-image)
