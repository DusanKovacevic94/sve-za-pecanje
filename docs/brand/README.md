# Sve Za Pecanje brand assets

The canonical visual sources live in the sibling
`sve-za-pecanje-brand-manager/assets/` repository. Files in this application are
synchronized deployment copies and must not be edited directly. From the Brand
Manager repository, run `make assets-check` to detect drift or `make assets-sync`
to update this application.

The same operations are available from this repository as
`make brand-assets-check` and `make brand-assets-sync`. Set `BRAND_MANAGER_DIR`
if the repositories are not siblings.

The deployable SVG files live in `frontend/public/brand`:

- `logo.svg` — primary wordmark for light backgrounds;
- `logo-inverse.svg` — light wordmark for dark or photographic backgrounds;
- `logo-monochrome.svg` — single-color export for print and constrained contexts;
- `mark.svg` — standalone hook-and-ripple symbol.

The editable source is kept in `docs/brand/source/logo-editable.svg`. It uses
live text and should not be served by the application. Production wordmarks use
outlined paths so their appearance does not depend on an installed font.

Use the shared `BrandLogo` component for application UI. Keep the original
aspect ratio, do not recolor the primary or inverse exports, and leave clear
space around the mark. Action and category glyphs remain in the separate
24×24 UI icon system.

The broader palette, typography, shape, motion, and SVG motif rules are in
`docs/brand/visual-identity.md`. During local development, `/dev/brand` provides
a rendered catalogue and `/dev/icons` provides the complete UI glyph catalogue.
