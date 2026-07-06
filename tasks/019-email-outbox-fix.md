# 019 — Email outbox: tihi ispad emaila u produkciji

Status: done
Prioritet: P1

## Problem

U `email_tasks.py` red `if ok or not settings.resend_api_key:` označava email kao `sent` čak i kada API ključ **nije podešen** — email nikad nije poslat. U produkciji sa nedostajućim/istekli m ključem ovo maskira potpuni ispad emaila (verifikacije, reset lozinke, digesti) bez ijedne greške. Uz to, email koji posle 5 pokušaja pređe u `failed` niko nikad ne vidi.

## Šta uraditi

- [x] `email_tasks.py`: bez API ključa u produkciji email ostaje `pending`/`failed` uz glasan `logger.error`; u developmentu označi kao `skipped` (novi status) umesto lažnog `sent`
- [x] `config.py`: proširi produkcijski validator — `app_env == "production"` bez `RESEND_API_KEY` → odbij startup (kao za SECRET_KEY)
- [x] Admin: broj `failed` emailova na dashboard statistici + lista u admin UI sa dugmetom "Pokušaj ponovo" (resetuje `attempts` i status)
- [x] Test: outbox task bez ključa ne sme da upiše `sent`

## Kriterijumi prihvatanja

- Produkcijski startup bez RESEND_API_KEY pada sa jasnom porukom
- `failed` email je vidljiv adminu i može se ručno ponovo poslati
- Postojeći testovi + novi test prolaze

## Fajlovi

- `backend/app/tasks/email_tasks.py:28` (bug)
- `backend/app/core/config.py:66-79` (produkcijski validator)
- `backend/app/models/email_outbox.py`
- `backend/app/api/v1/admin.py`, `frontend/src/app/admin/` (failed lista)
