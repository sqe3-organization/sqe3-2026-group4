# Lab 1 — Alexis Frene: Project labels

[← Back to the group lab](l1.md)

**Feature:** [Project labels](https://docs.gitlab.com/api/labels/).

Project labels categorize issues, merge requests and other project work items. This feature is independent from the repositories, wikis and issues assigned to the other team members, while still allowing the team to verify a complete CRUD lifecycle through the GitLab REST API v4.

## Contents

- [Activity 2: Research and exploratory testing](#actividad-2)
- [Activity 3: Use case](#actividad-3)
- [Activity 4: Criteria and LLTC cases](#actividad-4)
- [Activity 5: Test classification](#actividad-5)
- [Feature sources](#fuentes)

<a id="actividad-2"></a>

## Activity #2: Research and exploratory testing

### 2.1 Feature description

The Project labels API manages labels that belong to a GitLab project. The selected operations are:

| Step | Method | Endpoint relative to `/api/v4` | Purpose |
| --- | --- | --- | --- |
| 1 | POST | `/projects/:id/labels` | Create a project label with a name and color. |
| 2 | GET | `/projects/:id/labels` | List labels, optionally using search, pagination and archived filters. |
| 3 | GET | `/projects/:id/labels/:label_id` | Retrieve one label by its numeric ID or title. |
| 4 | PUT | `/projects/:id/labels/:label_id` | Rename or update the color, description, priority or archived state. |
| 5 | DELETE | `/projects/:id/labels/:label_id` | Delete one project label. |

The create operation requires `name` and `color`. The color can be a six-digit hexadecimal value with a leading `#` or a CSS color name. Optional fields are `description`, `priority` and `archived`. An update requires at least `new_name` or `color`; the other fields can be sent together with them. The list operation supports `search`, `with_counts`, `include_ancestor_groups` and `archived`. Results are paginated by the REST API.

Unlike the JSON bodies used by the Issues and Wikis documents, the examples in the labels documentation send the create and update fields as form parameters. The API client must therefore use `application/x-www-form-urlencoded` or its equivalent, and must URL-encode a label title when it is placed in `:label_id`.

### 2.2 Feature setup

[Group authentication and setup](l1.md#autenticacion).

For these cases I use a private test project with Labels enabled and the following additional variables:

| Variable | Use in Project labels tests |
| --- | --- |
| `token_label_manager` | Personal, project or group access token with the permissions required to read and modify project labels. |
| `token_label_reader` | Token with read access, used for read-only checks and authorization exploration. |
| `label_name` | Unique label name, for example `sqe3-label-{{run_id}}`. |
| `label_name_url` | URL-encoded value of `label_name`, used in a path parameter. |
| `label_id` | Numeric ID returned by the create response. |
| `label_name_updated` | New unique name used by rename cases. |
| `label_name_updated_url` | URL-encoded value of `label_name_updated`, used after a rename. |
| `archived_label_id` | Numeric ID returned by the archived-label boundary case. |

The test project must be disposable or dedicated to the team. No token, cookie or real project identifier is stored in this repository. Label tests use `PRIVATE-TOKEN: {{token_label_manager}}`; read requests may use `{{token_label_reader}}`. For create and update requests, send form data and do not assume that a JSON content type is accepted.

### 2.3 Exploratory testing

The exploration uses the GitLab web UI and the browser Network panel filtered to `Fetch/XHR`, followed by direct REST requests in an API client. The goal is to confirm the request shape, the returned attributes and the effect of each mutation before automating the LLTC cases.

| Exploration | Request or interaction | Expected observation to record |
| --- | --- | --- |
| List labels | Open **Manage > Labels** for the test project and inspect the request for the label collection. | The project identifier, pagination parameters and the returned label attributes are identified. |
| Search and pagination | Search for `sqe3-label-{{run_id}}` and repeat with `per_page=1`. | The search result contains only matching labels and the response contains no more than one item. |
| Create | Create a disposable label in the UI, then inspect the request and replay it with `POST /projects/:id/labels`. | `name` and `color` are sent as form fields; the response contains `id`, `name`, `color`, `description`, `priority` and `archived`. |
| Update | Change the color, description and name of the disposable label. | The request uses `PUT /projects/:id/labels/:label_id`; the returned resource reflects the changed values. |
| Delete | Delete the disposable label and retrieve it again. | The delete request has no resource body; a later retrieval reports that the label is unavailable. |

#### REST requests captured for the test design

```text
GET  {{base_url}}/projects/{{project_id}}/labels?search=sqe3-label-{{run_id}}&per_page=1
POST {{base_url}}/projects/{{project_id}}/labels
     name=sqe3-label-{{run_id}}&color=%23FFAA00&description=API%20test&priority=0
PUT  {{base_url}}/projects/{{project_id}}/labels/{{label_name_url}}
     new_name=sqe3-label-updated-{{run_id}}&color=%2300AAFF&description=Updated
DELETE {{base_url}}/projects/{{project_id}}/labels/{{label_name_updated_url}}
```

The browser capture is evidence of the interaction, while the REST cases below validate the documented API contract. Screenshots should show only the request method, endpoint, status and sanitized payload; credentials must be hidden before submission.

The importable Postman implementation is available in [the individual collection](postman/alexis-project-labels.postman_collection.json), with a [credential-free environment template](postman/alexis-project-labels.postman_environment.example.json) and setup instructions in [the Postman README](postman/README.md).

<a id="actividad-3"></a>

## Activity #3: Use case

### 3.1 Use case description

**User story:** As a project administrator or QA engineer, I want to create and maintain project labels through the REST API so that work items can be classified consistently and the label catalog remains accurate.

**Use case:** Maintain a project label throughout its lifecycle.

**Actor:** Authenticated project member with the permissions required for the selected label operation.

**Preconditions:** A test project is accessible, Labels are enabled, the API token is valid, and `run_id` makes the test label unique. The project does not have another label with the same test name.

| Step | Interaction | Proposed check |
| --- | --- | --- |
| 1 | Create a label with a unique name, valid color and description. | Save `label_id` and confirm the returned attributes. |
| 2 | Retrieve the label by its URL-encoded title. | Confirm the same name, color and description are persisted. |
| 3 | Update its color, description and priority. | Confirm the response and a second GET contain the updated values. |
| 4 | Search the label collection with the updated name. | Confirm the label is returned by the filter. |
| 5 | Delete the label. | Confirm the delete response and that a later GET cannot retrieve it. |

**Expected result:** A valid label can be created, read, modified, found through the collection filter and deleted without affecting unrelated labels.

**Alternative flows:** Missing required fields, invalid color or priority, invalid authentication, a nonexistent label title, an empty update, a read-only token attempting a mutation, archived-label filtering and a collection page limited to one result. The cases are detailed in activity 4.

<a id="actividad-4"></a>

## Activity #4: Acceptance criteria and test cases

### 4.1 Acceptance criteria

The criteria below are based on the [Project labels API](https://docs.gitlab.com/api/labels/) and the [REST API troubleshooting guide](https://docs.gitlab.com/api/rest/troubleshooting/). A status code is specified only when the documentation or the shared REST conventions support it.

#### Operation: Create a label — `POST /projects/:id/labels`

- **CA-LABEL-01 · Positive:** With valid credentials, a unique `name` and a valid required `color`, the API returns `201` and the response contains the created label.
- **CA-LABEL-02 · Negative:** Omitting the required `name` prevents label creation and returns a validation response; the exact response body is recorded during exploration.
- **CA-LABEL-03 · Negative:** Omitting the required `color` prevents label creation and returns a validation response; no label with the submitted name is created.
- **CA-LABEL-04 · Boundary:** A label with `priority=0` is accepted, and `archived=true` is persisted as an archived label.
- **CA-LABEL-05 · Authentication:** An invalid token is rejected with `401` and does not create the label.

#### Operation: Retrieve and list labels — `GET /projects/:id/labels[/:label_id]`

- **CA-LABEL-06 · Positive:** Retrieving an existing label by numeric ID or URL-encoded title returns `200` and the persisted attributes.
- **CA-LABEL-07 · Negative:** Retrieving a nonexistent label returns `404` and does not return a resource.
- **CA-LABEL-08 · Positive:** Listing with `search=<term>` returns matching labels and listing with `per_page=1` returns at most one item per page.
- **CA-LABEL-09 · Boundary:** Listing with `archived=true` returns archived labels and excludes labels that are not archived from that result set.

#### Operation: Update a label — `PUT /projects/:id/labels/:label_id`

- **CA-LABEL-10 · Positive:** Updating the color and description changes those attributes while retaining the label identity and updated name when applicable.
- **CA-LABEL-11 · Positive:** Updating with `new_name` changes the label name; the old title no longer retrieves the renamed label and the new title does.
- **CA-LABEL-12 · Negative:** Sending an update without `new_name` or `color` is rejected because at least one editable field is required; the exact status is confirmed during exploration and the existing label remains unchanged.
- **CA-LABEL-13 · Negative boundary:** A negative `priority` is rejected because the documented priority must be greater than or equal to zero; the existing priority remains unchanged.
- **CA-LABEL-14 · Authentication:** A token without mutation permission cannot change the label; the rejection status is recorded for the configured project and the label remains unchanged.

#### Operation: Delete a label — `DELETE /projects/:id/labels/:label_id`

- **CA-LABEL-15 · Positive:** Deleting an existing label with the required permission returns `204 No Content`; a subsequent GET returns `404`.
- **CA-LABEL-16 · Negative:** Deleting a nonexistent label returns `404` and leaves a control label unchanged.

#### E2E criterion

- **CA-LABEL-17 · E2E:** Creating, retrieving, updating, filtering and deleting one label demonstrates the complete lifecycle with one project and one `run_id`. Cleanup executes even if an intermediate assertion fails.

### 4.2 Prompt and procedure

**Prompt to generate the initial scenario list:**

> I am preparing API tests for the GitLab Project labels REST API v4. Use the official documentation at https://docs.gitlab.com/api/labels/ as the source of truth. Propose an initial list of scenarios for creating, listing, retrieving, updating and deleting project labels. Group the scenarios into positive, negative, authentication/authorization, boundary and E2E tests. Consider the required name and color fields, optional description, priority and archived fields, URL-encoded label names, search, pagination, nonexistent resources, invalid color or priority, an empty update and cleanup. For every scenario provide a concise title and what it verifies. Do not invent limits, roles, error messages or status codes; mark anything that requires confirmation during exploration. Avoid duplicates because I will filter and validate the list before writing LLTC cases.

**Procedure:**

1. Read the official labels API documentation and record the endpoint, parameter and response contract for each operation.
2. Run the prompt in a GenAI model to obtain a broad scenario list.
3. Remove duplicate scenarios and cases outside project-label CRUD, filtering and lifecycle behavior.
4. Correct the generated list against the documentation: `name` and `color` are required for creation, updates require `new_name` or `color`, priority cannot be negative, and label titles in paths must be URL-encoded.
5. Keep uncertain validation and permission codes as observations to confirm during exploration instead of treating a guess as an assertion.
6. Convert the validated scenarios into LLTC cases with independent data, cleanup, type and priority, then review the cases against the team's conventions in the group document.

The Postman collection implements the requests and assertions for these cases. It uses form-encoded bodies for create and update operations, stores IDs from responses, checks status and response data, and keeps cleanup separate. Execution evidence still has to be captured with the team's test project and credentials.

### 4.3 Low-level test cases (LLTC)

The 17 cases below are designed and not yet executed against the team's test project. The following setup, data and cleanup apply unless a case states an exception.

**Common setup:** Configure the variables in section 2.2 and the group authentication. Use `PRIVATE-TOKEN: {{token_label_manager}}` for normal label operations, `PRIVATE-TOKEN: {{token_label_reader}}` for read-only checks, and `Content-Type: application/x-www-form-urlencoded` for POST and PUT requests. The base path is `{{base_url}}`.

**Test data:** `label_name = sqe3-label-{{run_id}}`, `label_name_updated = sqe3-label-updated-{{run_id}}`, `color = #FFAA00`, `updated_color = #00AAFF`, `description = API label test`, `updated_description = Updated API label test`, and `priority = 0`. URL-encode names before using them in a path. Save the returned `id` as `label_id` and the encoded names as `label_name_url` and `label_name_updated_url`.

**Common cleanup:** Delete every label created by a case with `token_label_manager`, even if an assertion fails. If the case renamed a label, delete it using the final name or saved numeric ID. Never delete pre-existing labels. Restore any modified control label to its original values.

#### TC_LABEL_POST_001 — Create a project label with valid data

**Criterion:** CA-LABEL-01<br>
**Type:** Positive functional<br>
**Priority:** P1

**Preconditions:** The project is accessible and `label_name` does not exist.

| Step | Request or action | Expected result |
| --- | --- | --- |
| 1 | POST `/projects/{{project_id}}/labels` with form data `name={{label_name}}`, `color={{color}}`, `description={{description}}`, `priority=0`. | HTTP `201`; save `label_id`; response name, color, description and priority match the submitted values. |
| 2 | GET `/projects/{{project_id}}/labels/{{label_name_url}}`. | HTTP `200`; the same label is returned and `archived` has its documented default unless explicitly sent. |

#### TC_LABEL_POST_002 — Reject creation without a name

**Criterion:** CA-LABEL-02<br>
**Type:** Negative functional<br>
**Priority:** P1

**Preconditions:** The project is accessible and the proposed name is unique.

| Step | Request or action | Expected result |
| --- | --- | --- |
| 1 | POST `/projects/{{project_id}}/labels` with only `color={{color}}`. | Validation response; record the actual status and error body. |
| 2 | GET `/projects/{{project_id}}/labels?search={{label_name}}`. | HTTP `200`; no label with the proposed name exists. |

#### TC_LABEL_POST_003 — Reject creation without a color

**Criterion:** CA-LABEL-03<br>
**Type:** Negative functional<br>
**Priority:** P1

**Preconditions:** The project is accessible and `label_name` is unique.

| Step | Request or action | Expected result |
| --- | --- | --- |
| 1 | POST `/projects/{{project_id}}/labels` with only `name={{label_name}}`. | Validation response; record the actual status and error body. |
| 2 | GET `/projects/{{project_id}}/labels?search={{label_name}}`. | HTTP `200`; no label with the proposed name exists. |

#### TC_LABEL_POST_004 — Reject creation with an invalid token

**Criterion:** CA-LABEL-05<br>
**Type:** Negative authentication<br>
**Priority:** P1

**Preconditions:** `label_name` is unique.

| Step | Request or action | Expected result |
| --- | --- | --- |
| 1 | POST `/projects/{{project_id}}/labels` using `PRIVATE-TOKEN: token-invalido-sqe3` and valid form data. | HTTP `401`; no label is created. |
| 2 | Restore the manager token and GET `/projects/{{project_id}}/labels?search={{label_name}}`. | HTTP `200`; the proposed label is absent. |

#### TC_LABEL_POST_005 — Accept the zero-priority archived boundary

**Criterion:** CA-LABEL-04<br>
**Type:** Boundary / positive functional<br>
**Priority:** P2

**Preconditions:** `label_name` is unique.

| Step | Request or action | Expected result |
| --- | --- | --- |
| 1 | POST `/projects/{{project_id}}/labels` with `name={{label_name}}`, `color={{color}}`, `priority=0`, `archived=true`. | HTTP `201`; response has `priority=0` and `archived=true`. |
| 2 | GET `/projects/{{project_id}}/labels/{{label_name_url}}`. | HTTP `200`; the zero priority and archived state persist. |

#### TC_LABEL_GET_001 — List matching labels with a one-item page

**Criterion:** CA-LABEL-08<br>
**Type:** Positive functional / boundary<br>
**Priority:** P2

**Preconditions:** Create a label whose name contains `sqe3-label-{{run_id}}`; save `label_id`.

| Step | Request or action | Expected result |
| --- | --- | --- |
| 1 | GET `/projects/{{project_id}}/labels?search=sqe3-label-{{run_id}}&per_page=1`. | HTTP `200`; response is an array containing at most one item. |
| 2 | Check the returned page and pagination headers. | The matching label appears on one of the pages; do not conclude that it is absent from the collection until all pages are checked. |

#### TC_LABEL_GET_002 — Retrieve a label by its encoded title

**Criterion:** CA-LABEL-06<br>
**Type:** Positive functional
**Priority:** P1

**Preconditions:** Create `label_name` with the data in section 4.3 and save `label_name_url`.

| Step | Request or action | Expected result |
| --- | --- | --- |
| 1 | GET `/projects/{{project_id}}/labels/{{label_name_url}}`. | HTTP `200`; name, color, description and `id` match the saved resource. |

#### TC_LABEL_GET_003 — Reject retrieval of a nonexistent label

**Criterion:** CA-LABEL-07<br>
**Type:** Negative functional
**Priority:** P2

**Preconditions:** Confirm `ausente-{{run_id}}` is not an existing label.

| Step | Request or action | Expected result |
| --- | --- | --- |
| 1 | GET `/projects/{{project_id}}/labels/ausente-{{run_id}}`. | HTTP `404`; no label resource is returned. |

#### TC_LABEL_GET_004 — Filter only archived labels

**Criterion:** CA-LABEL-09<br>
**Type:** Boundary / filter
**Priority:** P2

**Preconditions:** Create one archived label and one non-archived label with distinct names.

| Step | Request or action | Expected result |
| --- | --- | --- |
| 1 | GET `/projects/{{project_id}}/labels?archived=true&search=sqe3-label-{{run_id}}`. | HTTP `200`; the archived label is present. |
| 2 | Inspect the returned entries. | No returned entry belonging to this test has `archived=false`. |

#### TC_LABEL_PUT_001 — Update a label's color and description

**Criterion:** CA-LABEL-10<br>
**Type:** Positive functional<br>
**Priority:** P1

**Preconditions:** Create `label_name` and save `label_id`.

| Step | Request or action | Expected result |
| --- | --- | --- |
| 1 | PUT `/projects/{{project_id}}/labels/{{label_id}}` with `color={{updated_color}}`, `description={{updated_description}}`. | HTTP `200`; response has the new color and description and retains the same `id` and name. |
| 2 | GET `/projects/{{project_id}}/labels/{{label_id}}`. | HTTP `200`; the updated values persist. |

#### TC_LABEL_PUT_002 — Rename a label and retrieve it by the new title

**Criterion:** CA-LABEL-11<br>
**Type:** Positive functional
**Priority:** P1

**Preconditions:** Create `label_name` and save `label_id`.

| Step | Request or action | Expected result |
| --- | --- | --- |
| 1 | PUT `/projects/{{project_id}}/labels/{{label_id}}` with `new_name={{label_name_updated}}`. | HTTP `200`; response name is `label_name_updated`. |
| 2 | GET `/projects/{{project_id}}/labels/{{label_name_updated_url}}`. | HTTP `200`; the renamed label is returned. |
| 3 | GET `/projects/{{project_id}}/labels/{{label_name_url}}`. | The old title does not retrieve the renamed label; record the actual not-found response. |

#### TC_LABEL_PUT_003 — Reject an empty update

**Criterion:** CA-LABEL-12<br>
**Type:** Negative functional<br>
**Priority:** P2

**Preconditions:** Create `label_name`; save its original response and `label_id`.

| Step | Request or action | Expected result |
| --- | --- | --- |
| 1 | PUT `/projects/{{project_id}}/labels/{{label_id}}` with an empty form body. | Request is rejected because at least `new_name` or `color` is required; record the exact status and body. |
| 2 | GET `/projects/{{project_id}}/labels/{{label_id}}`. | HTTP `200`; name, color, description and priority equal their original values. |

#### TC_LABEL_PUT_004 — Reject a negative priority

**Criterion:** CA-LABEL-13<br>
**Type:** Negative boundary<br>
**Priority:** P2

**Preconditions:** Create `label_name` with `priority=0`; save `label_id`.

| Step | Request or action | Expected result |
| --- | --- | --- |
| 1 | PUT `/projects/{{project_id}}/labels/{{label_id}}` with `color={{updated_color}}` and `priority=-1`. | Validation response; record the exact status and body. |
| 2 | GET `/projects/{{project_id}}/labels/{{label_id}}`. | HTTP `200`; the label's priority remains `0` and the invalid update did not partially change the resource. |

#### TC_LABEL_PUT_005 — Protect a label from a read-only token

**Criterion:** CA-LABEL-14<br>
**Type:** Negative authorization<br>
**Priority:** P1

**Preconditions:** Create `label_name` and verify that `token_label_reader` can retrieve it. Confirm the configured project role does not allow label mutation.

| Step | Request or action | Expected result |
| --- | --- | --- |
| 1 | PUT `/projects/{{project_id}}/labels/{{label_id}}` with the reader token and `color={{updated_color}}`. | Mutation is rejected; record the project-specific status and response. |
| 2 | GET `/projects/{{project_id}}/labels/{{label_id}}` with the manager token. | HTTP `200`; the original color and description are unchanged. |

#### TC_LABEL_DELETE_001 — Delete an existing label

**Criterion:** CA-LABEL-15<br>
**Type:** Positive functional
**Priority:** P1

**Preconditions:** Create `label_name` and save `label_id`.

| Step | Request or action | Expected result |
| --- | --- | --- |
| 1 | DELETE `/projects/{{project_id}}/labels/{{label_id}}`. | HTTP `204`; response body is empty. |
| 2 | GET `/projects/{{project_id}}/labels/{{label_id}}`. | HTTP `404`; the deleted label cannot be retrieved. |

#### TC_LABEL_DELETE_002 — Reject deletion of a nonexistent label

**Criterion:** CA-LABEL-16<br>
**Type:** Negative functional
**Priority:** P2

**Preconditions:** Create a control label and save `control_label_id`; confirm `ausente-{{run_id}}` does not exist.

| Step | Request or action | Expected result |
| --- | --- | --- |
| 1 | DELETE `/projects/{{project_id}}/labels/ausente-{{run_id}}`. | HTTP `404`; no label is deleted. |
| 2 | GET `/projects/{{project_id}}/labels/{{control_label_id}}`. | HTTP `200`; the control label is unchanged. |

#### TC_LABEL_E2E_001 — Verify the complete label lifecycle

**Criterion:** CA-LABEL-17<br>
**Type:** Positive E2E
**Priority:** P0

**Preconditions:** `label_name` and `label_name_updated` are unique and the test project is available.

| Step | Request or action | Expected result |
| --- | --- | --- |
| 1 | POST `/projects/{{project_id}}/labels` with the initial name, color and description. | HTTP `201`; save `label_id`. |
| 2 | GET `/projects/{{project_id}}/labels/{{label_name_url}}`. | HTTP `200`; initial values match. |
| 3 | PUT `/projects/{{project_id}}/labels/{{label_id}}` with `new_name={{label_name_updated}}`, `color={{updated_color}}`, `description={{updated_description}}`, `priority=0`. | HTTP `200`; updated values returned. |
| 4 | GET `/projects/{{project_id}}/labels?search={{label_name_updated}}`. | HTTP `200`; updated label is found. |
| 5 | DELETE `/projects/{{project_id}}/labels/{{label_id}}`. | HTTP `204`; empty body. |
| 6 | GET `/projects/{{project_id}}/labels/{{label_name_updated_url}}`. | HTTP `404`; the label is absent after deletion. |

<a id="actividad-5"></a>

## Activity #5: Test classification

### 5.1 Proposed classification and prioritization

| Type | Purpose | Examples |
| --- | --- | --- |
| Positive functional | Validate a successful operation and persisted effect. | TC_LABEL_POST_001, TC_LABEL_PUT_001, TC_LABEL_DELETE_001 |
| Negative functional | Validate required fields, nonexistent resources and invalid data. | TC_LABEL_POST_002, TC_LABEL_GET_003, TC_LABEL_PUT_003 |
| Negative authentication / authorization | Validate invalid credentials and read-only mutation restrictions. | TC_LABEL_POST_004, TC_LABEL_PUT_005 |
| Boundary | Validate priority zero, negative priority, archived filtering and one-item pagination. | TC_LABEL_POST_005, TC_LABEL_PUT_004, TC_LABEL_GET_004, TC_LABEL_GET_001 |
| E2E | Validate the complete create-read-update-filter-delete flow. | TC_LABEL_E2E_001 |

The priorities follow the group convention:

- **P0 — Critical:** the complete label lifecycle cannot finish.
- **P1 — High:** required fields, authentication, mutation, retrieval or deletion of a label fail.
- **P2 — Medium:** filters, optional attributes, pagination or invalid boundary values fail.

The [conventions, priorities and feedback](l1.md#actividad-5) are collected in the group document.

<a id="fuentes"></a>

## Feature sources

- [Project labels API](https://docs.gitlab.com/api/labels/).
- [Project labels user documentation](https://docs.gitlab.com/user/project/labels/).
- [REST API authentication](https://docs.gitlab.com/api/rest/authentication/).
- [REST API troubleshooting and status codes](https://docs.gitlab.com/api/rest/troubleshooting/).
- [Shared lab sources](l1.md#fuentes).

[← Back to the group lab](l1.md)
