# Track: editor pointer click, positioning, and scroll jump fixes

Branch `editor-pointer`, based on main `c9f6a6c`.

## Defects Addressed

1. **Scroll jump on click:** Clicking inside the visible editor window previously applied a context reveal margin (`REVEAL_MARGIN_LINES * lineHeight`), scrolling lines unnecessarily even though the clicked line was already visible.
2. **Focus repositioning race:** Calling `sinkRef.current.focus()` immediately on pointer down caused the browser/engine to scroll to the input's *previous* position (before the render that positioned the hidden input at the new caret position), resulting in viewport jump under pointer press.
3. **Drag selection scroll instability:** During pointer drag selection, moving the pointer across text repeatedly called `setSelection`, which triggered full context reveals that competed with autoscroll.
4. **Caret placement accuracy:** Refined cursor positioning and click handling midway through lines and multi-click word selection.

## Implementation

1. **Differentiated Reveal Margins (`demo/src/editor/controller.ts`):**
   - Introduced `RevealMargin = 'context' | 'minimal'`.
   - Keys and programmatic jumps use `'context'` margins (keeping context lines/columns visible around the caret).
   - Pointer press (`pointerDown`) uses `'minimal'` margins (only ensuring a partially visible line at the edge is brought fully into view, with zero extra margin).
   - Pointer movement (`pointerMove`) updates the selection without triggering reveal requests, leaving autoscroll in control of scroll positioning during drags.

2. **Deferred Keyboard Focus (`demo/src/editor/view/editor-view.tsx`):**
   - Added `keyboardEpoch` and `requestKeyboard()` to `EditorController`.
   - `takeKeyboard()` calls `controller.requestKeyboard()`.
   - An effect in `EditorView` (`useLayoutEffect`) triggers `sinkRef.current?.focus()` only *after* the input sink element has been re-rendered at the newly selected caret position, eliminating the scroll jump back to the previous caret position.

3. **Reproduction & Verification:**
   - Added `scripts/repro-editor-pointer.mjs` verifying click and drag positioning.
   - Updated unit tests in `tests/code-panel.test.ts` and `tests/editor-controller.test.ts`.

## Verification

- `pnpm test:types`: passed cleanly.
- `pnpm build`: passed cleanly.
- `npx tsx --test tests/code-panel.test.ts`: passed.
- `npx tsx --test tests/editor-controller.test.ts`: passed.
- Code editor verifier (`node scripts/verify.mjs --interaction --only=code-editor`): passed.
