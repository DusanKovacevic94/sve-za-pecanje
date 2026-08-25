# Sve Za Pecanje visual identity

The finished logo is the immutable reference for the product's visual system.
Application styling should support it, never redraw, recolor, crop, or decorate it.

## Character

The identity is practical, calm, and recognizably connected to fishing without
using literal scenery or ornamental illustrations. Interfaces should feel like
well-made equipment: clear, durable, compact, and easy to understand outdoors.

## Core palette

| Role | Value | Use |
| --- | --- | --- |
| Pine | `#173F37` | Primary actions, headings, navigation, dark surfaces |
| Orange | `#EE9835` | Small emphasis, featured states, water-ripple motif |
| Cream | `#F7F6F1` | Page background and quiet surfaces |
| Ink | `#16201D` | Body text |
| White | `#FFFFFF` | Cards, controls, and inverse contrast |

Orange is an accent, not a second primary action color. Red remains reserved
for destructive actions and errors. Status colors must retain their semantic
meaning rather than being forced into the brand palette.

## Typography

Manrope is the application typeface. Use strong, compact headings with normal
letter spacing and readable sentence-case labels. Uppercase is reserved for
short eyebrows and navigation groups, with deliberate tracking.

## Shape and depth

- Controls and cards use 12–16 px corner radii.
- Pills are reserved for compact metadata and status.
- Borders provide the main separation; shadows stay soft and low contrast.
- Motion is brief and functional: color, border, and a maximum 2 px lift.
- Layout uses generous whitespace instead of decorative containers.

## SVG language

- UI icons use the shared `0 0 24 24` grid, a `1.75` rounded stroke, and
  `currentColor`.
- Prefer one continuous silhouette and remove details that disappear at 14 px.
- Icons are monochrome. Color comes from their context, not embedded SVG paint.
- The hook and two-line water ripple are the only recurring brand motifs.
- Decorative motifs are always hidden from assistive technology.
- Do not use emoji, Unicode symbols, raster clip art, or third-party icon sets.

## Logo usage

Use `logo.svg` on light backgrounds and `logo-inverse.svg` on pine or dark
backgrounds. Use the standalone mark only where the full wordmark cannot fit.
Preserve the original aspect ratio and clear space. See `docs/brand/README.md`
for asset locations.
