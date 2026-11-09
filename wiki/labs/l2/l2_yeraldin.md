# Lab 2 — Yeraldin: Project issues implementation

[Back to the group lab](l2.md)  
[Back to the Lab 1 design](../l1/l1_yeraldin.md)

This document contains Yeraldin Vasquez's individual deliverables for **Lab 2: API testing with Postman**, focused on the **Project Issues** feature of the GitLab REST API v4 (`/api/v4/projects/:id/issues`).

---

## Contents

- [Activity 1: Tool setup, sample requests and authorization](#activity-1)
- [Activity 2: Assertions and Lab 1 implementation](#activity-2)
- [Activity 3: Preconditions, postconditions and variables](#activity-3)
- [Activity 4: Structure and automated execution](#activity-4)
- [Activity 5: Review and feedback](#activity-5)
- [Postman deliverables](#deliverables)
- [Sources](#sources)

---

<a id="activity-1"></a>

## Activity #1: Tool setup, sample requests and authorization

### 1.1 Tool setup and sample requests

For this lab, I configured **Postman** (desktop app and Newman CLI v6.2) to interact with the GitLab REST API v4 (`https://gitlab.com/api/v4`).

Initial configuration steps:
1. Created a dedicated workspace for SQE3.
2. Defined the environment template `yeraldin-project-issues.postman_environment.example.json`.
3. Adjusted default headers (`Accept: application/json`, `User-Agent`).
4. Verified SSL/TLS connectivity and base latency towards `gitlab.com`.

Before building complex functional test cases, I executed simple exploratory requests to verify service availability and API contracts:

- **Version check:** `GET https://gitlab.com/api/v4/version`. Confirmed service availability and server revision, returning `200 OK`.
- **Accessible projects:** `GET https://gitlab.com/api/v4/projects?per_page=1`. Used to inspect JSON array responses and verify pagination headers (`x-total`, `x-per-page`).

### 1.2 Assigned application authorization

GitLab REST API v4 requires role-based access control. In this collection, authorization is implemented via the HTTP header `PRIVATE-TOKEN: {{token_reporter}}` (or `{{token_owner}}` for destructive actions) bound to environment variables.

**Role and permission matrix:**

| Role | Variable | Permissions evaluated | Associated test cases |
| --- | --- | --- | --- |
| **Reporter** | `token_reporter` | Create issues, retrieve details, update description, and close issues. | `TC_ISSUE_POST_001`, `TC_ISSUE_PUT_001`, `TC_ISSUE_PUT_002` |
| **Project Owner** | `token_owner` | Permanent issue deletion (`DELETE /issues/:iid`). | `TC_ISSUE_DELETE_001`, `TC_ISSUE_E2E_001` |
| **Guest** | `token_guest` | Read-only role without mutation permissions in private projects. | `TC_ISSUE_E2E_002` (verifies 403 Forbidden or 404) |
| **Invalid / Missing token** | `invalid_token_...` | Immediate access rejection. | `TC_ISSUE_POST_003` (verifies 401 Unauthorized) |

---

<a id="activity-2"></a>

## Activity #2: Assertions and Lab 1 implementation

### 2.1 Postman verification concepts

Tests in Postman run in the **Tests** tab immediately after receiving the HTTP response. Assertions are structured using Chai BDD syntax encapsulated in the `pm.*` API:
- `pm.test(testName, callback)`: Declares a test block reported in the runner.
- `pm.response.code`: Checks the exact numerical HTTP status code.
- `pm.response.json()`: Parses JSON response bodies to assert properties and data types.
- `pm.response.headers`: Inspects response headers (`Content-Type`, `x-per-page`, etc.).
- `pm.response.responseTime`: Measures latency thresholds in milliseconds.

### 2.2 Implemented test cases from Lab 1

The collection implements all 15 test cases designed in Lab 1 (`wiki/labs/l1/l1_yeraldin.md`), plus the cleanup request and the E2E lifecycle suite, providing multiple assertions per request:

| Test case ID | Method and endpoint | Status and header assertions | JSON body and schema assertions |
| --- | --- | --- | --- |
| `TC_ISSUE_POST_001` | POST /projects/:id/issues | Status 201 Created; Content-Type application/json. | Properties iid, id, state opened; title matches dynamic variable; description intact; saves issue_iid. |
| `TC_ISSUE_POST_002` | POST /projects/:id/issues | Status 400 Bad Request. | Error body explicitly states "title is missing". |
| `TC_ISSUE_POST_003` | POST /projects/:id/issues | Status 401 Unauthorized. | Confirms unauthorized message with invalid credentials. |
| `TC_ISSUE_POST_004` | POST /projects/:id/issues | Status 201 Created. | Labels field is an array containing ["bug", "sqe3"]; saves labels_issue_iid. |
| `TC_ISSUE_GET_001` | GET /projects/:id/issues/:iid | Status 200 OK; response time < 2500 ms. | Matches requested iid; state is opened; author and created_at fields present. |
| `TC_ISSUE_GET_002` | GET /projects/:id/issues/999999999 | Status 404 Not Found. | Error message confirms resource not found. |
| `TC_ISSUE_PUT_001` | PUT /projects/:id/issues/:iid | Status 200 OK. | Description updated with new text; original title preserved unchanged. |
| `TC_ISSUE_PUT_002` | PUT /projects/:id/issues/:iid | Status 200 OK. | State transitions to "closed"; closed_at contains non-null timestamp. |
| `TC_ISSUE_PUT_003` | PUT /projects/:id/issues/999999999 | Status 404 Not Found. | Rejects update on nonexistent issue ID. |
| `TC_ISSUE_GET_003` | GET /projects/:id/issues?state=closed | Status 200 OK. | Returned array; iteratively checks that every element has state == "closed". |
| `TC_ISSUE_GET_004` | GET /projects/:id/issues?per_page=1 | Status 200 OK; header x-per-page is "1". | Array length is at most 1 item; pagination headers x-page and x-total present. |
| `TC_ISSUE_DELETE_001` | DELETE /projects/:id/issues/:iid | Status 204 No Content (or 200 OK). | Permanent deletion executed with Owner token. |
| `TC_ISSUE_DELETE_002` | DELETE /projects/:id/issues/999999999 | Status 404 Not Found. | Rejects deletion on nonexistent issue ID. |
| `TC_ISSUE_E2E_002` | PUT /projects/:id/issues/:labels_iid | Status 403 Forbidden (or 404). | Authorization boundary: unprivileged Guest role cannot mutate issues. |
| `TC_ISSUE_E2E_001` | Suite flow (6 requests) | 201 → 200 → 200 → 200 → 204 → 404. | Full defect lifecycle: create issue -> read details -> close issue -> verify in closed filter -> delete with Owner -> verify absence (404). |
| `Cleanup` | DELETE /projects/:id/issues/:labels_iid | Status 204, 200 or 404. | Safe cleanup request ensuring test project cleanliness. |

---

<a id="activity-3"></a>

## Activity #3: Preconditions, postconditions and variables

### 3.1 Implementation feasibility in Postman

All 15 test cases designed in Lab 1 proved 100% feasible in Postman. No architectural blockers were encountered because the GitLab REST API v4 behaves deterministically, using standard query parameters (`state=closed`, `per_page=1`), conventional HTTP response codes (201, 200, 204, 400, 401, 403, 404), and uniform header-based authentication.

### 3.2 Preconditions and postconditions matrix

| Operation | Execution preconditions | Verified postconditions |
| --- | --- | --- |
| **Creation (POST)** | Accessible GitLab project; token with Reporter role or higher; JSON payload with mandatory `title`. | Issue stored in database; incremental `iid` assigned; state `opened`; `issue_iid` saved in collection variables. |
| **Retrieval (GET)** | Valid `issue_iid` existing in the target project. | Idempotent read without side effects; author, timestamps, and attribute consistency confirmed. |
| **Modification (PUT)** | Existing `issue_iid`; Reporter role permissions; payload with description or `state_event: "close"`. | Issue updated; if closed, `closed_at` timestamp is set and state transitions to `closed`. |
| **Filtering & Pagination** | At least one closed issue present in the repository to validate matches. | Filtered list returned; array length constrained by `per_page=1`. |
| **Deletion (DELETE)** | Existing `issue_iid`; **access token with Project Owner or Administrator role**. | Issue permanently deleted; subsequent reads on that `iid` return `404 Not Found`. |

### 3.3 Variable scopes hierarchy in Postman

Postman resolves variables following a strict scope hierarchy (from narrowest to widest):

```
[Local / Script] → [Data / Iteration] → [Environment] → [Collection] → [Global]
  (Highest priority)                                                  (Lowest priority)
```

1. **Global:** Available across the entire workspace. Avoided to prevent collision with other group collections.
2. **Environment:** Used for deployment targets and environment configurations (`base_url`, `project_id`, `token_reporter`, `token_owner`). Allows switching environments without modifying requests.
3. **Collection:** Used to store dynamically generated test identifiers (`run_id`, `issue_iid`, `issue_id`, `e2e_issue_iid`). These persist across requests within the run without polluting global state.
4. **Data:** Injected via external CSV/JSON files in batch runs.
5. **Local:** Scoped with `let` or `const` inside individual pre-request or test scripts.

### 3.4 Dynamic request chaining and shared variables

To decouple test cases and enable autonomous execution without hardcoded IDs:

1. **Collection pre-request script:**
   ```javascript
   let runId = pm.collectionVariables.get("run_id");
   if (!runId) {
       runId = String(Date.now());
       pm.collectionVariables.set("run_id", runId);
   }
   pm.collectionVariables.set("issue_title", `sqe3-issue-${runId}`);
   pm.collectionVariables.set("e2e_issue_title", `sqe3-e2e-issue-${runId}`);
   ```
2. **Dynamic extraction on creation (`TC_ISSUE_POST_001`):**
   ```javascript
   const jsonData = pm.response.json();
   pm.collectionVariables.set("issue_iid", String(jsonData.iid));
   pm.collectionVariables.set("issue_id", String(jsonData.id));
   ```
3. **Consumption in subsequent requests:**
   Subsequent GET, PUT, and DELETE requests dynamically reference `{{issue_iid}}` in their request paths:
   `{{base_url}}/projects/{{project_id}}/issues/{{issue_iid}}`

---

<a id="activity-4"></a>

## Activity #4: Structure and automated execution

### 4.1 Collection structure and conventions

- **Naming standard:** Stable case ID followed by method and action: `TC_ISSUE_[METHOD]_[NUM] - [Description]` (e.g., `TC_ISSUE_POST_001 - Create an issue with valid data`).
- **Explicit headers:** All mutation requests explicitly set `Content-Type: application/json`.
- **E2E isolation:** The end-to-end lifecycle flow is grouped into a dedicated folder (`TC_ISSUE_E2E_001 - Complete issue lifecycle`) using its own variables (`e2e_issue_iid`) to avoid interfering with atomic tests.
- **Cleanup step:** A dedicated `Cleanup` request ensures leftover test resources are removed from the test project.

### 4.2 Automated execution with Postman Runner and Newman CLI

The collection is designed for automated execution both in Postman's GUI and via CLI:

#### Postman Collection Runner
1. Select the collection `SQE3 Lab 2 - Group 4 - Yeraldin Vasquez - Project Issues`.
2. Select the configured local environment.
3. Enable variable persistence during the run.
4. Run: Postman executes all 16 requests sequentially, reporting pass/fail status.

#### CLI execution via Newman
```bash
npx newman run wiki/labs/l2/postman/yeraldin-lab2/yeraldin-project-issues.postman_collection.json \
  -e local_environment.json \
  --reporters cli
```

Dry-run syntax validation check:
```bash
node -e "
const c = require('./wiki/labs/l2/postman/yeraldin-lab2/yeraldin-project-issues.postman_collection.json');
console.log('Collection:', c.info.name, '- Items:', c.item.length);
"
```

---

<a id="activity-5"></a>

## Activity #5: Review and feedback

### 5.1 Peer review of Alexis Frene's Project Labels implementation

I evaluated Alexis Frene's implementation for the Project Labels feature (`wiki/labs/l2/postman/alexis-lab2/`):

| Evaluation criteria | Technical observation | Rating |
| --- | --- | --- |
| **Complexity and coverage** | 17 requests covering creation, encoded title retrieval, archived label filters, renaming, and priority boundaries. Good balance between positive, negative, and boundary scenarios. | **High coverage** |
| **Variable management** | Generates dynamic `run_id` and performs URL encoding (`encodeURIComponent`) on label names in pre-request scripts, preventing path routing issues with spaces or special characters. | **Excellent** |
| **Assertions** | Validates status codes (200, 201, 400, 401, 404) and core attributes (`name`, `color`). | **Good** |
| **Ease of use** | Clean environment template without exposed credentials; clear README instructions. | **Very good** |

### 5.2 Constructive feedback for the team

1. **Header assertions:** Recommend adding explicit `pm.response.headers.get("Content-Type")` and pagination header assertions (`x-per-page`) to further solidify REST contract verification across all collections.
2. **Latency thresholds:** Include response time checks (`pm.expect(pm.response.responseTime).to.be.below(...)`) on GET requests to confirm API performance stays within acceptable limits.
3. **Payload formatting distinction:** Note that while Project Labels uses form-urlencoded parameters due to GitLab API quirks on that route, Project Issues uses `application/json` payloads.

---

<a id="deliverables"></a>

## Postman deliverables

- [Postman collection](postman/yeraldin-lab2/yeraldin-project-issues.postman_collection.json)
- [Credential-free environment example](postman/yeraldin-lab2/yeraldin-project-issues.postman_environment.example.json)
- [Setup and execution instructions](postman/yeraldin-lab2/README.md)

---

<a id="sources"></a>

## Sources

- [GitLab REST API Issues](https://docs.gitlab.com/api/issues/).
- [GitLab REST API Authentication](https://docs.gitlab.com/api/rest/authentication/).
- [Postman Sandbox API Reference](https://learning.postman.com/docs/tests-and-scripts/write-scripts/postman-sandbox-reference/overview/).
- [Lab 1 — Yeraldin](../l1/l1_yeraldin.md).
