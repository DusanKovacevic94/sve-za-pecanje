# 061 — Semantic feedback and alert system

Status: done
Priority: P1

## Goal

Ensure success, error, warning, and informational messages use correct color,
icons, language, and assistive-technology behavior everywhere.

## Work

- [x] Add a reusable `Alert` component with `success`, `error`, `warning`, and
  `info` tones.
- [x] Define `role="alert"` versus `role="status"` behavior by urgency.
- [x] Replace fixed-color authentication and account feedback messages.
- [x] Migrate repeated ad hoc message panels in customer-facing forms.
- [x] Add component and browser coverage for both success and error states.

## Acceptance criteria

- Successful verification/resend messages never appear as errors.
- Failed registration and login messages never use success/brand styling.
- Message meaning does not depend on color alone.
- Dynamic messages are announced exactly once by assistive technology.
- No migrated form retains an ad hoc feedback color block.

## Primary files

- `frontend/src/components/ui/Alert.tsx`
- `frontend/src/components/forms/LoginForm.tsx`
- `frontend/src/components/forms/RegisterForm.tsx`
- `frontend/src/components/forms/*`
