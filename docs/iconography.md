# Iconography

Sve Za Pecanje uses an original rounded-outline SVG family. Application icons
are React components in `frontend/src/components/icons`; they do not depend on
an external icon library.

## Drawing rules

- Canvas: `0 0 24 24`, with a two-unit optical safe area.
- Stroke: `1.75`, round caps and joins, inherited through `currentColor`.
- Prefer simple paths that stay recognizable at 14 px.
- Do not embed application colors in UI glyphs. Brand metadata artwork is the
  only exception because it renders without CSS.
- Filled states are semantic, not decorative. The favorite heart may fill when
  selected; the same outline remains visible.
- Variant families share their base drawing and reserve the lower-right area
  for plus, check, clock, or rejection modifiers.
- Off and muted states use one consistent upper-left to lower-right slash.

## Size conventions

| Context | Size |
| --- | ---: |
| Metadata and trust chips | 14 px |
| Buttons and navigation | 18 px |
| Feature and category tiles | 24 px |
| Empty states and placeholders | 32 px |
| Header/footer brand mark | 22 px |

## Accessibility

`IconBase` marks an icon decorative by default with `aria-hidden` and
`focusable="false"`. Supplying `aria-label` or `aria-labelledby` promotes it to
an image role. Buttons and links must keep their accessible text or explicit
label; SVG geometry must never be the only accessible name.

## Category registry

The ten root slugs map explicitly to rod, reel, lure, line/tackle, electronics,
boat, tackle storage, clothing, kit, and miscellaneous fishing symbols. Unknown
root slugs use the miscellaneous icon. Leaf categories remain text-only until a
real product surface needs separate artwork.

## Adding an icon

1. Confirm an existing semantic icon cannot express the action.
2. Draw from a blank grid; do not copy third-party path data.
3. Export the component through the icon barrel.
4. Add it to the development catalog and structural E2E coverage.
5. Check it at 14, 18, 24, and 32 px on light and dark backgrounds.

