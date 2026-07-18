# 048 — Critical marketplace journey and release gate

Status: todo
Priority: P1

## Problem

Task 025 is marked complete, but the current Playwright smoke suite covers only basic page
loading, auth-field presence, and limited filter URL behavior. It does not protect the
claimed registration-to-sale journey, so core marketplace regressions can still reach
production.

See [the soft-launch roadmap](../docs/soft-launch-roadmap.md).

## Work

- [ ] Add reusable Playwright fixtures for visitor, seller, buyer, and administrator roles
- [ ] Add deterministic test adapters for email, image storage, and background jobs without
  exposing a test-only route in production
- [ ] Make test data isolated per test and safe for parallel execution
- [ ] Cover seller registration, email verification, sign-in, listing creation, image
  upload/reordering, and submission for moderation
- [ ] Cover administrator approval followed by public listing visibility
- [ ] Cover buyer search, category and brand multi-selection, dynamic attributes, favorites,
  saved searches, and the first message
- [ ] Cover seller reply, unread-state clearing, buyer selection, mark-sold, and eligible
  reviews
- [ ] Cover listing or conversation reporting and administrator resolution
- [ ] Add a regression for the earlier category control: a parent category appears once as
  a selectable choice, group labels are not duplicated as misleading options, and multiple
  category/brand values survive submit, reload, chip removal, and saved-search restoration
- [ ] Run the critical suite on every pull request and save traces/screenshots only on
  failure
- [ ] Add a non-mutating post-deployment smoke command for readiness, homepage, browse,
  listing detail, and login pages
- [ ] Replace any inaccurate E2E claims in existing documentation with the scenarios that
  are actually enforced

## Acceptance criteria

- The complete marketplace journey passes three consecutive clean CI runs without retries
- Tests run locally from one documented command
- CI blocks merging when the critical journey fails
- The suite uses isolated data and does not depend on execution order
- No test sends production email, SMS, payment, or object-storage requests
- Failure artifacts make the broken user step identifiable

## Dependencies

- None
