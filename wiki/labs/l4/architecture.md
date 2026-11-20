# Lab 4 — Framework architecture

[Back to Lab 4](l4.md)

## Architecture

```mermaid
flowchart LR
  Env["Local .env and process environment"] --> Config["GitLab configuration"]
  Config --> Client["Got client factory"]
  Client --> Suite["Test code using the request manager"]
  Suite --> Manager["Singleton RequestManager"]
  Manager --> Got["Got client selected for the request"]
  Got --> API["GitLab REST API"]
  API -->|HTTP response| Got
  Manager -->|Status, headers and body| Suite
  Suite --> Checks["Vitest assertions and Zod schemas"]
  Simulated["Issues and Labels simulations"] --> Checks
```

Vitest loads the local environment before the specs. The client factory applies the URL, timeout, retry policy and credentials. The request manager sends the request with the selected client and returns the complete response. Zod validates response bodies at the test boundary.

## Folder structure

```mermaid
flowchart TD
  Root["Project root"] --> Src["src/"]
  Root --> Tests["tests/"]
  Root --> Tooling[".env.example, vitest.config.ts, bunfig.toml, .oxlintrc.json"]
  Src --> Config["config/ — GitLab defaults and environment resolution"]
  Src --> API["api/ — Got factory and request manager"]
  Src --> Schemas["schemas/ — response schemas"]
  Tests --> Integration["integration/ — feature specs"]
  Tests --> Setup["setup/ — environment loading"]
  Tests --> Support["support/ — fixtures and cleanup"]
```
