# Track: explain all demo labs and format cleanly on mobile viewports

Branch `lab-clarity`, based on main `c9f6a6c`.

## Motivation

Each demo lab in `demo/src/` demonstrates specific renderer capabilities, layout algorithms, gestures, and CSS compatibility. Previously, many labs lacked explanatory notes regarding what they exercised, what test criteria they satisfied, or broke layout when viewed on narrow mobile viewports (e.g. 412px phone widths).

## Summary of Changes

1. **Explanatory Notes Across All Labs:**
   - Updated core labs (`interaction`, `pointer`, `keyboard`, `positioning`, `inputs`, `scroll`, `selection`).
   - Updated input & form labs (`forms`, `forms-extra`, `combobox`, `dropdown-touch`, `touch-selection`).
   - Updated effects & styling labs (`filters`, `glass`, `paint`, `motion`, `hidpi`, `layout-utilities`).
   - Updated text & font labs (`text-styles`, `rich-text`, `font-slices`).
   - Created reusable components for notes and metrics (`demo/src/lab-parts.tsx`, `demo/src/text-lab-parts.tsx`).

2. **Mobile Viewport Compatibility:**
   - Ensured all cards, controls, readouts, and previews flex-wrap or scale properly down to 412px portrait viewports without clipping or horizontal overflow.
   - Updated 3D world quad geometry (`demo/src/world-geometry.ts`) so narrow mobile viewports adjust the camera distance to keep the full 3D quad in view without clipping.

3. **Verification Suites:**
   - Added `tests/text-lab-notes.test.ts` verifying all text styles, rich text, and font fallback samples carry required descriptive notes.
   - Updated `tests/world-geometry.test.ts` to assert responsive camera distance calculation for narrow viewports.

## Verification

- `pnpm test:types`: passed cleanly.
- `npx tsx --test tests/text-lab-notes.test.ts tests/world-geometry.test.ts`: passed (12 tests).
- `npx tsx --test tests/demo-entry-points.test.ts`: passed (3 tests).
