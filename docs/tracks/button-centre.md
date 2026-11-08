# Track: Button centres its content and text by default

Branch `button-centre`, based on main `c9f6a6c`.

## Motivation & Architecture

In HTML/CSS, a `<button>` element centres its contents and text by default:
- Centring along both flex axes: `align-items: center` and `justify-content: center`.
- Inherited text centring: `text-align: center` so multi-line text labels inside buttons stay centred.

Previously, `Button` in `godot-react-ui` behaved like an unstyled flex container without user-agent styling defaults, requiring explicit `items-center justify-center text-center` classes everywhere buttons were used.

## Implementation

1. **User Agent Stylesheet (`native/user_agent.rs`):**
   - Implemented `user_agent::apply(kind, spec)` called during computed style resolution (`computed_style.rs`).
   - For `Kind::Button`, defaults `align_items`, `justify_content`, and `text_align` to `Center`.
   - Author styles (`className`, `style` prop, utility classes) are resolved with higher precedence over UA defaults, allowing full override (e.g., `items-start`, `text-left`, `justify-between`).

2. **Component Updates (`src/components.tsx`, `src/kit/`):**
   - Cleaned up redundant centring declarations in `src/components.tsx` and kit primitives (`checkbox`, `combobox`, `radio-group`, `select`, `switch`).
   - Updated demo labs and verifiers to rely on standard button centring defaults.

## Verification

- `cargo test`: 919 passed, 0 failed.
- `cargo clippy --all-targets -- -D warnings`: passed cleanly.
- `cargo fmt --check`: passed cleanly.
- `pnpm test:types`: passed cleanly.
- `pnpm test`: 988 passed, 0 failed.
- Native transforms verifier: passed with the bar as a plain `Button`.
