# Lab 5 — Matthew: Project Wiki

[Group lab](l5.md) · [Lab 4](../l4/l4_matthew.md)

## Activity 1 — Wiki test organization

The [Wiki spec](../../../tests/integration/wiki.spec.ts) retains its HTTP method and E2E sections. Tags let Vitest select a group without changing the LLTC IDs or fixture behavior.

| Test group | LLTCs | Executions in the full suite |
| --- | --- | ---: |
| Smoke and boundary | GET 005 | 1 |
| Functional | POST 001, 005 · PUT 001, 002 · GET 001, 002, 004 · DELETE 001 | 17 |
| Negative | POST 002–004 · PUT 003, 004 · GET 003 · DELETE 002, 003 | 8 |
| E2E | E2E 001, 002 | 2 |
| Total | 19 distinct LLTCs | 28 |

```sh
bun run test tests/integration/wiki.spec.ts --tagsFilter='wiki && smoke'
bun run test tests/integration/wiki.spec.ts --tagsFilter=wiki
```

The smoke case also carries the boundary tag and counts once. Dataset rows account for the difference between 19 LLTCs and 28 executions.

## Activity 2 — Execution and reports

During the initial validation, I ran two consecutive regressions by tag against the configured GitLab test projects.

| Round | Smoke | Functional | Negative | E2E | Passed | HTTP requests |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 1 | 17 | 8 | 2 | 28/28 | 146 |
| 2 | 1 | 17 | 8 | 2 | 28/28 | 146 |

The JUnit reports include tests skipped by each tag filter. The table counts only the selected cases. The same four groups ran sequentially in both rounds, each with its own JUnit, HTML and Pino reports.

I then ran the CT command locally against the same projects, this time with the whole suite in one invocation. All 28 executions passed in 61.52 seconds. The run produced one JUnit file and one HTML report. The Pino summary recorded 146 HTTP requests across 19 LLTCs.

## Activity 3 — Maintenance and coverage

All 19 [Wiki LLTCs from Lab 1](../l1/l1_matthew.md#casos-lltc) remain implemented. The smoke check now makes one GET against the dedicated empty Wiki. It verifies the HTTP status, response type and empty list in one request.

| Wiki path | Methods exercised | Coverage examples |
| --- | --- | --- |
| `/projects/:id/wikis` | GET, POST | Empty list, list with content, create with default format, reject missing fields and invalid credentials |
| `/projects/:id/wikis/:slug` | GET, PUT, DELETE | Read nested paths, update content, verify that an update without editable fields leaves the page unchanged, reject missing pages and unauthorized writes, verify deletion |

Together, these tests exercise five HTTP method and path combinations. The two E2E cases exercise the full page lifecycle and verify the restrictions of the read-only token. Future unit coverage can target the Got client factory and GitLab configuration, which the current unit tests exercise only indirectly.

## Activity 4 — GenAI-assisted unit tests

I used Claude Code with `--model claude-opus-5-5 --effort medium`. My initial request was:

```text
Help me write Vitest unit tests for the request manager and the framework utilities we use in the GitLab Project Wiki tests.

Read the implementation and its existing unit tests first. Identify a few behaviors that matter to callers and are missing coverage. For the request manager, look at how it builds an outgoing request and what the caller receives when the HTTP client fails. For the utilities, pick a helper the Wiki tests actually use and an input where a regression would change the result. Choose cases based on what the code supports, and explain briefly why each one is worth adding.

Implement the tests using the repository’s existing conventions. Mock the HTTP client at the point where the request manager calls it, so the tests exercise the manager’s own logic without contacting GitLab or needing credentials. Keep the changes in unit test files.

Run the affected tests and report the exact command and result. Summarize what each new test verifies. If you measure coverage, include the command and the figures you observed.
```

For the text-only session, I described how the request manager forwards calls and how the report generator summarizes HTTP responses, transport failures and malformed log entries. Claude used that description to draft test examples. I reviewed them in the repository and ran the tests locally.

I checked the suggestions against the actual singleton, injected the HTTP mock through the request options, and used the report generator's real file format and output paths. The [request manager tests](../../../tests/unit/request-manager.test.ts) cover singleton identity, JSON options and full responses, empty DELETE bodies, transport failures and rejected HTTP responses. The [report tests](../../../tests/unit/log-reporter.test.ts) cover mixed log entries, JSON and Markdown output, latest-run selection, and missing logs.

```sh
bun run test:unit
bun run test:coverage --reporter=default --reporter=junit --outputFile.junit=reports/ci/junit.xml
```

All eight tests passed locally without HTTP traffic. V8 reported 61.06% line coverage across `src/`, 100% for the request manager and 89.70% for the report generator. These figures measure unit execution of source code. The endpoint matrix above measures integration coverage.

## Activity 5 — Wiki continuous testing

The [CT workflow](../../../.github/workflows/ct.yml) runs the whole Wiki suite once per trigger. The temporary Wiki configuration selects the spec. Use the same command locally to generate JUnit, HTML and Pino reports under `reports/ct/`.

```sh
bun scripts/tmp/generate-individual-test-reports.ts
```
