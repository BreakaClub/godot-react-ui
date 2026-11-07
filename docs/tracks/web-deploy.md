# Track: web deployment for react.breaka.club

Branch `web-deploy`, based on `main`. Deployment configuration and tooling for hosting the Godot React UI demonstration and Lab Navigator at `https://react.breaka.club`.

## Architecture

Matches the deployment pattern used by `breaka-rpg` for `game.breaka.club` and `debug.breaka.club`:
- **Cloudflare Worker**: `godot-react-ui-demo`, configured via `wrangler.react-demo.jsonc` with custom domain `react.breaka.club`.
- **R2 Storage**: Assets are stored in bucket `breaka-asset-uploads` under prefix `react-demo/current/`.
- **Isolation Headers**: Required by Godot's WebAssembly multi-threaded runtime and `SharedArrayBuffer`:
  - `Cross-Origin-Opener-Policy: same-origin`
  - `Cross-Origin-Embedder-Policy: require-corp`
  - `Cross-Origin-Resource-Policy: cross-origin`
- **Routing & Navigator Landing**:
  - Request to bare root `/` without query parameters redirects (302) to `/?demo=navigator` so visitors land in the Lab Navigator.
  - Query parameters (`?lab=<id>`, `?demo=navigator`, `?demo=app`) are passed through to the Web demo shell.
- **Caching**:
  - HTML documents (`.html`) are served with `Cache-Control: no-store` to ensure prompt updates.
  - Binaries and scripts (`.wasm`, `.pck`, `.js`) are served with ETag support and `Cache-Control: public, max-age=300, stale-while-revalidate=86400`.

## Scripts

```sh
pnpm deploy:web:plan     # inspect files and target R2 prefix (dry run)
pnpm deploy:web          # upload release files to R2 and deploy the Cloudflare Worker
```
