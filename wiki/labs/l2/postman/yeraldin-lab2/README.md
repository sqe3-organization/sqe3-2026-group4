# Yeraldin Vasquez - Lab 2 Postman Project Issues

This folder contains Yeraldin Vasquez's individual implementation for the GitLab REST API v4 Project Issues feature.

## Files

- `yeraldin-project-issues.postman_collection.json`: Complete Postman v2.1.0 collection implementing `TC_ISSUE_*` test cases, assertions for HTTP status codes, headers, JSON body attributes, schema validation, and an end-to-end (E2E) lifecycle flow.
- `yeraldin-project-issues.postman_environment.example.json`: Environment variable template without secrets or credentials.

## Postman Environment Setup

1. Open Postman and import both files (`.postman_collection.json` and `.postman_environment.example.json`).
2. Duplicate the imported environment for local usage (e.g., `SQE3 - Yeraldin Local`) and select it.
3. Configure the following variables in your local environment:
   - `base_url`: API base URL (defaults to `https://gitlab.com/api/v4`).
   - `project_id`: Numeric ID of the disposable GitLab test project.
   - `token_reporter`: Personal access token with `api` scope and Reporter role (or higher) to create, retrieve, update, and close issues.
   - `token_owner`: Personal access token with `api` scope and Project Owner / Maintainer role for permanent issue deletion.
   - `token_guest`: Optional token with Guest role to verify authorization restrictions.
4. **Security Notice:** Do not commit actual tokens, cookies, or secrets to the Git repository or include them in screenshots.

## Collection Structure and Recommended Execution Order

The collection includes a collection-level pre-request script that dynamically generates a timestamp-based `run_id` (`Date.now()`) and sets unique issue titles (`issue_title`, `e2e_issue_title`) to prevent naming collisions between consecutive runs.

Recommended sequential execution order:

1. **Issue Creation:**
   - `TC_ISSUE_POST_001`: Creates the primary test issue and stores `issue_iid` in collection variables.
   - `TC_ISSUE_POST_002`: Validates rejection (`400 Bad Request`) when omitting the mandatory `title` attribute.
   - `TC_ISSUE_POST_003`: Validates authentication rejection (`401 Unauthorized`) with an invalid token.
   - `TC_ISSUE_POST_004`: Creates an issue with multiple labels and saves `labels_issue_iid`.
2. **Retrieval and Nonexistent Validation:**
   - `TC_ISSUE_GET_001`: Retrieves the created issue by its `issue_iid` and checks attributes and response times.
   - `TC_ISSUE_GET_002`: Validates `404 Not Found` response for a nonexistent issue ID.
3. **Modifications:**
   - `TC_ISSUE_PUT_001`: Updates description while preserving the original title intact.
   - `TC_ISSUE_PUT_002`: Closes the issue using `state_event: "close"` and verifies the `closed_at` timestamp.
   - `TC_ISSUE_PUT_003`: Validates `404 Not Found` when attempting to update a nonexistent issue.
4. **Advanced Filters and Boundaries:**
   - `TC_ISSUE_GET_003`: Filters issues by `state=closed` and verifies that all items satisfy the filter.
   - `TC_ISSUE_GET_004`: Tests pagination boundary with `per_page=1` and validates `x-per-page` and `x-total` headers.
5. **Deletion and Authorization Boundaries:**
   - `TC_ISSUE_DELETE_001`: Deletes the primary issue using Owner credentials (`204 No Content`).
   - `TC_ISSUE_DELETE_002`: Validates `404 Not Found` when attempting to delete a nonexistent issue.
   - `TC_ISSUE_E2E_002`: Verifies authorization boundary: an unprivileged Guest role cannot modify issues.
6. **Full E2E Lifecycle Flow:**
   - Folder `TC_ISSUE_E2E_001 - Complete issue lifecycle`: Executes the 6-step lifecycle flow (Create -> Retrieve -> Close -> Filter -> Delete -> Verify Absence) independently.
7. **Cleanup:**
   - Request `Cleanup - Delete remaining labels issue if present` to ensure the project remains clean.

## Automated Execution via CLI (Newman)

The collection can be executed automatically in continuous integration (CI/CD) pipelines or terminal environments using Newman:

```bash
# Run collection with local environment file
npx newman run yeraldin-project-issues.postman_collection.json \
  -e my_local_environment.json \
  --reporters cli
```

To export an execution report in JSON format:

```bash
npx newman run yeraldin-project-issues.postman_collection.json \
  -e my_local_environment.json \
  --reporters cli,json \
  --reporter-json-export run_report.json
```
