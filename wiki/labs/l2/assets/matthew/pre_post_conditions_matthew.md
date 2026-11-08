# Lab 2 — Matthew: Wiki preconditions and postconditions

[Back to the group lab](../../l2.md) · [Implementation and execution](../../l2_matthew.md)

These conditions map all 19 LLTCs from [Lab 1](../../../l1/l1_matthew.md#casos-lltc) to the [Wiki collection](GitLab_Wiki_LLTC.postman_collection.json). The original case IDs are retained. The test data uses English text (`Initial guide`, `Updated guide`) and a unique title per execution.

## Shared conditions

- **Environment:** a private GitLab test project with Wiki enabled, an editor with `api` scope and Developer or higher permissions, and the shared GitLab environment selected.
- **Preparation:** each pre-request script resets its temporary variables, generates a unique title and creates its own page when needed. The raw returned slug is retained for comparisons and encoded once for URLs.
- **Postconditions:** post-response scripts check status, JSON headers, schema and relevant values. Follow-up reads check persistence and absence after deletion.
- **Cleanup:** post-response cleanup runs in `finally`, including after failed verification. It deletes only slugs registered as created by the current case and confirms `404`. A failed precondition triggers a failed assertion and prevents the main request.
- **Recovery:** if a transport error prevents the server from returning the slug of a successfully created page, inspect that run's uniquely prefixed title and remove only that test page manually. If the process is interrupted, automatic cleanup cannot run.
- **List checks:** follow pagination before deciding whether a page is present or absent. Run whole-list comparisons without concurrent writers.
- **Scope:** temporary values use `pm.variables` and reset before each case; project settings and secrets use the selected environment. Failed-cleanup slugs are not a persistent recovery log. No globals or credential values are exported.

## Case conditions

<a id="tc_wiki_post_001"></a>

### TC_WIKI_POST_001 — Create a guide with valid data

**Criteria:** CA-WIKI-01  <br>
**Type:** Positive functional  <br>
**Priority:** P1

**Preconditions:** Configured private test project, Wiki enabled, editor token with `api` scope and Developer or higher permissions and unique case data.

**Postconditions:** The created page can be read with the documented display title, matching content, raw slug and Markdown format.

**Cleanup:** Delete only pages registered as created by this case; verify `404` even after a failed assertion. If cleanup fails, record the page’s slug for manual recovery before rerunning; `wiki_owned_slugs` is temporary and resets in the next case.

<a id="tc_wiki_post_002"></a>

### TC_WIKI_POST_002 — Reject creation without a title

**Criteria:** CA-WIKI-02  <br>
**Type:** Negative functional  <br>
**Priority:** P1

**Preconditions:** Configured private test project, Wiki enabled, editor token with `api` scope and Developer or higher permissions and unique case data. Record the full page list; run without concurrent wiki writers.

**Postconditions:** The omitted-title request is rejected and the complete page set is unchanged.

**Cleanup:** Delete only pages registered as created by this case; verify `404` even after a failed assertion. If cleanup fails, record the page’s slug for manual recovery before rerunning; `wiki_owned_slugs` is temporary and resets in the next case.

<a id="tc_wiki_post_003"></a>

### TC_WIKI_POST_003 — Reject creation without content

**Criteria:** CA-WIKI-02  <br>
**Type:** Negative functional  <br>
**Priority:** P1

**Preconditions:** Configured private test project, Wiki enabled, editor token with `api` scope and Developer or higher permissions and unique case data.

**Postconditions:** The omitted-content request is rejected and no page with the generated title exists.

**Cleanup:** Delete only pages registered as created by this case; verify `404` even after a failed assertion. If cleanup fails, record the page’s slug for manual recovery before rerunning; `wiki_owned_slugs` is temporary and resets in the next case.

<a id="tc_wiki_post_004"></a>

### TC_WIKI_POST_004 — Reject creation with an invalid token

**Criteria:** CA-WIKI-03  <br>
**Type:** Negative authentication  <br>
**Priority:** P1

**Preconditions:** Configured private test project, Wiki enabled, editor token with `api` scope and Developer or higher permissions and unique case data.

**Postconditions:** Invalid credentials are rejected and no page with the generated title exists.

**Cleanup:** Delete only pages registered as created by this case; verify `404` even after a failed assertion. If cleanup fails, record the page’s slug for manual recovery before rerunning; `wiki_owned_slugs` is temporary and resets in the next case.

<a id="tc_wiki_post_005"></a>

### TC_WIKI_POST_005 — Create without an explicit format

**Criteria:** CA-WIKI-04  <br>
**Type:** Positive functional  <br>
**Priority:** P2

**Preconditions:** Configured private test project, Wiki enabled, editor token with `api` scope and Developer or higher permissions and unique case data.

**Postconditions:** The omitted format defaults to Markdown and persists on retrieval.

**Cleanup:** Delete only pages registered as created by this case; verify `404` even after a failed assertion. If cleanup fails, record the page’s slug for manual recovery before rerunning; `wiki_owned_slugs` is temporary and resets in the next case.

<a id="tc_wiki_put_001"></a>

### TC_WIKI_PUT_001 — Update only a guide’s content

**Criteria:** CA-WIKI-05  <br>
**Type:** Positive functional  <br>
**Priority:** P1

**Preconditions:** Configured private test project, Wiki enabled, editor token with `api` scope and Developer or higher permissions and unique case data. Create a disposable page and save its raw and encoded slug.

**Postconditions:** Updated content persists while the title, slug and format remain unchanged.

**Cleanup:** Delete only pages registered as created by this case; verify `404` even after a failed assertion. If cleanup fails, record the page’s slug for manual recovery before rerunning; `wiki_owned_slugs` is temporary and resets in the next case.

<a id="tc_wiki_put_002"></a>

### TC_WIKI_PUT_002 — Preserve a page when updating with an empty body

**Criteria:** CA-WIKI-06 — changed expectation in L2; the original rejection criterion is not validated.  <br>
**Type:** Positive functional / no-op  <br>
**Priority:** P2

**Preconditions:** Configured private test project, Wiki enabled, editor token with `api` scope and Developer or higher permissions and unique case data. Create a disposable page and save its raw and encoded slug. The prepared page uses Markdown. L2 tests the observed no-op behavior, adapting the original L1 rejection scenario.

**Postconditions:** An empty JSON update returns `200`; title, content, slug and Markdown format remain unchanged in the response and a subsequent GET.

**Cleanup:** Delete only pages registered as created by this case; verify `404` even after a failed assertion. If cleanup fails, record the page’s slug for manual recovery before rerunning; `wiki_owned_slugs` is temporary and resets in the next case.

<a id="tc_wiki_put_003"></a>

### TC_WIKI_PUT_003 — Reject an update to a nonexistent page

**Criteria:** CA-WIKI-07  <br>
**Type:** Negative functional  <br>
**Priority:** P2

**Preconditions:** Configured private test project, Wiki enabled, editor token with `api` scope and Developer or higher permissions and unique case data. Confirm a unique absent slug returns `404`.

**Postconditions:** The absent slug is still absent after the rejected update.

**Cleanup:** No resource is created; do not delete existing pages.

<a id="tc_wiki_put_004"></a>

### TC_WIKI_PUT_004 — Reject an update with an invalid token

**Criteria:** CA-WIKI-03  <br>
**Type:** Negative authentication  <br>
**Priority:** P1

**Preconditions:** Configured private test project, Wiki enabled, editor token with `api` scope and Developer or higher permissions and unique case data. Create a disposable page and save its raw and encoded slug.

**Postconditions:** The invalid-token update is rejected and the original page remains unchanged.

**Cleanup:** Delete only pages registered as created by this case; verify `404` even after a failed assertion. If cleanup fails, record the page’s slug for manual recovery before rerunning; `wiki_owned_slugs` is temporary and resets in the next case.

<a id="tc_wiki_get_001"></a>

### TC_WIKI_GET_001 — Retrieve a newly created guide

**Criteria:** CA-WIKI-09  <br>
**Type:** Positive functional  <br>
**Priority:** P1

**Preconditions:** Configured private test project, Wiki enabled, editor token with `api` scope and Developer or higher permissions and unique case data. Create a disposable page and save its raw and encoded slug.

**Postconditions:** The response matches the prepared page data.

**Cleanup:** Delete only pages registered as created by this case; verify `404` even after a failed assertion. If cleanup fails, record the page’s slug for manual recovery before rerunning; `wiki_owned_slugs` is temporary and resets in the next case.

<a id="tc_wiki_get_002"></a>

### TC_WIKI_GET_002 — Include content when listing pages

**Criteria:** CA-WIKI-09  <br>
**Type:** Positive functional  <br>
**Priority:** P2

**Preconditions:** Configured private test project, Wiki enabled, editor token with `api` scope and Developer or higher permissions and unique case data. Create a disposable page and save its raw and encoded slug.

**Postconditions:** The prepared page appears in the complete list with its content.

**Cleanup:** Delete only pages registered as created by this case; verify `404` even after a failed assertion. If cleanup fails, record the page’s slug for manual recovery before rerunning; `wiki_owned_slugs` is temporary and resets in the next case.

<a id="tc_wiki_get_003"></a>

### TC_WIKI_GET_003 — Reject retrieval of a nonexistent page

**Criteria:** CA-WIKI-10  <br>
**Type:** Negative functional  <br>
**Priority:** P2

**Preconditions:** Configured private test project, Wiki enabled, editor token with `api` scope and Developer or higher permissions and unique case data. Confirm a unique absent slug returns `404`.

**Postconditions:** The nonexistent page returns `404`.

**Cleanup:** No resource is created; do not delete existing pages.

<a id="tc_wiki_get_004"></a>

### TC_WIKI_GET_004 — Retrieve a guide at a nested path

**Criteria:** CA-WIKI-11  <br>
**Type:** Positive functional / encoding  <br>
**Priority:** P2

**Preconditions:** Configured private test project, Wiki enabled, editor token with `api` scope and Developer or higher permissions and unique case data. Use a unique nested title.

**Postconditions:** The nested page is retrieved with the returned slug encoded once; its display title is `installation`, without the parent path.

**Cleanup:** Delete only pages registered as created by this case; verify `404` even after a failed assertion. If cleanup fails, record the page’s slug for manual recovery before rerunning; `wiki_owned_slugs` is temporary and resets in the next case.

<a id="tc_wiki_get_005"></a>

### TC_WIKI_GET_005 — List a wiki without pages

**Criteria:** CA-WIKI-12  <br>
**Type:** Boundary: zero items  <br>
**Priority:** P2

**Preconditions:** Shared environment selected, editor token with `api` scope and access to the separate project in `empty_project_id`. Its Wiki must be enabled and already contain zero pages.

**Postconditions:** The separate empty wiki returns an empty array and remains untouched.

**Cleanup:** No resource is created; do not delete existing pages.

<a id="tc_wiki_delete_001"></a>

### TC_WIKI_DELETE_001 — Delete an existing guide

**Criteria:** CA-WIKI-13  <br>
**Type:** Positive functional  <br>
**Priority:** P1

**Preconditions:** Configured private test project, Wiki enabled, editor token with `api` scope and Developer or higher permissions and unique case data. Create a disposable page and save its raw and encoded slug.

**Postconditions:** Deletion returns `204` with an empty response body; the page returns `404` and is absent from the complete list.

**Cleanup:** Delete only pages registered as created by this case; verify `404` even after a failed assertion. If cleanup fails, record the page’s slug for manual recovery before rerunning; `wiki_owned_slugs` is temporary and resets in the next case.

<a id="tc_wiki_delete_002"></a>

### TC_WIKI_DELETE_002 — Reject deletion of a nonexistent page

**Criteria:** CA-WIKI-14  <br>
**Type:** Negative functional  <br>
**Priority:** P2

**Preconditions:** Configured private test project, Wiki enabled, editor token with `api` scope and Developer or higher permissions and unique case data. Create a disposable page and save its raw and encoded slug. Confirm a unique absent slug returns `404`.

**Postconditions:** The absent target returns `404` and the control page remains unchanged.

**Cleanup:** Delete only pages registered as created by this case; verify `404` even after a failed assertion. If cleanup fails, record the page’s slug for manual recovery before rerunning; `wiki_owned_slugs` is temporary and resets in the next case.

<a id="tc_wiki_delete_003"></a>

### TC_WIKI_DELETE_003 — Reject deletion with an invalid token

**Criteria:** CA-WIKI-03  <br>
**Type:** Negative authentication  <br>
**Priority:** P1

**Preconditions:** Configured private test project, Wiki enabled, editor token with `api` scope and Developer or higher permissions and unique case data. Create a disposable page and save its raw and encoded slug.

**Postconditions:** The invalid-token deletion is rejected and the page remains intact.

**Cleanup:** Delete only pages registered as created by this case; verify `404` even after a failed assertion. If cleanup fails, record the page’s slug for manual recovery before rerunning; `wiki_owned_slugs` is temporary and resets in the next case.

<a id="tc_wiki_e2e_001"></a>

### TC_WIKI_E2E_001 — Maintain a guide throughout its lifecycle

**Criteria:** CA-WIKI-15  <br>
**Type:** Positive E2E  <br>
**Priority:** P0

**Preconditions:** Configured private test project, Wiki enabled, editor token with `api` scope and Developer or higher permissions and unique case data.

**Postconditions:** The page can be created, read and updated. The full listing includes its updated content. After deletion, GET returns `404` and the page no longer appears in the list.

**Cleanup:** Delete only pages registered as created by this case; verify `404` even after a failed assertion. If cleanup fails, record the page’s slug for manual recovery before rerunning; `wiki_owned_slugs` is temporary and resets in the next case.

<a id="tc_wiki_e2e_002"></a>

### TC_WIKI_E2E_002 — Protect a guide with a read-only API token

**Criteria:** CA-WIKI-08 — scope-based variant in L2; the original role restriction is not validated.  <br>
**Type:** E2E / negative authorization  <br>
**Priority:** P1

**Preconditions:** Configured private test project, Wiki enabled, editor token with `api` scope and Developer or higher permissions and unique case data. Create a disposable page and save its raw and encoded slug. A separate legacy token has only `read_api`; it may belong to the editor account. This L2 variant tests token-scope authorization, while L1 described a project-role restriction.

**Postconditions:** Reader access succeeds with `read_api`; PUT and DELETE return `403` and editor reads confirm unchanged content.

**Cleanup:** Delete only pages registered as created by this case; verify `404` even after a failed assertion. If cleanup fails, record the page’s slug for manual recovery before rerunning; `wiki_owned_slugs` is temporary and resets in the next case.

