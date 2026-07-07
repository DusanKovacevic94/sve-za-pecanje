# 032 — Početna strana: redizajn

Status: done
Prioritet: P2

## Problem

1. Hero je tekstualno težak, bez ijedne slike/ilustracije — a kategorije-kartice u njemu ponavljaju identičan filler tekst ("Strukturirani filteri i jasni detalji.") na svakoj kartici
2. Nema sekcije za pregled kategorija sa ikonama — kategorije su zakopane u hero karticama i posebnoj stranici
3. "Benefits" kartice su četiri siva pravougaonika — vizuelno najslabija sekcija
4. "Kupuj bezbedno" žuta traka deluje nalepljeno kao poslednja sekcija; footer odmah iza nje

## Šta uraditi

- [x] Hero: jedna jaka poruka + pretraga; desno umesto teksta-kartica ilustracija/fotografija ribolovačke tematike (SVG talas/pejzaž ili kvalitetna fotka sa overlay-em — bez stock kiča) ili kompaktne kategorije sa **ikonama i brojem oglasa**
- [x] Sekcija kategorija: grid kartica sa ikonom (štap, mašinica, varalica, čamac...), imenom i brojem aktivnih oglasa (`/categories` već postoji — dodati count u backend response ako fali)
- [x] Popularne pretrage / brendovi: red čipova (Shimano, Daiwa, feeder, šaranski...) koji vode na filtrirane pretrage — jeftino, a puni stranicu sadržajem
- [x] Benefits: spojiti u jednu traku sa ikonama u brend boji na `river-50` pozadini, manje kutija
- [x] "Kupuj bezbedno": pretvoriti u diskretniju traku sa linkom na `/saveti-za-bezbednost` i pomeriti iznad footera ili u footer zonu
- [x] Ako ima prodatih/istaknutih oglasa: sekcija "Istaknuti oglasi" iznad najnovijih (koristi postojeći featured sort)

## Kriterijumi prihvatanja

- Početna ima vizuelni sadržaj (ikone/ilustracije), ne samo tekst u kutijama
- Kategorije vidljive sa brojem oglasa i klikabilne
- Nijedan ponovljeni filler tekst

## Fajlovi

- `frontend/src/app/page.tsx`
- `backend/app/api/v1/categories.py` (count po kategoriji, ako fali)
- `frontend/src/app/kategorije/page.tsx` (iste ikone reuse)

## Zavisnosti

- 029 (paleta/tipografija prvo)
