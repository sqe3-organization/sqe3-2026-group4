# sqe3-2026-group4

GitLab API testing framework built with Bun and TypeScript.

Use Bun 1.4.4 or newer:

```sh
bun install
bun run src/index.ts
```

Run `bun run lint` before opening a pull request. It checks the code with Oxlint.

Tests use Vitest on Node.js (version in `.nvmrc`): `bun run test`.
For coverage or the test UI, use `bun run test:coverage` or `bun run test:ui`.

`GITLAB_RETRY_LIMIT` sets the HTTP retry limit and defaults to `0`.

Wiki LLTCs use the project IDs and local tokens in `.env.example`. Copy it to
`.env`, set the editor token with `api` scope and a separate reader token with
only `read_api`, then run:

```sh
bun run test tests/integration/wiki.spec.ts
bun run test tests/integration/wiki.spec.ts -t TC_WIKI_POST_001
```

The empty-wiki project must be separate and already have no pages. Each case
creates unique pages and cleans up its own fixtures. Avoid other Wiki writers
during the full-list integrity check. Cleanup failures report slugs for recovery.
`TC_WIKI_PUT_002` checks the L2 empty-update no-op; `TC_WIKI_E2E_002` checks
read-only token scope rather than different project roles.
