# Lab 1 — Matthew: Project wikis

[← Back to the group lab](l1.md)

I will test how project wiki pages are created, retrieved, edited and deleted.

## Contents

- [Activity 2: Wiki research and exploration](#actividad-2)
- [Activity 3: Use case](#actividad-3)
- [Activity 4: Criteria and LLTC cases](#actividad-4)
- [Activity 5: Test classification](#actividad-5)
- [Feature sources](#fuentes)

---

<a id="actividad-2"></a>

## Activity #2: Research and exploratory testing

### 2.1 Feature description

The wiki stores documentation in a Git repository separate from the project code. Creating, editing and deleting pages requires a Developer, Maintainer or Owner role. Reference: [GitLab wiki](https://docs.gitlab.com/user/project/wiki/).

The tests follow this sequence:

| Step | Method | Endpoint relative to `/api/v4` | Purpose |
| --- | --- | --- | --- |
| 1 | POST | `/projects/:id/wikis` | Create a page. |
| 2 | GET | `/projects/:id/wikis/:slug` | Retrieve it. |
| 3 | PUT | `/projects/:id/wikis/:slug` | Update it. |
| 4 | GET | `/projects/:id/wikis?with_content=true` | Find it in the list with content. |
| 5 | DELETE | `/projects/:id/wikis/:slug` | Delete it. |

The API requires `title` and `content` when creating a page; updates require at least one of them. The default format is `markdown`. I will use the `slug` returned by the API and encode it when including it in the URL. Reference: [Project wikis API](https://docs.gitlab.com/api/wikis/).

### 2.2 Feature setup

I start with the [group authentication](l1.md#autenticacion). For these cases I use a private project with Wiki enabled and the following additional variables:

| Variable | Use in Wiki tests |
| --- | --- |
| `token_editor` | Token with `api` scope belonging to a Developer or higher. Used as `access_token` when creating, retrieving, editing and deleting pages. |
| `token_reader` | Token belonging to a Reporter with read but no write access. Confirm its permissions before the authorization case. |
| `wiki_slug` | Original slug returned by the API, used to compare responses. |
| `wiki_slug_url` | The same slug, encoded once for inclusion in the URL. |

The remaining variables are in the group document.

### 2.3 Exploratory testing

**Exploration and screenshots:** pending. These are the steps I will follow:

| Pending exploration | Proposed action and data | Evidence to record |
| --- | --- | --- |
| Create | Open Wiki and create `sqe3-wiki-<run_id>` with content `Guía inicial`. | Network screenshot showing method, URL, body and response. |
| Retrieve | Open the page and retrieve its `slug` using REST. | Comparison of the visible title and content with the JSON. |
| Edit | Change the content to `Guía actualizada`, keeping the title. | Edit request and subsequent retrieval confirming persistence. |
| List | List pages with and without `with_content=true`. | Presence of the page and difference in the `content` field. |
| Delete | Delete only the page created for exploration. | Deletion response and subsequent retrieval. |

Create request body:

```json
{
  "title": "sqe3-wiki-<run_id>",
  "content": "Guía inicial",
  "format": "markdown"
}
```

Edit request body:

```json
{
  "content": "Guía actualizada"
}
```

In DevTools I will record the request used by the interface and compare it with the REST v4 endpoint; they may use different routes or formats.

---

<a id="actividad-3"></a>

## Activity #3: Use case

### 3.1 Use case description

**User story:** As a project member, I want to create, retrieve, update and delete wiki pages to keep the team instructions up to date.

**Use case:** Maintain a project installation guide.

**Actor:** Authenticated member with write permission on the wiki.

**Preconditions:** Accessible test project, Wiki enabled, valid token and a title unique to the run.

| Step | Interaction | Proposed check |
| --- | --- | --- |
| 1 | Create the guide with initial instructions. | Save the new page’s `slug`. |
| 2 | Retrieve the guide by that `slug`. | Compare title and content with the submitted data. |
| 3 | Update the instructions without changing the title. | Retrieve it again and check the updated content. |
| 4 | List the project pages. | Find the guide by its `slug`. |
| 5 | Delete the test guide. | Check that it can no longer be retrieved or found in the list. |

**Expected result:** The guide retains changes while it exists and becomes unavailable after deletion.

**Alternative flows:** Rejection of invalid credentials, missing required fields, modification without permission and operations on a nonexistent page. The cases are detailed in activity 4.

---

<a id="actividad-4"></a>

## Activity #4: Acceptance criteria and test cases

### 4.1 Acceptance criteria

These are the expected results, based on the [GitLab HTTP status guide](https://docs.gitlab.com/api/rest/troubleshooting/). Codes not specified in the documentation remain to be confirmed during exploration.

#### Operation: Create a page — `POST /projects/:id/wikis`

- **CA-WIKI-01 · Positive:** With suitable credentials and permissions, a unique title and valid content, creating the page returns `201` and allows it to be retrieved with the same data.
- **CA-WIKI-02 · Negative:** Omitting `title` or `content` in separate requests prevents page creation. A `400` is expected for a missing required attribute.
- **CA-WIKI-03 · Negative:** An invalid token prevents creating, editing or deleting pages and returns `401`.
- **CA-WIKI-04 · Positive:** Creating with the format omitted uses Markdown.

#### Operation: Update a page — `PUT /projects/:id/wikis/:slug`

- **CA-WIKI-05 · Positive:** Sending only `content` updates the page with `200`; a subsequent read confirms the change and retains the title.
- **CA-WIKI-06 · Negative:** An update without `title` or `content` is rejected and retains the previous content; the specific status code must be confirmed.
- **CA-WIKI-07 · Negative:** Updating a nonexistent `slug` in an accessible project returns `404` and does not create a page.
- **CA-WIKI-08 · Authorization:** A member who can read but not write cannot edit or delete the page. The page must remain unchanged. The rejection code remains to be confirmed during exploration.

#### Operation: Retrieve pages — `GET /projects/:id/wikis[/:slug]`

- **CA-WIKI-09 · Positive:** Retrieving an existing page returns `200` and its data; listing with `with_content=true` allows its content to be checked.
- **CA-WIKI-10 · Negative:** Retrieving a nonexistent `slug` in an accessible project returns `404`.
- **CA-WIKI-11 · Encoding:** A page created at a nested path can be retrieved by encoding the entire `slug`, including `/` as `%2F`.
- **CA-WIKI-12 · Boundary:** In a project prepared without pages, listing returns `200` and an empty list.

#### Operation: Delete a page — `DELETE /projects/:id/wikis/:slug`

- **CA-WIKI-13 · Positive:** Deleting an existing page returns `204` without a body; a subsequent retrieval returns `404` and the page does not appear in the list.
- **CA-WIKI-14 · Negative:** Deleting a nonexistent `slug` returns `404` without affecting other pages.

#### E2E criterion

- **CA-WIKI-15 · E2E:** Creating, retrieving, updating, listing, deleting and retrieving again demonstrates the complete lifecycle with the same data and project. The test cleans up its resources even if an intermediate check fails.

### 4.2 Prompt and procedure

**Prompt to generate the initial scenario list:**

> I am preparing tests for GitLab project wikis. Using the official documentation for this feature (https://docs.gitlab.com/api/wikis/), propose an initial list of test scenarios for creating, retrieving, updating and deleting pages. Group them into positive, negative, boundary and E2E scenarios. For each scenario, write a clear title and a brief description of what it checks. Consider required fields, permissions, nonexistent resources and documented limits. Avoid duplicate scenarios and do not invent restrictions or behavior; indicate anything that needs confirmation through exploration. The list will be a starting point for me to filter, correct and validate the applicable scenarios.

**Procedure:**

1. Use the prompt to obtain an initial list of scenarios.
2. Filter out duplicate scenarios or those unrelated to the selected operations.
3. Review the scenarios against the documentation and note questions for exploration.
4. Develop the selected cases with their data, steps and expected results.

<a id="casos-lltc"></a>

### 4.3 Low-level test cases (LLTC)

The 19 cases have been designed but not yet executed. The following setup, data and cleanup apply to all cases except where individual conditions are stated. Priorities remain pending team review.

**Common setup:** configure the variables in 2.2 and group authentication. Use `PRIVATE-TOKEN: {{token_editor}}` and, for requests with a body, `Content-Type: application/json`, unless the case specifies another token. Paths start at `{{base_url}}`.

**Test data:** `title = sqe3-wiki-{{run_id}}`, `content = Guía inicial` and `format = markdown`. Use a new `run_id` for each execution of each case and check that the title is available. When an existing page is needed, create it with `POST /projects/{{project_id}}/wikis`, check for `201` and save the `slug` as `wiki_slug`. Whenever a page is created, also save its encoded version as `wiki_slug_url`; keep `wiki_slug` unchanged for comparison with the JSON. For a nonexistent `slug`, use `ausente-{{run_id}}` and first check that retrieving it returns `404`.

**Common cleanup:** after each case, delete its pages with the editor token, even if a check fails. If the case already deleted them, check that they are absent. In negative cases, delete any page created by mistake if it can be attributed to the case.

**List queries:** check every results page before concluding that an entry is missing. Compare slugs using their original, unencoded values.

#### TC_WIKI_POST_001 — Create a guide with valid data

**Criterion:** CA-WIKI-01<br>
**Type:** Positive functional<br>
**Priority:** P1

**Preconditions:** Environment in 2.2 configured and test title available.

| Step | Request or action | Expected result |
| --- | --- | --- |
| 1 | POST `/projects/{{project_id}}/wikis` with `{"title":"sqe3-wiki-{{run_id}}","content":"Guía inicial","format":"markdown"}`. | HTTP `201`; save `slug`; title, content and format match those submitted. |
| 2 | GET `/projects/{{project_id}}/wikis/{{wiki_slug_url}}`. | HTTP `200`; same title, content and format. |

#### TC_WIKI_POST_002 — Reject creation without a title

**Criterion:** CA-WIKI-02<br>
**Type:** Negative functional<br>
**Priority:** P1

**Preconditions:** Environment in 2.2 configured and test title available. Use a project where nobody else modifies the wiki during the case, so the lists can be compared.

| Step | Request or action | Expected result |
| --- | --- | --- |
| 1 | GET `/projects/{{project_id}}/wikis`; save the existing slugs. | HTTP `200`; baseline list saved. |
| 2 | POST `/projects/{{project_id}}/wikis` with `{"content":"Guía inicial","format":"markdown"}`. | HTTP `400`; error response. |
| 3 | GET `/projects/{{project_id}}/wikis` and compare slugs. | HTTP `200`; no page was added. |

#### TC_WIKI_POST_003 — Reject creation without content

**Criterion:** CA-WIKI-02<br>
**Type:** Negative functional<br>
**Priority:** P1

**Preconditions:** Environment in 2.2 configured and test title available.

| Step | Request or action | Expected result |
| --- | --- | --- |
| 1 | POST `/projects/{{project_id}}/wikis` with `{"title":"sqe3-wiki-{{run_id}}","format":"markdown"}`. | HTTP `400`; error response. |
| 2 | GET `/projects/{{project_id}}/wikis`; look for the submitted title. | HTTP `200`; no page with that title appears. |

#### TC_WIKI_POST_004 — Reject creation with an invalid token

**Criterion:** CA-WIKI-03<br>
**Type:** Negative authentication<br>
**Priority:** P1

**Preconditions:** Environment in 2.2 configured and test title available.

| Step | Request or action | Expected result |
| --- | --- | --- |
| 1 | Replace the header with `PRIVATE-TOKEN: token-invalido-sqe3` and send POST `/projects/{{project_id}}/wikis` with `{"title":"sqe3-wiki-{{run_id}}","content":"Guía inicial","format":"markdown"}`. | HTTP `401`. |
| 2 | Restore the editor token and send GET `/projects/{{project_id}}/wikis`. | HTTP `200`; the test title does not appear. |

#### TC_WIKI_POST_005 — Create without an explicit format

**Criterion:** CA-WIKI-04<br>
**Type:** Positive functional<br>
**Priority:** P2

**Preconditions:** Environment in 2.2 configured and test title available.

| Step | Request or action | Expected result |
| --- | --- | --- |
| 1 | POST `/projects/{{project_id}}/wikis` with `{"title":"sqe3-wiki-{{run_id}}","content":"Guía inicial"}`. | HTTP `201`; save `slug`; `format` is `markdown`. |
| 2 | GET `/projects/{{project_id}}/wikis/{{wiki_slug_url}}`. | HTTP `200`; `content` is `Guía inicial` and `format` is `markdown`. |

#### TC_WIKI_PUT_001 — Update only a guide’s content

**Criterion:** CA-WIKI-05<br>
**Type:** Positive functional<br>
**Priority:** P1

**Preconditions:** Environment in 2.2 configured and test title available. Create the page using the data in 4.3 and save `wiki_slug` and its encoded version in `wiki_slug_url`.

| Step | Request or action | Expected result |
| --- | --- | --- |
| 1 | PUT `/projects/{{project_id}}/wikis/{{wiki_slug_url}}` with `{"content":"Guía actualizada"}`. | HTTP `200`; the title is retained. |
| 2 | GET `/projects/{{project_id}}/wikis/{{wiki_slug_url}}`. | HTTP `200`; `content` is `Guía actualizada` and the title is the original. |

#### TC_WIKI_PUT_002 — Reject an update without editable fields

**Criterion:** CA-WIKI-06<br>
**Type:** Negative functional<br>
**Priority:** P2

**Preconditions:** Environment in 2.2 configured and test title available. Create the page using the data in 4.3 and save `wiki_slug` and its encoded version in `wiki_slug_url`.

| Step | Request or action | Expected result |
| --- | --- | --- |
| 1 | GET `/projects/{{project_id}}/wikis/{{wiki_slug_url}}`. | HTTP `200`; save the original title and content. |
| 2 | PUT `/projects/{{project_id}}/wikis/{{wiki_slug_url}}` with `{}`. | Rejection response; exact code pending confirmation during exploration. |
| 3 | GET `/projects/{{project_id}}/wikis/{{wiki_slug_url}}`. | HTTP `200`; title and content did not change. |

#### TC_WIKI_PUT_003 — Reject an update to a nonexistent page

**Criterion:** CA-WIKI-07<br>
**Type:** Negative functional<br>
**Priority:** P2

**Preconditions:** Environment in 2.2 configured and test title available. Confirm that `ausente-{{run_id}}` does not exist.

| Step | Request or action | Expected result |
| --- | --- | --- |
| 1 | PUT `/projects/{{project_id}}/wikis/ausente-{{run_id}}` with `{"content":"Guía actualizada"}`. | HTTP `404`. |
| 2 | GET `/projects/{{project_id}}/wikis/ausente-{{run_id}}`. | HTTP `404`; no page was created. |

#### TC_WIKI_PUT_004 — Reject an update with an invalid token

**Criterion:** CA-WIKI-03<br>
**Type:** Negative authentication<br>
**Priority:** P1

**Preconditions:** Environment in 2.2 configured and test title available. Create the page using the data in 4.3 and save `wiki_slug` and its encoded version in `wiki_slug_url`.

| Step | Request or action | Expected result |
| --- | --- | --- |
| 1 | PUT `/projects/{{project_id}}/wikis/{{wiki_slug_url}}` with `{"content":"Cambio no autorizado"}` and `PRIVATE-TOKEN: token-invalido-sqe3`. | HTTP `401`. |
| 2 | Restore the editor token and send GET `/projects/{{project_id}}/wikis/{{wiki_slug_url}}`. | HTTP `200`; original title and content intact. |

#### TC_WIKI_GET_001 — Retrieve a newly created guide

**Criterion:** CA-WIKI-09<br>
**Type:** Positive functional<br>
**Priority:** P1

**Preconditions:** Environment in 2.2 configured and test title available. Create the page using the data in 4.3 and save `wiki_slug` and its encoded version in `wiki_slug_url`.

| Step | Request or action | Expected result |
| --- | --- | --- |
| 1 | GET `/projects/{{project_id}}/wikis/{{wiki_slug_url}}`. | HTTP `200`; `title` matches the submitted value. |
| 2 | Check `content`, `format` and `slug` in the JSON. | Content `Guía inicial`, format `markdown` and slug equal to the saved value. |

#### TC_WIKI_GET_002 — Include content when listing pages

**Criterion:** CA-WIKI-09<br>
**Type:** Positive functional<br>
**Priority:** P2

**Preconditions:** Environment in 2.2 configured and test title available. Create the page using the data in 4.3 and save `wiki_slug` and its encoded version in `wiki_slug_url`.

| Step | Request or action | Expected result |
| --- | --- | --- |
| 1 | GET `/projects/{{project_id}}/wikis?with_content=true`. | HTTP `200`; list response body. |
| 2 | Find the entry with `slug = wiki_slug`. | The entry exists; `content` is `Guía inicial` and the title matches. |

#### TC_WIKI_GET_003 — Reject retrieval of a nonexistent page

**Criterion:** CA-WIKI-10<br>
**Type:** Negative functional<br>
**Priority:** P2

**Preconditions:** Environment in 2.2 configured and test title available. Confirm that `ausente-{{run_id}}` does not exist.

| Step | Request or action | Expected result |
| --- | --- | --- |
| 1 | GET `/projects/{{project_id}}/wikis/ausente-{{run_id}}`. | HTTP `404`; no page is returned. |

#### TC_WIKI_GET_004 — Retrieve a guide at a nested path

**Criterion:** CA-WIKI-11<br>
**Type:** Positive functional / encoding<br>
**Priority:** P2

**Preconditions:** Environment in 2.2 configured and test title available.

| Step | Request or action | Expected result |
| --- | --- | --- |
| 1 | POST `/projects/{{project_id}}/wikis` with `{"title":"manual-{{run_id}}/instalacion","content":"Guía inicial","format":"markdown"}`. | HTTP `201`; save the nested path slug. |
| 2 | Encode the full slug, replacing `/` with `%2F`; send GET `/projects/{{project_id}}/wikis/<slug_codificado>`. | HTTP `200`; title and content match the created page. |

#### TC_WIKI_GET_005 — List a wiki without pages

**Criterion:** CA-WIKI-12<br>
**Type:** Boundary: zero items<br>
**Priority:** P2

**Preconditions:** Use a test project without pages; set its ID in `project_id`. Do not empty a shared project to prepare this case.

| Step | Request or action | Expected result |
| --- | --- | --- |
| 1 | GET `/projects/{{project_id}}/wikis` on the empty project. | HTTP `200`; body exactly `[]`. |

#### TC_WIKI_DELETE_001 — Delete an existing guide

**Criterion:** CA-WIKI-13<br>
**Type:** Positive functional<br>
**Priority:** P1

**Preconditions:** Environment in 2.2 configured and test title available. Create the page using the data in 4.3 and save `wiki_slug` and its encoded version in `wiki_slug_url`.

| Step | Request or action | Expected result |
| --- | --- | --- |
| 1 | DELETE `/projects/{{project_id}}/wikis/{{wiki_slug_url}}`. | HTTP `204`; empty body. |
| 2 | GET `/projects/{{project_id}}/wikis/{{wiki_slug_url}}`. | HTTP `404`. |
| 3 | GET `/projects/{{project_id}}/wikis`; look for the deleted slug. | HTTP `200`; the slug does not appear. |

#### TC_WIKI_DELETE_002 — Reject deletion of a nonexistent page

**Criterion:** CA-WIKI-14<br>
**Type:** Negative functional<br>
**Priority:** P2

**Preconditions:** Environment in 2.2 configured and test title available. Create the page using the data in 4.3 and save `wiki_slug` and its encoded version in `wiki_slug_url`. This will be the control page. Confirm that `ausente-{{run_id}}` does not exist.

| Step | Request or action | Expected result |
| --- | --- | --- |
| 1 | DELETE `/projects/{{project_id}}/wikis/ausente-{{run_id}}`. | HTTP `404`. |
| 2 | GET `/projects/{{project_id}}/wikis/{{wiki_slug_url}}`. | HTTP `200`; the control page retains its title and content. |

#### TC_WIKI_DELETE_003 — Reject deletion with an invalid token

**Criterion:** CA-WIKI-03<br>
**Type:** Negative authentication<br>
**Priority:** P1

**Preconditions:** Environment in 2.2 configured and test title available. Create the page using the data in 4.3 and save `wiki_slug` and its encoded version in `wiki_slug_url`.

| Step | Request or action | Expected result |
| --- | --- | --- |
| 1 | DELETE `/projects/{{project_id}}/wikis/{{wiki_slug_url}}` with `PRIVATE-TOKEN: token-invalido-sqe3`. | HTTP `401`. |
| 2 | Restore the editor token and send GET `/projects/{{project_id}}/wikis/{{wiki_slug_url}}`. | HTTP `200`; page and content intact. |

#### TC_WIKI_E2E_001 — Maintain a guide throughout its lifecycle

**Criterion:** CA-WIKI-15<br>
**Type:** Positive E2E<br>
**Priority:** P0

**Preconditions:** Environment in 2.2 configured and test title available.

| Step | Request or action | Expected result |
| --- | --- | --- |
| 1 | POST `/projects/{{project_id}}/wikis` with `{"title":"sqe3-wiki-{{run_id}}","content":"Guía inicial","format":"markdown"}`. | HTTP `201`; save the slug. |
| 2 | GET `/projects/{{project_id}}/wikis/{{wiki_slug_url}}`. | HTTP `200`; content `Guía inicial`. |
| 3 | PUT `/projects/{{project_id}}/wikis/{{wiki_slug_url}}` with `{"content":"Guía actualizada"}`. | HTTP `200`. |
| 4 | GET `/projects/{{project_id}}/wikis/{{wiki_slug_url}}`. | HTTP `200`; content `Guía actualizada`. |
| 5 | GET `/projects/{{project_id}}/wikis?with_content=true`; find the slug. | HTTP `200`; page present with updated content. |
| 6 | DELETE `/projects/{{project_id}}/wikis/{{wiki_slug_url}}`. | HTTP `204`; empty body. |
| 7 | GET `/projects/{{project_id}}/wikis/{{wiki_slug_url}}`. | HTTP `404`. |
| 8 | GET `/projects/{{project_id}}/wikis`; look for the slug. | HTTP `200`; page absent. |

#### TC_WIKI_E2E_002 — Protect a guide from a reader without write access

**Criterion:** CA-WIKI-08<br>
**Type:** E2E / negative authorization<br>
**Priority:** P1

**Preconditions:** Environment in 2.2 configured and test title available. Create the page using the data in 4.3 and save `wiki_slug` and its encoded version in `wiki_slug_url`. Configure `token_reader` with read access and no write access.

| Step | Request or action | Expected result |
| --- | --- | --- |
| 1 | GET `/projects/{{project_id}}/wikis/{{wiki_slug_url}}` with `PRIVATE-TOKEN: {{token_reader}}`. | HTTP `200`; confirm that the reader has read access. |
| 2 | PUT `/projects/{{project_id}}/wikis/{{wiki_slug_url}}` with the reader token and `{"content":"Cambio del lector"}`. | Write rejected; exact code pending confirmation based on permissions. |
| 3 | GET `/projects/{{project_id}}/wikis/{{wiki_slug_url}}` with the editor token. | HTTP `200`; original content intact. |
| 4 | DELETE `/projects/{{project_id}}/wikis/{{wiki_slug_url}}` with the reader token. | Deletion rejected; exact code pending confirmation based on permissions. |
| 5 | GET `/projects/{{project_id}}/wikis/{{wiki_slug_url}}` with the editor token. | HTTP `200`; original page and content intact. |

---

<a id="actividad-5"></a>

## Activity #5: Test classification

### 5.1 Proposed classification and prioritization

| Type | Purpose | Example |
| --- | --- | --- |
| Positive functional | Check a valid operation and its effect. | TC_WIKI_PUT_001 |
| Negative functional | Check rejection and absence of improper changes. | TC_WIKI_POST_002 |
| Negative authentication / authorization | Check credentials and write restrictions. | TC_WIKI_DELETE_003 / TC_WIKI_E2E_002 |
| Boundary | Check a collection with no items. | TC_WIKI_GET_005 |
| E2E | Check a chained flow and its final state. | TC_WIKI_E2E_001 |

The [conventions, priorities and feedback](l1.md#actividad-5) are collected in the group document.

---

<a id="fuentes"></a>

## Feature sources

- [Project wikis API](https://docs.gitlab.com/api/wikis/).
- [Wiki: operation and permissions](https://docs.gitlab.com/user/project/wiki/).
- [Shared lab sources](l1.md#fuentes).

[← Back to the group lab](l1.md)
