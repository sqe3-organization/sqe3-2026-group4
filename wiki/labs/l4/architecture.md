# Lab 4 — Framework architecture

[Back to Lab 4](l4.md)

## Architecture

```mermaid
flowchart LR
  setup["Environment and Vitest setup"] --> specs["Integration specs"]
  setup --> config["GitLab configuration"]
  config --> client["Got client"]
  data["Test datasets"] --> specs
  specs -->|"Feature context and cleanup"| fixtures["Test fixtures"]
  fixtures --> manager["Singleton RequestManager"]
  manager --> client
  specs -->|"Direct HTTP in Repositories"| client
  client <-->|"HTTP"| gitlab["GitLab REST API"]
  specs --> contracts["Vitest assertions and Zod response schemas"]
  simulated["Simulated responses in Labels and Issues"] --> contracts
  manager --> logger["Pino request events"]
  logger --> runLog["Run JSONL"]
  runLog --> reports["JSON and Markdown reports"]
```

| Layer | Responsibility |
| --- | --- |
| Configuration and setup | `src/config/` resolves API settings and credentials. `tests/setup/` loads the environment and gives workers the same log path for a run. |
| Specification | `tests/integration/` defines scenarios and asserts status codes, headers, bodies and resource state. |
| Test support | `tests/support/` loads case data, prepares resources and handles cleanup where the feature needs it. |
| HTTP | `src/api/` configures Got. The shared `RequestManager` sends requests with the selected client and returns the response for the spec to check. |
| Response contracts | `src/schemas/` uses Zod to validate response bodies. |
| Logging and reporting | `src/utils/` records request outcomes and summarizes each execution log. |

Wiki uses the shared request manager for live requests. Repositories sends HTTP requests through Got directly. Labels exercises an in-memory simulation, and Issues includes simulated responses alongside HTTP requests.

## Folder structure

```mermaid
flowchart TD
  Root["Project root"] --> Src["src/"]
  Root --> Tests["tests/"]
  Root --> Tooling[".env.example, vitest.config.ts, bunfig.toml, .oxlintrc.json"]
  Src --> Config["config/ — GitLab defaults and environment resolution"]
  Src --> API["api/ — Got factory and request manager"]
  Src --> Schemas["schemas/ — response schemas"]
  Src --> Logs["utils/ — logging and reports"]
  Tests --> Integration["integration/ — feature specs"]
  Tests --> Setup["setup/ — environment and run setup"]
  Tests --> Support["support/ — fixtures and cleanup"]
  Tests --> Data["data/ — test datasets"]
```
