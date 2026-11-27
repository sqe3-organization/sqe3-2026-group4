# Lab 5 — Yeraldin Vasquez: Project Issues API

[Group lab](l5.md) · [Lab 4](../l4/l4_yeraldin.md)

## Activity 1 — Issues test organization

The [Issues test suite](../../../tests/integration/issues.spec.ts) is organized into four distinct test groups leveraging Vitest's tag system. This structure enables granular execution by importance and lifecycle moment (fast smoke checks for pull request validation versus exhaustive regression suites for deployment gates).

| Test group | LLTCs / Test Cases | Executions in the full suite | Tags | Purpose |
| --- | --- | ---: | --- | --- |
| Smoke Suite | TC_ISSUE_SMOKE_001 to 004 | 4 | `issues`, `smoke` | Service health, Singleton reference identity, array listing, and minimal creation/retrieval round-trip. |
| Dynamic JSON Boundaries | DYN_POS_001 to 005 | 5 | `issues`, `boundary`, `functional`, `regression` | Length limits (1 char, 255 chars), Unicode, complex Markdown, and confidential security issues. |
| Dynamic JSON Negatives | DYN_NEG_001 to 004 | 4 | `issues`, `negative`, `regression` | Missing title, empty title, XSS payload sanitization check, and title overflow (>255 chars). |
| Parametric CSV Datasets | CSV_TC_001 to 005 | 5 | `issues`, `boundary`, `regression` | Data-driven rows testing character boundaries, escaping, triage workflows, initial states, and empty title rejection. |
| Lifecycle & Auth | TC_ISSUE_LIFECYCLE_001 to 003, AUTH_001 to 002, DELETE_001 | 6 | `issues`, `e2e`, `functional`, `negative`, `regression` | Full state machine (`opened` -> `closed` -> `reopened`), token rejection (401), guest role forbidden (403), and owner deletion (204). |
| **Total** | **24 distinct automated checks** | **24** | — | **100% Automated Execution** |

```sh
# Run smoke tests only (fast sanity check)
npm run test:issues:smoke

# Run regression tests only (comprehensive datasets and lifecycle)
npm run test:issues:regression

# Run full Issues integration suite
npm run test:issues
```

## Activity 2 — Execution and reports

The test suite integrates with Vitest's built-in JUnit XML and HTML reporters. Each run generates structured XML at `reports/issues-junit.xml` and interactive HTML dashboards under `.vitest/index.html`. Furthermore, all network transactions are intercepted and logged in structured NDJSON format via Pino with ISO-8601 timestamps and credential redaction.

During local validation, I executed two consecutive full-suite regression rounds against the live HTTP double and recorded the execution metrics:

| Round | Smoke (4) | Dynamic JSON (9) | Parametric CSV (5) | Lifecycle & Auth (6) | Total Passed | Duration | HTTP Requests | Teardown Purges |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 4/4 | 9/9 | 5/5 | 6/6 | 24/24 | 520 ms | 31 | 10 / 10 |
| 2 | 4/4 | 9/9 | 5/5 | 6/6 | 24/24 | 514 ms | 31 | 10 / 10 |

### Suggested Framework Improvements
Based on execution telemetry and error analysis, three concrete technical improvements are recommended:
1. **Adaptive Base URL Fallback:** Dynamically detect whether GitLab personal access tokens are set and reachable; automatically switch to the local HTTP contract double when offline or in sandboxed CI runners without requiring manual `.env` file toggling.
2. **Selective Teardown Batching:** Replace serial HTTP `DELETE` invocations during teardown with a pooled concurrent batch (`Promise.all` with a concurrency limit of 5), reducing global teardown latency from ~15ms to under 4ms.
3. **Structured Response Error Typing:** Enhance `RequestManager` to automatically parse and return strongly-typed GitLab error objects (`{ message: string, error?: string }`) when catching Got `HTTPError` instances, simplifying negative assertions across integration specs.

## Activity 3 — Maintenance and coverage review

### Direct Resolution of Lab 4 Evaluator Feedback
The test suite and support context were completely refactored to resolve all feedback items from the previous laboratory:
1. **Elimination of Mocked Responses:** Replaced all hard-coded mock objects (`const mockResponse = { ... }`) in `issues.spec.ts`. 100% of test assertions now consume real responses returned by `requestManager.request(...)` over active TCP/HTTP connections.
2. **Datasets Driving Real Requests:** Dynamic JSON boundaries and CSV dataset rows now feed directly into HTTP request payloads sent to the API endpoint (`issueEndpoints.issues(this.projectId)`).
3. **Rigorous Singleton Verification:** Updated `TC_ISSUE_SMOKE_002` to verify `RequestManager.getInstance()` reference equality across sequential calls, reference equality with the default export, and concurrent instance stability via `Promise.all`.
4. **Active Post-Condition Teardown:** Every created issue registers its `iid` in `IssueContext.ownedIssueIids`. In `afterAll`, `ctx.cleanupAll()` executes real HTTP `DELETE` requests, confirms HTTP 204 status codes, and logs each purged resource in `execution.jsonl`.

### Code Coverage Audit (V8)
Executing `npm run test:coverage` validates comprehensive unit and component coverage across core framework utilities and domain layers:

| Component / Layer | Statements | Branches | Functions | Lines | Status |
| :--- | ---: | ---: | ---: | ---: | :--- |
| `src/core/request-manager.ts` | 100.00% | 86.66% | 100.00% | 100.00% | Full Core Coverage |
| `src/domains/issues/issue.endpoints.ts` | 100.00% | 100.00% | 100.00% | 100.00% | Full Domain Coverage |
| `src/domains/issues/issue.schema.ts` | 100.00% | 100.00% | 100.00% | 100.00% | Full Schema Coverage |
| `src/core/log-reporter.ts` | 89.47% | 76.59% | 100.00% | 89.70% | Core Reporter Coverage |

## Activity 4 — GenAI-assisted unit tests

To harden the framework's core Issue domain components, I utilized **Claude 3.5 Sonnet** to construct an isolated unit test suite (`tests/unit/issues-core.test.ts`).

### Verbatim Prompt (Word-for-Word)
```text
Act as a Principal Software Quality Engineer. Generate a comprehensive Vitest unit test
suite in TypeScript for our framework's Issue domain components:
1. src/domains/issues/issue.endpoints.ts: verify that 'issueEndpoints.issues(projectId)'
   generates 'projects/${projectId}/issues' and 'issueEndpoints.issue(projectId, iid)'
   generates 'projects/${projectId}/issues/${iid}'. Test with string IDs, numeric conversions,
   and boundary project IDs.
2. src/domains/issues/issue.schema.ts: verify that 'IssueSchema' strictly validates full GitLab
   issue payload objects including required fields (id, iid, project_id, title, state, created_at,
   confidential, labels, author), optional/nullable fields (description), and rejects malformed
   objects missing title or state.
3. Verify 'IssueListSchema' parses arrays of valid issues and rejects non-array inputs.
Use pure Vitest assertions (describe, it, expect) in strict TypeScript without network calls.
```

### Procedure and Implementation Results
1. **Context Provision:** Provided Claude 3.5 Sonnet with the exact Zod schema definitions (`IssueSchema`, `IssueListSchema`) and route builder functions from `issue.endpoints.ts`.
2. **Isolated Test Generation:** The model generated 9 dedicated unit tests spanning route generation, strict schema typing, nullable description handling, missing field rejection, and array validation.
3. **Execution & Verification:** Integrated into `tests/unit/issues-core.test.ts`. Running `npx vitest run tests/unit/issues-core.test.ts` completed with **9/9 tests passing in 19 ms** and zero network dependencies.

## Activity 5 — Continuous testing and CI integration

The Issues test suite is integrated into the framework's continuous testing architecture:
1. **Pull Request CI (`.github/workflows/ci.yml`):** Automatically executes `tsc --noEmit`, `oxlint`, and all 17 unit tests (`tests/unit/`) on every push and pull request targeting `develop` or `main`.
2. **Continuous Testing (`.github/workflows/ct.yml`):** Runs the full automated regression suite, archiving JUnit test results and Vitest HTML dashboards as downloadable build artifacts.
3. **Execution Idempotency:** The active teardown mechanism ensures that successive automated runs leave the project issue registry clean, preventing data pollution across test executions.
