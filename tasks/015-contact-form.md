# 015 — Kontakt forma

Status: todo
Prioritet: P3

## Problem

`frontend/src/app/kontakt/page.tsx` renderuje formu bez `action`/`onSubmit` — dugme "Pošalji" ne radi ništa. Sada kada je Resend uvezan, forma može zaista da šalje.

## Šta uraditi

- [ ] Backend: `POST /contact` — ime, email, poruka; rate limit (npr. 3/h po IP); šalje email na admin adresu preko postojećeg `send_email`
- [ ] Dodaj `CONTACT_EMAIL` u config/.env (podrazumevano `EMAIL_FROM` adresa)
- [ ] Frontend: klijentska forma (RHF + zod) sa success/error porukom, reuse `apiFetch`
- [ ] Anti-spam minimum: honeypot polje + rate limit (bez captcha za MVP)

## Kriterijumi prihvatanja

- Popunjena forma → email stiže na admin adresu sa reply-to postavljenim na adresu pošiljaoca
- Spam zaštita: 4. slanje u satu sa iste IP adrese → 429

## Fajlovi

- `frontend/src/app/kontakt/page.tsx`
- `backend/app/api/v1/` (novi router ili dodatak postojećem)
- `backend/app/core/email.py` (postojeći send_email)
