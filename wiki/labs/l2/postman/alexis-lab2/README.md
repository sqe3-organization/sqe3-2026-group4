# Alexis Frene - Lab 2 Postman Project Labels

This folder contains Alexis's individual implementation for the GitLab REST API
v4 project labels feature.

## Files

- `alexis-project-labels.postman_collection.json`: collection with the
  `TC_LABEL_*` cases and the E2E flow for creating, retrieving, updating,
  filtering and deleting labels.
- `alexis-project-labels.postman_environment.example.json`: example environment
  without `project_id` or tokens.

## Configuration

1. Import the collection and the example environment into Postman.
2. Duplicate the environment for local use and select the copy.
3. Set `project_id` to the numeric ID of a test project.
4. Set `token_label_manager` to a token that can manage project labels.
5. Set `token_label_reader` to a read-only token for the authorization case, if
   one is available.
6. Do not store tokens in the repository or in screenshots.

The collection generates unique names using `run_id` and encodes names before
sending them as path parameters. Created data can be cleaned up with the
`Cleanup - Delete archived label` request and the deletion cases.

## Recommended order

To test the complete flow, run the requests in this order:

1. `TC_LABEL_POST_001` to create the main label.
2. `TC_LABEL_POST_002` through `TC_LABEL_GET_004` to validate creation,
   retrieval, search, pagination and filters.
3. `TC_LABEL_PUT_001` through `TC_LABEL_PUT_005` to validate updates and
   authorization.
4. `TC_LABEL_DELETE_001` and `TC_LABEL_DELETE_002`.
5. The `TC_LABEL_E2E_001` folder.
6. The cleanup request.

Each request can also be run separately if its preconditions are met and the
required variable values are available.

## Execution status

The collection is ready to run, but actual results depend on the GitLab project
and the team's tokens. No credentials are included, and no screenshots or
results are fabricated.
