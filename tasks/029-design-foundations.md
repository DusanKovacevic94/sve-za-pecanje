# 029 — Dizajn temelji: tipografija, paleta, tokeni

Status: done
Prioritet: P1

## Problem

Sajt izgleda generično — "default Tailwind" utisak:

1. **Nema fonta**: ne učitava se nijedan font (`next/font` se ne koristi) — sve je sistemski Arial/Helvetica, a naslovi su svuda `font-black` pa je sve podjednako "vika" bez ritma
2. **Paleta je stidljiva**: `river` teal se koristi samo za dugmad i linkove, `reed` zlatna praktično nigde (samo rep hero gradijenta), sve ostalo je belo/sivo — nema vizuelnog identiteta
3. Hero gradijent (`#0f352f → #147d6b → #e4b363 na 160%`) postaje **prljavo maslinast** u gornjem desnom uglu
4. Pozadina `#f7faf9` je nerazlučiva od belih kartica — sve se stapa; kartice imaju i border i senku (duplo uokvirivanje)
5. `river` skala ima rupe (nema 200/300/400/800), `reed` i `ink` su jedna vrednost bez skale

## Šta uraditi

- [x] `next/font`: izabrati par — npr. **Manrope** ili **Plus Jakarta Sans** za naslove + **Inter** za tekst (ili jedan varijabilni font za sve); podesiti `fontFamily` u Tailwind config i `font-sans` na body
- [x] Tipografska skala: naslovi `font-bold`/`font-extrabold` umesto univerzalnog `font-black`; definisati h1/h2/h3 konvenciju (veličina + weight + tracking) i proći kroz stranice
- [x] Kompletirati palete u `tailwind.config.ts`: puna `river` skala 50–900, `reed` skala (50–700, da zlatna može na bedževe/akcente), toplija neutralna skala umesto čistog slate
- [x] Odlučiti akcenat strategiju: teal = brend/akcije, reed/zlatna = isticanje (featured, cene?) — dokumentovati u komentaru config-a
- [x] Popraviti hero gradijent: ili čist teal gradijent (tamno → svetlo) ili teal + suptilan pattern/talas SVG; bez maslinastog prelaza
- [x] Pozadina tela: malo izraženija (npr. `river-50` tonirana ili toplo siva) da bele kartice "legnu"; kartice: ili border ili senka, ne oba
- [x] Radijusi: ujednačiti (kartice `rounded-xl`, dugmad `rounded-lg` npr.) — sada je sve `rounded-md/lg` mešano

## Kriterijumi prihvatanja

- Font se učitava kroz `next/font` (bez layout shift-a, `display: swap`)
- Hero nema maslinasti prelaz
- Kartice se vizuelno odvajaju od pozadine bez duplog okvira
- `pnpm build` čist; nijedna stranica ne koristi stare ad-hok boje mimo tokena

## Fajlovi

- `frontend/tailwind.config.ts`
- `frontend/src/styles/globals.css`
- `frontend/src/app/layout.tsx` (next/font)
- `frontend/src/app/page.tsx:25` (hero gradijent)
