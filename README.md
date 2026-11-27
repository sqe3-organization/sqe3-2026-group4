# sqe3-2026-group4

GitLab API testing framework built with Bun and TypeScript.

- `src/core/` holds the GitLab client, request manager, environment settings,
  and logging and reporting code.
- `src/domains/` holds endpoint builders and response schemas by feature.
- `tests/` holds Vitest specs, fixtures, and datasets.

[Framework architecture](wiki/labs/l4/architecture.md)

Use Bun 1.4.4 or newer:

```sh
bun install
bun run src/index.ts
```

Run `bun run lint` before opening a pull request. It checks the code with Oxlint.

Tests use Vitest on Node.js (version in `.nvmrc`): `bun run test`.
Use `bun run test:ui` to open the Vitest UI.

`GITLAB_RETRY_LIMIT` sets the HTTP retry limit and defaults to `0`.

Copy `.env.example` to `.env` and supply the Wiki project IDs, an editor token
with `api` scope, and a separate reader token with `read_api` scope. To run the
full Wiki suite or just the page creation case:

```sh
bun run test tests/integration/wiki.spec.ts
bun run test tests/integration/wiki.spec.ts -t TC_WIKI_POST_001
```

The empty-wiki project must be separate and already have no pages. Cases that create pages
use unique names and clean up their own fixtures. Avoid other Wiki writers
during the full-list integrity check. Cleanup failures report slugs for recovery.
`TC_WIKI_PUT_002` checks the L2 empty-update no-op; `TC_WIKI_E2E_002` checks
read-only token scope rather than different project roles.

## Test logs and reports

Vitest records logs automatically when a test uses the shared request manager
or logs a test step. When a run emits events, Vitest prints the path and saves
three files together under `logs/run-<id>/`:

- `execution.jsonl` contains the individual Pino events.
- `execution-report.json` and `execution-report.md` summarize the run.

Use `bun run report:logs` to regenerate the latest report. To read events in
the terminal or regenerate a specific report, use the path printed by Vitest:

```sh
bun run logs:pretty < 'logs/run-<id>/execution.jsonl'
bun run report:logs 'logs/run-<id>/execution.jsonl'
```

`LOG_OUTPUT_DIR` changes the output directory and `LOG_LEVEL` changes the
minimum log level. The defaults are `logs/` and `info`.

## CI and Wiki CT

Run `bun run test:unit` for the framework unit tests or
`bun run test:coverage` for V8 coverage. These commands use no GitLab
credentials.

For a quick read-only check, run the Wiki smoke case against the configured empty project.

```sh
bun run test tests/integration/wiki.spec.ts --tagsFilter='wiki && smoke'
```

To run the full Wiki suite locally with the same reports as CT:

```sh
bun scripts/tmp/generate-individual-test-reports.ts
```

CT writes JUnit, HTML and Pino reports under `reports/ct/`. Each run has its own directory for comparison.
See [Lab 5](wiki/labs/l5/l5.md#activity-5--integration-and-continuous-testing)
for the workflow triggers and configuration.
