# Lab 2 - Alexis Frene: Postman Project labels

[Back to the group Lab 2](l2.md)  
[Back to the Lab 1 design](../l1/l1_alexis.md)

## Feature

This implementation automates the GitLab Project labels API selected in Lab 1.
The source design contains the endpoint contract, use case, acceptance
criteria and 17 LLTC cases.

## Postman deliverables

- [Collection](postman/alexis-lab2/alexis-project-labels.postman_collection.json)
- [Credential-free environment example](postman/alexis-lab2/alexis-project-labels.postman_environment.example.json)
- [Setup and execution instructions](postman/alexis-lab2/README.md)

## Implemented capabilities

- Uses `base_url` and `project_id` as configurable variables.
- Keeps manager and reader tokens empty and local to the user's Postman setup.
- Generates unique label names from `run_id`.
- URL-encodes label names before using them as path parameters.
- Sends create and update data as form-encoded fields, as required by the
  Project labels API.
- Saves IDs returned by create requests for later retrieval, update and cleanup.
- Checks response status and relevant response fields in Postman test scripts.
- Includes cleanup requests and an end-to-end lifecycle flow.

## Coverage

The collection implements the cases from [Activity 4 in Lab 1](../l1/l1_alexis.md#actividad-4):

- Create, retrieve, list, search, pagination and archived filtering.
- Missing required fields, invalid data and nonexistent resources.
- Invalid authentication and insufficient mutation permissions.
- Update, rename, priority boundary and deletion behavior.
- Complete create-read-update-filter-delete lifecycle.

## Execution status

The collection is automated but has not been executed against the team's live
test project in this repository. Execution evidence must be captured with
sanitized requests and without committing tokens, cookies or project secrets.

Activities 4 and 5 of the group Lab 2 are outside this individual deliverable.
