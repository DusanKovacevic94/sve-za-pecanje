# 066 — Design primitives and token adoption

Status: todo
Priority: P1

## Goal

Replace repeated one-off Tailwind combinations with a coherent, enforceable
component and typography system.

## Work

- [ ] Define page-title, section-heading, supporting-copy, panel, action-row,
  metadata, and divider primitives.
- [ ] Clarify the supported neutral palette and migrate unexplained Slate use.
- [ ] Standardize 12–16 px radii and border-versus-shadow rules.
- [ ] Replace indiscriminate `font-black` with an intentional type hierarchy.
- [ ] Add lint or test coverage for prohibited ad hoc brand values.
- [ ] Migrate customer-facing surfaces before admin tooling.

## Acceptance criteria

- Shared primitives cover the main public, authentication, listing, and account
  surfaces.
- No customer-facing component introduces hard-coded brand colors.
- Heading weight and spacing visibly distinguish page, section, and card levels.
- Migration does not flatten semantic status colors.

## Primary files

- `frontend/src/components/ui/`
- `frontend/src/styles/globals.css`
- `frontend/tailwind.config.ts`
- `frontend/src/app/**`

