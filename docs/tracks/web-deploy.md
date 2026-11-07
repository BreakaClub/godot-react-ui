# Track: web deployment for react.breaka.club

Branch `web-deploy`, based on `main`. Deployment configuration and tooling for hosting the Godot React UI demonstration and Lab Navigator at `https://react.breaka.club`.

## Architecture

Matches the deployment pattern used by `breaka-rpg` for `game.breaka.club` and `debug.breaka.club`:
- **Cloudflare Worker**: `godot-react-ui-demo`, configured via `wrangler.react-demo.jsonc` with custom domain `react.breaka.club`.
- **R2 Storage**: Assets are stored in bucket `breaka-asset-uploads` under prefix `react-demo/v2/` (releases, objects and the pointer; before `web-load`, files by name under `react-demo/current/`).
- **Isolation Headers**: Required by Godot's WebAssembly multi-threaded runtime and `SharedArrayBuffer`:
  - `Cross-Origin-Opener-Policy: same-origin`
  - `Cross-Origin-Embedder-Policy: require-corp`
  - `Cross-Origin-Resource-Policy: cross-origin`
- **Routing & Navigator Landing**:
  - Request to bare root `/` without query parameters redirects (302) to `/?demo=navigator` so visitors land in the Lab Navigator.
  - Query parameters (`?lab=<id>`, `?demo=navigator`, `?demo=app`) are passed through to the Web demo shell.
- **Releases and caching** (rebuilt by the `web-load` track, `docs/tracks/web-load.md`, which has the reasons and the measurements):
  - A deploy publishes an immutable release to `react-demo/v2/` (a manifest and content-addressed objects, a brotli copy of each compressible file) and then moves one
    pointer object, `current.json`. The Worker serves `/` (the current release's page) with `Cache-Control: no-cache` and an ETag, so a deploy is picked up on the next visit
    and an unchanged page costs a 304. The page's `<base href="/r/<release>/">` sends every relative load of the engine to that release; `.wasm` and `.pck` answer there with
    a cacheable redirect to `/o/<hash>/<name>`, so a binary that did not change is already in the visitor's cache. Everything under `/r/` and `/o/` is
    `public, max-age=31536000, immutable`.
  - Files are sent with the stored `Content-Encoding: br` when the browser accepts it. There is no `Clear-Site-Data` and no revision cookie.
  - The old layout (`react-demo/current/<file>`, served by name) is no longer read; its objects are left in the bucket for the previous Worker version.
  - The cross-origin isolation headers are on every response, including redirects, 304s and errors.

## Scripts

```sh
pnpm deploy:web:plan        # stage and compress the release, print every file and what would be uploaded (dry run)
pnpm deploy:web             # upload what the bucket lacks, point the site at the new release, deploy the Worker if its source changed
pnpm deploy:web:releases    # the releases the site has shown, newest first
pnpm deploy:web:rollback    # point the site back at the release before the current one (one object write)
pnpm check:site --url=https://react.breaka.club/ --files    # load the site in headless Chrome, compare every file, open a lab and the code panel
```

`--local --persist-to=<directory>` runs any of these against wrangler's local R2 state for `wrangler dev` (see `docs/tracks/web-load.md`).
