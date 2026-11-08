# Track: key chord claims and Web browser key passthrough

Branch `key-passthrough`, based on main `c9f6a6c`.

## Motivation

In standard browser environments, web pages only capture key events they actually handle; unhandled keys and browser navigation chords (e.g. `Cmd+W`, `Cmd+T`, `Cmd+R`, `F12`, `Cmd+Alt+I`) pass through to the browser so tabs can be closed, reloaded, or inspected normally.

When running Godot on the Web (`godot-react-ui`), Godot's canvas key listener previously prevented default on key events globally, intercepting standard browser shortcuts even when no UI element or text input had focus or claimed the key.

## Implementation

1. **Key Chord Claim Mechanism:**
   - Elements declare the chords they claim (`keyClaims`). Only claimed chords or keys typed into focused text inputs have `preventDefault()` called.
   - Unhandled keys and unmapped chords flow naturally to the browser's native event handlers.

2. **Editor Key Claims (`demo/src/editor/key-claims.ts`):**
   - The code editor dynamically derives its claims (`editorKeyClaims`) directly from its `Keymap` table (`Cmd+L`, `Cmd+D`, etc.).
   - Prevents duplicate lists while ensuring all editor actions are preserved and browser conflicts are avoided.

3. **Key Passthrough Lab & Verification:**
   - Added `demo/src/key-passthrough-lab.tsx` and verifier `demo/src/verify-key-passthrough.ts`.
   - Added unit tests in `tests/editor-key-claims.test.ts`.
   - Web verification suite in `scripts/verify-key-passthrough-web.mjs`.

## Verification

- `pnpm test:types`: passed cleanly.
- `npx tsx --test tests/editor-key-claims.test.ts`: passed (3 tests).
- Web verifier (`node scripts/verify-interaction-web.mjs --only=key-passthrough`): 140 checks passed.
