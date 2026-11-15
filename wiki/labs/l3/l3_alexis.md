# Lab 3 — Alexis Frene: Project labels

[Group lab](l3.md) · [Lab 1 design](../l1/l1_alexis.md) · [Lab 2 Postman implementation](../l2/l2_alexis.md)

**Feature:** GitLab REST API v4 Project labels.

This individual contribution completes one part of every activity. It moves the
17 label LLTCs from the Postman collection into a TypeScript/Vitest contract
suite, validates response bodies with Zod and documents the evidence boundary
between reproducible local checks and a live GitLab execution.

## Contents

- [Activity 1: Feedback and automated collection execution](#activity-1)
- [Activity 2: API request tool](#activity-2)
- [Activity 3: Test runner](#activity-3)
- [Activity 4: Collaboration and CI](#activity-4)
- [Activity 5: Requests, assertions and hooks](#activity-5)
- [Activity 6: Migration and compatibility](#activity-6)
- [Sources](#sources)

---

<a id="activity-1"></a>

## Activity #1: Feedback and automated collection execution

### 1.1 Suggestions carried forward from Lab 2

The Postman implementation in Lab 2 already generated unique label names, used
form-encoded create/update requests and kept credentials outside the repository.
The following improvements were carried into the code-based migration:

| Feedback from Lab 2 | Lab 3 response |
| --- | --- |
| Check more than the HTTP status. | Assert status, JSON media type, important fields and the Zod response schema. |
| Verify state after a mutation. | Read the label again after create, update, rejected update and delete. |
| Avoid test data collisions. | Generate a `runId` and use it in every label name. |
| Make cleanup repeatable. | Track IDs created by the current test and remove them in `afterEach`. |
| Distinguish execution units. | Report Postman assertions, Vitest cases and live HTTP requests separately. |

### 1.2 Collection and execution scope

The source collection is [Alexis' Lab 2 Project labels collection](../l2/postman/alexis-lab2/alexis-project-labels.postman_collection.json).
It contains 17 LLTC cases: five POST, four GET, five PUT, two DELETE and one
end-to-end lifecycle. It uses the credential-free environment template and
does not store a token or project identifier.

The current repository does not contain a live GitLab project or Alexis'
tokens, so a Newman run against GitLab is intentionally not reported as
passed. The team Wiki Newman run in [Matthew's report](l3_matthew.md#activity-1)
is separate evidence and must not be counted as label execution. The code-based
contract suite described in Activities 5 and 6 supplies reproducible local
evidence for the label assertions; a live Newman run remains a handoff step
requiring a dedicated test project and sanitized credentials.

### 1.3 Difficulties and possible defects

- Create and update requests use `application/x-www-form-urlencoded`, unlike
  the JSON requests used by the other team features.
- A label title used as a path parameter must be URL-encoded. The numeric ID is
  preferred for updates and deletes.
- The exact validation status for an empty update and a negative priority must
  be confirmed against the configured GitLab version; the suite records the
  contract as a `400` validation response without claiming a live status.
- A reader token may be authenticated but unable to mutate a label. The
  authorization case therefore checks the response and then verifies that the
  original label is unchanged.
- Cleanup must be limited to IDs created by the current test. Existing project
  labels must never be deleted by an automated run.

---

<a id="activity-2"></a>

## Activity #2: API request tool

### 2.1 Comparison

| Criterion | Got | Axios | Ky | Native Fetch |
| --- | --- | --- | --- | --- |
| Shared configuration | `got.extend` centralizes base URL, headers, timeout and retries. | Instances and interceptors provide similar behavior. | Instances and hooks provide defaults. | Requires a wrapper around `fetch`. |
| TypeScript | Typed client; runtime response validation is still required. | Typed client; runtime response validation is still required. | Typed helpers; runtime response validation is still required. | Platform types only; validation is caller-owned. |
| Negative statuses | `throwHttpErrors: false` exposes 4xx/5xx responses to assertions. | `validateStatus` can be configured. | Error behavior can be configured. | Statuses are returned directly. |
| Form data and JSON | Supports both `form` and `json` options. | Supports both request bodies. | Supports both request bodies. | Supports both, but headers and serialization are manual. |
| Team fit | Already integrated in the shared framework. | Viable but would replace the adopted client API. | Viable alternative. | More local infrastructure would be needed. |

### 2.2 Selected tool and label request design

The selected client is **Got `16.2.0`**, already provided by the shared
[`createGitLabClient`](../../../src/api/client.ts). It supplies the base URL,
`PRIVATE-TOKEN`, JSON responses, timeout and explicit retry policy. Label create
and update operations use the client's form option; list/retrieve operations
use query/path parameters; delete checks the empty `204` response.

`throwHttpErrors: false` is important because the tests need to inspect the
expected `400`, `401`, `403` and `404` responses rather than catching an
exception before the assertion.

### 2.3 GenAI prompt and procedure

**Prompt used:**

> Compare Got, Axios, Ky and native Fetch for a TypeScript GitLab Project labels API test suite. Consider shared base URL and token configuration, JSON and form-encoded requests, explicit 4xx/5xx assertions, timeouts, retries, TypeScript support, runtime schema validation and CI usage. Recommend one option for an existing framework that already uses Got, and list the trade-offs without inventing performance measurements.

**Procedure:**

1. Identify the request formats and negative cases required by the Project
   labels API.
2. Compare the four alternatives using the same criteria.
3. Select Got because the group framework already provides its client factory.
4. Verify that the label-specific requirement for form-encoded mutations is
   represented in the test design.

---

<a id="activity-3"></a>

## Activity #3: Test runner

### 3.1 Comparison

| Criterion | Vitest | Jest | Mocha | Bun Test |
| --- | --- | --- | --- | --- |
| TypeScript workflow | Vite transformation with a separate type-check command. | Requires a configured TypeScript transformer. | Requires an assertion and TypeScript setup. | Executes TypeScript through Bun. |
| Assertions and hooks | `expect`, mocks, hooks and test contexts. | Matchers, mocks and hooks. | Hooks are built in; assertions are assembled separately. | Jest-like assertions, mocks and hooks. |
| CI execution | `vitest run` is headless and script-friendly. | Headless CLI execution. | Headless CLI execution. | `bun test` execution. |
| Team fit | Already configured for this repository and used by Issues/Wiki. | Would add a second runner convention. | Would require more libraries. | Not the runner selected by the team. |

### 3.2 Selected runner

The selected runner is **Vitest `5.1.0`**. The label suite uses explicit
`describe`, `it`, `expect`, `beforeEach` and `afterEach` imports, matching the
repository's existing configuration. Zod is used separately because a
TypeScript type alone cannot validate JSON received from an API.

### 3.3 GenAI prompt and procedure

**Prompt used:**

> Compare Vitest, Jest, Mocha and Bun Test for a TypeScript REST API test suite. Consider hooks, assertions, schema validation, isolated test data, parallel execution and CI. Recommend the runner that best fits a repository already configured with Vitest and state which claims require local verification.

**Procedure:**

1. Reuse the group's runner and dependency versions.
2. Keep one test case per LLTC ID so the migration is traceable.
3. Add a local contract double to make the label checks reproducible without
   a network or secret.
4. Run the suite and record the result separately from live GitLab evidence.

---

<a id="activity-4"></a>

## Activity #4: Collaboration and CI

### 4.1 Branch and commit proposal

The group model remains `main` for stable delivery, `develop` for integration
and focused feature/fix branches created from `develop`. Alexis' focused
change can use `feat/labels-code-migration` or `docs/labels-lab3` when the
implementation and report are reviewed separately.

The proposed Conventional Commit is:

```text
test(labels): migrate project label LLTCs to Vitest
```

### 4.2 Pull request checklist

- Link the 17 LLTC IDs to the TypeScript tests and the Lab 2 collection.
- Include the local command and its result; do not call a contract-double run
  a live GitLab run.
- Keep tokens, cookies, project IDs and local `.env` files out of the diff.
- Review cleanup behavior, especially the reader-token and delete cases.
- Ask at least one teammate to review the schema and request-format choices.

### 4.3 CI proposal

The CI job should install the pinned toolchain, run type checking and linting,
then run the deterministic label contract suite. A separate, protected live
integration job may run the Postman/Newman collection only when it has a
dedicated project and secrets. Its report should state request counts,
assertion counts, target project and cleanup result. No live credential is
required for the local contract job.

---

<a id="activity-5"></a>

## Activity #5: Requests, assertions and hooks

### 5.1 First request without a preconditioned resource

`TC_LABEL_GET_000` lists labels before any label is created in the test case.
It verifies a `200` response, the JSON media type and an empty array. This is a
safe first request because it does not depend on a previously created label.

The implementation is in [`labels.spec.ts`](../../../tests/integration/labels.spec.ts).
The `LabelApiDouble` is deliberately local and deterministic; it models the
HTTP status/body contract so the assertions can run without a GitLab token.

### 5.2 Assertions and schemas

[`label.schema.ts`](../../../src/schemas/label.schema.ts) defines:

- `LabelSchema` for identity, name, color, description, priority and archived
  state, plus optional GitLab metadata.
- `LabelListSchema` for collection responses.
- `LabelErrorSchema` for validation, authentication, authorization and
  not-found responses.

The suite checks exact statuses, the JSON content type for JSON responses,
empty bodies for `204 No Content`, response fields after mutations and the
absence of deleted or rejected resources.

### 5.3 Hooks and cleanup

Each test gets a fresh in-memory API state in `beforeEach`. IDs returned by
successful create operations are registered in `createdIds`. `afterEach`
deletes only those IDs and accepts `204` or already-absent `404`, reproducing
the collection's cleanup rule without touching unrelated data.

The same lifecycle can be used by a live adapter later: create resources,
register the returned IDs immediately, run assertions, then clean up in a
`finally`/teardown boundary even when an assertion fails.

---

<a id="activity-6"></a>

## Activity #6: Migration and compatibility

### 6.1 Postman-to-code traceability

| Postman LLTC | TypeScript check | Main verification |
| --- | --- | --- |
| `TC_LABEL_POST_001` | `labels.spec.ts` | Create, schema, field values and retrieval. |
| `TC_LABEL_POST_002` | `labels.spec.ts` | Missing name returns validation response. |
| `TC_LABEL_POST_003` | `labels.spec.ts` | Missing color returns validation response. |
| `TC_LABEL_POST_004` | `labels.spec.ts` | Invalid token returns `401`; no resource is created. |
| `TC_LABEL_POST_005` | `labels.spec.ts` | `priority=0` and `archived=true` persist. |
| `TC_LABEL_GET_001` | `labels.spec.ts` | Search and `per_page=1` behavior. |
| `TC_LABEL_GET_002` | `labels.spec.ts` | Encoded title retrieves the same ID. |
| `TC_LABEL_GET_003` | `labels.spec.ts` | Nonexistent label returns `404`. |
| `TC_LABEL_GET_004` | `labels.spec.ts` | Archived filter excludes active labels. |
| `TC_LABEL_PUT_001` | `labels.spec.ts` | Color and description update. |
| `TC_LABEL_PUT_002` | `labels.spec.ts` | Rename and retrieve by new title. |
| `TC_LABEL_PUT_003` | `labels.spec.ts` | Empty update is rejected; original state remains. |
| `TC_LABEL_PUT_004` | `labels.spec.ts` | Negative priority is rejected without partial mutation. |
| `TC_LABEL_PUT_005` | `labels.spec.ts` | Reader token cannot mutate the label. |
| `TC_LABEL_DELETE_001` | `labels.spec.ts` | `204` delete followed by `404` retrieval. |
| `TC_LABEL_DELETE_002` | `labels.spec.ts` | Nonexistent deletion returns `404`. |
| `TC_LABEL_E2E_001` | `labels.spec.ts` | Complete create-read-update-filter-delete lifecycle. |

The additional `TC_LABEL_GET_000` is the no-preconditioned first request from
Activity 5; it is not counted as one of the 17 Lab 2 LLTCs.

### 6.2 Compatibility review

- **Got + Vitest:** the repository is ESM and already uses the shared Got
  client with Vitest.
- **Zod + TypeScript:** Zod validates external JSON at runtime while TypeScript
  describes the code at compile time.
- **Form encoding:** the live adapter must send `form` fields for create and
  update, not JSON, and must URL-encode label titles in path parameters.
- **Node/Bun:** type checking and scripts follow the versions declared in
  `package.json` and `.node-version`; the recorded local command should name
  the actual runtime used.

### 6.3 Validation and evidence

The local suite is intentionally independent of GitLab. Its result is evidence
for the response assertions, schemas, lifecycle and cleanup logic. It is not
evidence that GitLab accepted a request. A live validation must additionally
run the Postman collection or a live Got adapter with a dedicated project,
manager token and read-only token, and must attach the sanitized Newman report.

Recorded local validation on **November 15, 2026**:

| Check | Result |
| --- | --- |
| Label contract suite | 18 tests passed, 0 failed, including the 17 migrated LLTCs and the no-preconditioned first request. |
| Oxlint on label files | Passed. |
| Live GitLab/Newman run | Not run: no project ID or token is stored in the repository. |
| Bun typecheck | Not run in this environment because Bun is not installed; the repository still declares `bun check --no-script` as the project command. |

The local Vitest run used a single thread to accommodate the Windows sandbox:

```text
vitest run --pool=threads --no-file-parallelism tests/integration/labels.spec.ts
Test Files  1 passed (1)
Tests       18 passed (18)
```

## Sources

- [GitLab Project labels API](https://docs.gitlab.com/api/labels/).
- [GitLab REST API authentication](https://docs.gitlab.com/api/rest/authentication/).
- [Got documentation](https://github.com/sindresorhus/got#documentation).
- [Vitest documentation](https://vitest.dev/guide/).
- [Vitest test context](https://vitest.dev/guide/test-context.html).
- [Zod documentation](https://zod.dev/).

