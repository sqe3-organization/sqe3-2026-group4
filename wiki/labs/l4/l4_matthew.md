# Lab 4 — Matthew: Project Wiki

[Group lab](l4.md) · [Lab 3 implementation](../l3/l3_matthew.md)

## Activity 1 — Wiki structure

The [Wiki spec](../../../tests/integration/wiki.spec.ts) defines the cases and assertions. The [WikiSession fixture](../../../tests/support/wiki.ts) prepares test data, manages request credentials and tracks pages for cleanup. The [Wiki schemas](../../../src/schemas/wiki.schema.ts) validate response bodies.

## Activity 2 — Singleton request manager

```mermaid
sequenceDiagram
  participant Spec as Wiki spec
  participant Session as WikiSession fixture
  participant Manager as Shared RequestManager
  participant Client as Got client
  participant API as GitLab Wiki API

  Spec->>Session: Call a Wiki operation
  Session->>Session: Select the client for the access profile
  Session->>Manager: request(method, endpoint, options)
  Manager->>Client: Send the request
  Client->>API: HTTP request
  API-->>Client: HTTP response
  Client-->>Manager: Parsed response
  Manager-->>Session: Status, headers and body
  Session-->>Spec: Return the response or check the fixture result
```
