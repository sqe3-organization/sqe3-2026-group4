# Lab 2 — Matthew: GitLab Wiki implementation

[Back to the group lab](l2.md)

## Contents

- [Activity 1: Tool setup, sample requests and authorization](#activity-1)
- [Activity 2: Assertions and Lab 1 implementation](#activity-2)
- [Activity 3: Preconditions, postconditions and variables](#activity-3)
- [Activity 4: Structure and automated execution](#activity-4)
- [Activity 5: Review and feedback](#activity-5)
- [Sources](#sources)

---

<a id="activity-1"></a>

## Activity #1: Tool setup, sample requests and authorization

### 1.1 Individual sample API

For my individual practice I chose [RESTful API](https://restful-api.dev/), using its public object endpoints. Each case creates its own test data and removes it after checking the result.

### 1.2 CRUD collection

**Collection:** [Public Objects CRUD](assets/matthew/Public_Objects_CRUD.postman_collection.json).

Import the collection into Postman. It includes `demo_base_url = https://api.restful-api.dev` as a collection variable and runs without an environment or credentials. Inspect **Headers**, **Body**, **Authorization** and **Scripts** on each request.

| Case | Main operation | Preparation | Verification and cleanup |
| --- | --- | --- | --- |
| TC_DEMO_POST_001 | Create an object. | Generate a unique name and payload. | Check the returned fields, retrieve the object and delete it. |
| TC_DEMO_GET_001 | Retrieve an object. | Create a disposable object. | Check its ID and data, then delete it. |
| TC_DEMO_PUT_001 | Update an object. | Create a disposable object. | Check the update in the response and a subsequent GET, then delete it. |
| TC_DEMO_DELETE_001 | Delete an object. | Create a disposable object. | Check the deletion message and confirm GET returns `404`. |

The collection expects `200` for POST, GET, PUT and DELETE, and `404` when retrieving a deleted object. Setup runs in pre-request scripts; assertions and cleanup run in post-response scripts.

### 1.3 Assigned application authorization

**Assigned feature:** Project Wiki. **Collection:** [GitLab Wiki LLTC](assets/matthew/GitLab_Wiki_LLTC.postman_collection.json).

Import the [shared GitLab Project environment](assets/GitLab_Project.postman_environment.json) and select it for GitLab requests. The selected project ID is `88312763`. Supply `token_editor` locally and run **00 — Authorization / AUTH — Verify editor identity**, which sends `GET /user`.

GitLab requests inherit the collection's `PRIVATE-TOKEN` authorization. Invalid-token cases override the header, and the reader scenario uses `token_reader` for its restricted requests. Use `api` for the editor and only `read_api` for the reader. These may be separate legacy tokens from the same account. Follow the [shared token setup](l2.md#token-setup).

---

<a id="activity-2"></a>

## Activity #2: Assertions and Lab 1 implementation

### 2.1 Implemented test cases

<a id="implementation"></a>

The collection keeps the 19 [Wiki LLTC IDs from Lab 1](../l1/l1_matthew.md#casos-lltc). L2 adapts `TC_WIKI_PUT_002` to the observed empty-update no-op and `TC_WIKI_E2E_002` to read-only token scopes. These variants do not validate the original rejection and project-role criteria; the differences are explained below. The authorization probe is excluded from the 19-case count.

| L1 case ID | Main method | L1 criterion / L2 adaptation | Type | Priority | Conditions |
| --- | --- | --- | --- | --- | --- |
| TC_WIKI_POST_001 | POST | CA-WIKI-01 | Positive functional | P1 | [Pre/post](assets/matthew/pre_post_conditions_matthew.md#tc_wiki_post_001) |
| TC_WIKI_POST_002 | POST | CA-WIKI-02 | Negative functional | P1 | [Pre/post](assets/matthew/pre_post_conditions_matthew.md#tc_wiki_post_002) |
| TC_WIKI_POST_003 | POST | CA-WIKI-02 | Negative functional | P1 | [Pre/post](assets/matthew/pre_post_conditions_matthew.md#tc_wiki_post_003) |
| TC_WIKI_POST_004 | POST | CA-WIKI-03 | Negative authentication | P1 | [Pre/post](assets/matthew/pre_post_conditions_matthew.md#tc_wiki_post_004) |
| TC_WIKI_POST_005 | POST | CA-WIKI-04 | Positive functional | P2 | [Pre/post](assets/matthew/pre_post_conditions_matthew.md#tc_wiki_post_005) |
| TC_WIKI_PUT_001 | PUT | CA-WIKI-05 | Positive functional | P1 | [Pre/post](assets/matthew/pre_post_conditions_matthew.md#tc_wiki_put_001) |
| TC_WIKI_PUT_002 | PUT | CA-WIKI-06 — changed expectation | Positive functional / no-op | P2 | [Pre/post](assets/matthew/pre_post_conditions_matthew.md#tc_wiki_put_002) |
| TC_WIKI_PUT_003 | PUT | CA-WIKI-07 | Negative functional | P2 | [Pre/post](assets/matthew/pre_post_conditions_matthew.md#tc_wiki_put_003) |
| TC_WIKI_PUT_004 | PUT | CA-WIKI-03 | Negative authentication | P1 | [Pre/post](assets/matthew/pre_post_conditions_matthew.md#tc_wiki_put_004) |
| TC_WIKI_GET_001 | GET | CA-WIKI-09 | Positive functional | P1 | [Pre/post](assets/matthew/pre_post_conditions_matthew.md#tc_wiki_get_001) |
| TC_WIKI_GET_002 | GET | CA-WIKI-09 | Positive functional | P2 | [Pre/post](assets/matthew/pre_post_conditions_matthew.md#tc_wiki_get_002) |
| TC_WIKI_GET_003 | GET | CA-WIKI-10 | Negative functional | P2 | [Pre/post](assets/matthew/pre_post_conditions_matthew.md#tc_wiki_get_003) |
| TC_WIKI_GET_004 | POST | CA-WIKI-11 | Positive functional / encoding | P2 | [Pre/post](assets/matthew/pre_post_conditions_matthew.md#tc_wiki_get_004) |
| TC_WIKI_GET_005 | GET | CA-WIKI-12 | Boundary: zero items | P2 | [Pre/post](assets/matthew/pre_post_conditions_matthew.md#tc_wiki_get_005) |
| TC_WIKI_DELETE_001 | DELETE | CA-WIKI-13 | Positive functional | P1 | [Pre/post](assets/matthew/pre_post_conditions_matthew.md#tc_wiki_delete_001) |
| TC_WIKI_DELETE_002 | DELETE | CA-WIKI-14 | Negative functional | P2 | [Pre/post](assets/matthew/pre_post_conditions_matthew.md#tc_wiki_delete_002) |
| TC_WIKI_DELETE_003 | DELETE | CA-WIKI-03 | Negative authentication | P1 | [Pre/post](assets/matthew/pre_post_conditions_matthew.md#tc_wiki_delete_003) |
| TC_WIKI_E2E_001 | POST | CA-WIKI-15 | Positive E2E | P0 | [Pre/post](assets/matthew/pre_post_conditions_matthew.md#tc_wiki_e2e_001) |
| TC_WIKI_E2E_002 | GET | CA-WIKI-08 — scope-based variant | E2E / negative authorization | P1 | [Pre/post](assets/matthew/pre_post_conditions_matthew.md#tc_wiki_e2e_002) |

### 2.2 Post-response assertions

**Empty update (`TC_WIKI_PUT_002`):** the previous run notes report that `{}` returned `200` without changing the page. The collection checks that behavior for a Markdown page. It differs from CA-WIKI-06 in L1 and from the [API documentation](https://docs.gitlab.com/api/wikis/#update-a-wiki-page), which requires title or content. A passing result here confirms the observed behavior, not the original rejection criterion. The linked [GitLab source](https://gitlab.com/gitlab-org/gitlab/-/blob/master/lib/api/wikis.rb#L141-149) is a reference for investigating the difference; the `master` branch does not identify the version used in the run.

**Read-only token (`TC_WIKI_E2E_002`):** this case checks a token with only `read_api`. L1 used an account without a write-capable project role. These are different access restrictions, so the original role-based variant remains unverified by this collection.

For the generated pages, which have no custom title in front matter, GitLab derives the display title from the last path component and renders hyphens as spaces. Title assertions calculate that expected display value from the submitted title; content, slug and format are still checked independently. For `manual-<run_id>/installation`, the display title is `installation`. See [GitLab page-path behavior](https://docs.gitlab.com/user/project/wiki/#special-characters-in-page-paths).

Post-response scripts use `pm.test` and `pm.expect` to check status, JSON headers, parseable bodies, schema and the fields relevant to each case. Follow-up GET requests check persistence or absence. For `204`, the script checks an empty body instead of attempting JSON parsing.

The E2E lifecycle starts with POST and chains reads, PUT, listing and DELETE in its post-response script. The reader E2E starts with a reader GET and checks rejected writes before confirming that the editor still reads the original page.

---

<a id="activity-3"></a>

## Activity #3: Preconditions, postconditions and variables

### 3.1 Preconditions and postconditions

The [preconditions and postconditions](assets/matthew/pre_post_conditions_matthew.md) describe all 19 cases, including the data required before each action, its expected state afterward and cleanup.

Cases that need an existing page create their own. Post-response cleanup runs in `finally` and deletes only pages registered by that case. Setup failures also trigger a cleanup attempt before the main request is skipped. If the run is interrupted, or creation succeeds without returning a usable slug, locate the page by its unique test title and remove it manually.

The missing-title case compares the full page set and requires no concurrent writers. List checks follow pagination. The empty-wiki case uses a separate project that is already empty; it does not remove existing pages to prepare the case.

### 3.2 Variable scopes and environments

Project configuration comes from the [shared environment](assets/GitLab_Project.postman_environment.json). Temporary Wiki values use `pm.variables` and are reset before each case.

| Variable | Scope and value |
| --- | --- |
| `base_url` | Environment: `https://gitlab.com/api/v4`. |
| `project_id` | Environment: `88312763`. |
| `token_editor` | Environment: locally supplied personal access token with `api` scope; Developer or higher. |
| `token_reader` | Environment: a separate legacy token with **only `read_api`**; the same account is allowed. |
| `empty_project_id` | Environment: `88312433`; confirm that this separate project is accessible to the editor and its Wiki is empty before running. |
| `reader_update_expected_status` | Environment: `403`, the documented insufficient-scope rejection code. |
| `reader_delete_expected_status` | Environment: `403`, the documented insufficient-scope rejection code. |
| `wiki_title`, `wiki_body`, `wiki_slug`, `wiki_slug_url`, `wiki_owned_slugs` | Local (`pm.variables`): generated data, response identifiers and pages created by the case. These values are temporary. |

The empty-update case expects the observed `200` and checks that page data remains unchanged. Reader write checks expect `403` for insufficient scope. Keep real token values local when exporting the environment for Git.

---

<a id="activity-4"></a>

## Activity #4: Structure and automated execution

### 4.1 Collection structure and conventions

The Wiki collection separates **00 — Authorization** from **01 — Wiki LLTCs**. Each LLTC keeps its original ID and has its own pre-request and post-response scripts. Setup and chained requests use `await pm.sendRequest` and validate their responses.

Cases run independently and use unique titles. Required configuration is checked before the main action. Assertions and cleanup follow the [group conventions](l2.md#activity-4).

### 4.2 Execution

<a id="execution"></a>

In Postman, run the public collection with **No environment**. The saved screenshot shows the shared environment selected, but the collection uses its own `demo_base_url` and needs no credentials. For Wiki, select **SQE3 — GitLab Project**, configure the local values, run the authorization probe and then run the LLTC folder serially.

Public CRUD from the repository root:

```bash
postman collection run "wiki/labs/l2/assets/matthew/Public_Objects_CRUD.postman_collection.json" \
  --no-report-events --timeout-request 20000 --timeout-script 60000
```

For GitLab, use a local environment copy containing your credentials, stored outside the repository:

```bash
postman collection run "wiki/labs/l2/assets/matthew/GitLab_Wiki_LLTC.postman_collection.json" \
  -e /absolute/path/to/gitlab-project.local.postman_environment.json \
  --no-report-events --timeout-request 20000 --timeout-script 120000
```

### 4.3 Results and remaining work

| Check | Result |
| --- | --- |
| Public CRUD — [Collection Runner screenshot](assets/matthew/Public_Objects_CRUD_run.png) | 74 assertions passed; 0 failed, skipped or errors. One iteration took 7.456 seconds. |
| GitLab Wiki — [Collection Runner screenshot](assets/matthew/GitLab_Wiki_LLTC_run.png) | 416 assertions passed; 0 failed, skipped or errors. One iteration took 47.481 seconds. |
| Exported collections | Public CRUD contains 4 cases. Wiki contains 19 cases and a separate authorization probe. |
| Wiki traceability | All 19 L1 IDs have preconditions, postconditions and cleanup. The empty-update and reader cases use the adaptations described in Activity 2. |
| Peer review | Static review of Group 3 exports completed; see [Activity 5](#activity-5). No peer collection was executed. |

The screenshots show run summaries, not the complete request logs or the exact collection revision used. They do not establish that the current exports are identical to those runs.

Earlier notes report a Public CRUD CLI run with 16 requests and 74 passing assertions, including cleanup checks returning `404`. They also report GitLab runs with 322/350 and then 383/385 assertions passing before the title, configuration and empty-update corrections. Those detailed reports and earlier screenshots are not included here; the two linked images show the later Runner summaries.

Record future execution results here using the collection export in `assets/matthew/`.

---

<a id="activity-5"></a>

## Activity #5: Review and feedback

### 5.1 Reviewed implementation

**Team / collection:** Group 3 — [Column values — monday.com](assets/g3/column-values.postman_collection.json), with the [monday environment](assets/g3/monday.postman_environment.json). [Fake API — DummyJSON](assets/g3/fake-api-dummyjson.postman_collection.json) and its [environment](assets/g3/fake-api.postman_environment.json) were reviewed separately as Activity 1 practice. Other Group 3 features were not included in the supplied files.

**Review method:** I inspected the payloads, scripts, variables and execution order in the exported files. I did not run the collections.

**Complexity, quantity and test types:** The monday collection defines 20 feature cases (`TC-COLVAL-001`–`020`): 7 positive, 9 negative, 3 boundary and 1 E2E. The E2E has eight request steps. Including authorization, board/column setup and board cleanup, the export contains 33 saved requests. The cases cover invalid authentication, malformed values, nonexistent IDs, leap-day dates, special characters and an item’s lifecycle. Several scripts read the item again to check that changes were saved or that rejected updates left it unchanged. DummyJSON adds 10 practice requests covering CRUD, authentication and a follow-up check for non-persistence.

**Ease of use:** The case IDs and folders make the collection easy to follow. Case descriptions include priority, preconditions and cleanup, while environment variables hold connection settings. Running individual cases still requires prior board setup, and the E2E steps share `ITEM_ID`. The collection description asks for a 4000 ms delay between requests; a short run guide would make these dependencies clearer.

### 5.2 Feedback

| Case or area reviewed | Observation | Suggested improvement |
| --- | --- | --- |
| Coverage and persistence | Positive, negative and boundary folders are easy to follow. `TC-COLVAL-012` checks that a rejected mixed-column update leaves the original values intact; the E2E also reads updated and cleared values. | Keep these follow-up reads and the distinction between request success and the stored result. |
| Setup and item IDs (`TC-COLVAL-001`, for example) | Item setup catches exceptions with `console.error` and stores `ITEM_ID` in collection variables. A failed setup can leave an ID from a previous case available. | Clear `ITEM_ID` before setup. Check the HTTP response, GraphQL errors and returned item ID; if setup fails, record a failed test and skip the main request. |
| Cleanup | Per-case `delete_item` helpers parse JSON but do not assert deletion success. Their catch blocks only log errors. The final board cleanup has assertions, but depends on reaching that request. | Report cleanup failures as failed tests and verify the GraphQL deletion result. Attempt cleanup in `finally` and document how to remove the test board if the run stops early. |
| Shared response checks | The collection checks that `Content-Type` exists. Its timing check is skipped when the configured limit is exceeded. | Check the expected JSON media type. State whether response time is informational or a requirement; if it is a requirement, make an exceeded limit fail an assertion. |
| E2E and execution order | The eight E2E steps show creation, update, reads, clearing, deletion and a rejected update after deletion. Board setup and shared IDs introduce ordering dependencies. | Add a short import/run guide listing the environment, required variables, setup order and 4000 ms delay. Explain how to run one case safely. |
| GraphQL error assertions | Negative cases inspect `errors`, sometimes `extensions.code`, and missing mutation data rather than relying only on HTTP status. Some checks also depend on message fragments. | Keep the structured error checks and prefer stable error codes when available; use message fragments only where they are needed to distinguish the scenario. |
| A1 practice scope | DummyJSON covers CRUD and authentication, and explicitly expects a follow-up GET after creation to return `404`. This is presented as practice behavior, separate from monday coverage. | Label DummyJSON as Activity 1 practice and list the monday.com features included in the handoff. |

---

<a id="sources"></a>

## Sources

- [RESTful API](https://restful-api.dev/).
- [GitLab Project Wikis API](https://docs.gitlab.com/api/wikis/).
- [Postman Sandbox API reference](https://learning.postman.com/docs/tests-and-scripts/write-scripts/postman-sandbox-reference/overview/).
- [Lab 1 — Matthew](../l1/l1_matthew.md#casos-lltc).
