# 033 — /oglasi: sortiranje, aktivni filteri, paginacija

Status: done
Prioritet: P2

## Problem

1. **Nema sortiranja u UI** — backend podržava `sort` parametar (`listing_service.py:250` `_apply_sort`), ali korisnik nigde ne može da izabere "najnovije / cena rastuće / cena opadajuće"
2. Aktivni filteri se ne vide — kad filtriraš pa se vratiš, ne znaš šta je uključeno niti možeš da skineš pojedinačni filter
3. Paginacija je samo "Prethodna/Sledeća" — bez brojeva strana
4. Filter sidebar zahteva klik na "Primeni filtere" i pun reload forme — u redu za MVP, ali select/kategorija bi mogli da apliciraju odmah
5. Naslov "10 rezultata za izabrane filtere" i kad nema filtera — čudno kad gledaš sve oglase

## Šta uraditi

- [x] Sort dropdown iznad grida ("Najnoviji", "Cena ↑", "Cena ↓" — uskladiti vrednosti sa `_apply_sort`), čuva ostale query parametre
- [x] Traka aktivnih filtera: čip po filteru ("Kategorija: Štapovi ×", "Cena do: 5.000 ×") + "Poništi sve"; klik na × skida taj parametar
- [x] Numerisana paginacija (1 … 4 5 6 … 12) — komponenta, reuse `toQuery`
- [x] Naslov rezultata: "X oglasa" bez "za izabrane filtere" kad nema aktivnih filtera; prikaži upit ("Rezultati za 'shimano'")
- [x] Mobilni: filter `<details>` zameniti urednijim drawer/collapse sa brojem aktivnih filtera na dugmetu

## Kriterijumi prihvatanja

- Promena sortiranja zadržava filtere i resetuje stranu na 1
- Svaki aktivan filter se vidi i može pojedinačno skinuti
- Skok na proizvoljnu stranu radi

## Fajlovi

- `frontend/src/app/oglasi/page.tsx`
- `frontend/src/components/filters/FilterSidebar.tsx`
- `backend/app/services/listing_service.py:250` (samo referenca za sort vrednosti)
