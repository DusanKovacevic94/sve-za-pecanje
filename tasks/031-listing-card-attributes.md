# 031 — ListingCard redizajn + čitljivi atributi

Status: done
Prioritet: P1

## Problem

Kartica oglasa je najvažniji element sajta, a trenutno:

1. **Atribut čipovi prikazuju sirove vrednosti**: "fish_finder", "true", "360", "6.0:1", "soft_plastic" — bez srpskih labela i jedinica, izgleda kao debug ispis. Uzrok: backend šalje `key_attributes` kao sirov `dict(attributes[:4])` (`listing_service.py:295`), a `AttributeDefinition` ima `label_sr` i `unit` koji se ne koriste
2. Placeholder bez slike je ispran belo-narandžasti gradijent sa tekstom "Fotografija opreme" — bledunjavo
3. Red sa gradom/stanjem/kategorijom je zbijen niz sivih reči bez hijerarhije
4. Nema hover efekta na kartici (samo na naslovu), ništa ne signalizira klikabilnost
5. Ista sirova imena atributa cure i na detalj stranici ("Detalji opreme": `clothing_type` → glasses)

## Šta uraditi

- [x] Backend: `key_attributes` serijalizuj sa labelom i jedinicom — npr. lista `{key, label_sr, value, unit}` (join sa `AttributeDefinition` preko kategorije); mapiraj i enum vrednosti na `label_sr` iz `options`; boolean → "Da"/"Ne" ili izostavi
- [x] Backend: isto za `attributes` na detalju (ili poseban `attributes_display`)
- [x] Frontend: čipovi prikazuju "360 cm", "7–28 g", "Spining" umesto sirovih vrednosti; maksimalno 2–3 čipa
- [x] Placeholder slike: brend pozadina (`river-50/100`) sa velikom polu-providnom ikonom ribe/udice po sredini umesto teksta
- [x] Kartica: hover stanje (senka + blagi lift ili zoom slike `group-hover:scale-105`), cela kartica klikabilna
- [x] Meta red: grad + vreme ("pre 2 dana" umesto punog datuma — relativno vreme), stanje kao mali badge, kategoriju izbaciti iz mete (vidi se iz konteksta/čipova)
- [x] Featured kartica: reed/zlatni tanki okvir ili traka, ne samo badge

## Kriterijumi prihvatanja

- Nijedan sirovi ključ/enum se ne vidi ni na kartici ni na detalju
- Kartica ima jasno hover stanje; cela površina vodi na oglas
- Oglas bez slike izgleda namerno, ne pokvareno

## Fajlovi

- `backend/app/services/listing_service.py:295,322` (key_attributes)
- `frontend/src/components/listings/ListingCard.tsx`
- `frontend/src/app/oglasi/[slug]/page.tsx:105-117` (Detalji opreme)
- `frontend/src/lib/format.ts` (relativno vreme)
