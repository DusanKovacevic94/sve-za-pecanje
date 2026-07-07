# 035 — Mikrointerakcije, empty states i povratne informacije

Status: done
Prioritet: P2

## Problem

Sajt je statičan i "nem": akcije se dešavaju bez potvrde, prazna stanja su goli tekst u kutiji, prelazi ne postoje. Ovo je razlika između "radi" i "prijatno".

## Šta uraditi

- [x] Toast sistem (mala klijentska komponenta ili `sonner`): potvrda za sačuvan oglas, poslatu poruku, dodato u omiljene, sačuvanu pretragu, greške mreže — umesto tihih akcija
- [x] Empty states sa ikonom i CTA: omiljeni ("Još nemaš omiljene oglase" + dugme ka /oglasi), poruke, moji oglasi, sačuvane pretrage, rezultati pretrage — jedna reusable `EmptyState` komponenta (ikona + naslov + tekst + dugme)
- [x] Konzistentni prelazi: `transition` na svim interaktivnim elementima (linkovi, kartice, čipovi); trajanje 150–200ms
- [x] Dugmad: loading stanje (spinner + disabled) na svim submit dugmadima — proveriti forme, dodati gde fali
- [x] Favorite srce: mala animacija na klik (scale pop) i popunjena boja kad je sačuvano
- [x] Slike: blur/fade-in pri učitavanju (`next/image` placeholder ili CSS fade preko `onLoad`)
- [x] Fokus stanja: proveriti da `focus-ring` postoji na svim novim interaktivnim elementima

## Kriterijumi prihvatanja

- Svaka mutaciona akcija daje vizuelnu potvrdu ili grešku
- Nijedno prazno stanje nije samo rečenica u sivoj kutiji
- Dupli submit nemoguć (disabled tokom slanja)

## Fajlovi

- `frontend/src/components/ui/` (Toast/EmptyState — novo)
- `frontend/src/components/listings/ListingActions.tsx`
- `frontend/src/components/forms/*` (loading stanja)

## Zavisnosti

- 029 (tokeni/boje prvo)
