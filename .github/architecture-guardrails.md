# Architecture Guardrails

<!--
  PURPOSE: Single source of truth for architectural standards, design constraints,
  and active repo-level ADRs that apply across all features in this repository.

  This file is READ by:
  - /definition skill (Step 1.5 — Architecture constraints scan before story decomposition)
  - /review skill (Category E — Architecture compliance check)
  - /definition-of-ready skill (H9 — Guardrail compliance hard block)
  - /trace skill (Architecture compliance check in chain validation)
  - Coding agent (Constraints block in DoR artefact — agent must not violate these)

  Per-feature decisions live in artefacts/[feature]/decisions.md
  Structural decisions that constrain future features are promoted to Active ADRs here.

  To evolve: update this file, open a PR, tag tech lead for review.
-->

**Last updated:** 2026-04-02
**Maintained by:** Repo owner (solo)

---

## What This Repo Is

This repository is a **skills-based SDLC pipeline library** — not an application.
It contains:
- `pipeline-viz.html` — single-file HTML/CSS/JS pipeline visualisation tool
- `.github/skills/*/SKILL.md` — agent skill instruction files (Markdown)
- `.github/templates/*.md` — artefact templates (Markdown)
- `.github/pipeline-state.json` + `pipeline-state.schema.json` — live + schema state files
- `.github/scripts/` — Node.js pre-commit hooks and validators
- `artefacts/` — per-feature pipeline artefacts produced during delivery

Architecture guardrails apply to changes to the viz (`pipeline-viz.html`), the schema (`pipeline-state.schema.json`), any new scripts added under `.github/scripts/`, and **all prototype source code under `src/`**.

Skill files and templates are content, not code — they are governed by pipeline process, not these guardrails.

---

## Prototype Codebase Architecture

This section governs the governance prototype itself: the TypeScript agent scripts and supporting library code under `src/`. These constraints were established during S1–S7 and apply to all subsequent stories (S8+).

### Agent Layer (`src/agents/`)

- **Three agents, one responsibility each.** `dev-agent.ts` governs implementation work, `review-agent.ts` governs trace validation, `assurance-agent.ts` governs independent cold-start verification. Agents must not take on each other's responsibilities.
- **Every agent file must guard `main()` with `require.main === module`** (DL-008). Without this guard, importing an agent module in a test triggers queue execution at parse time and crashes the Jest worker. This is mandatory — not optional.
- **Agent invocation via `spawnSync` with explicit args array** (DL-007). Do not use `execSync` with a shell string — path spaces in worktree paths cause arg splitting. Use `spawnSync(process.execPath, [TS_NODE_BIN, agentFile, ...args])`. See S1 integration test for the canonical pattern.
- **Cold-start independence is a hard architectural rule for the assurance agent.** The assurance agent must be invocable with no shared in-memory state, session variables, or execution context from the dev or review agents. The trace log file is the only allowed input channel from prior agents. Any change that creates implicit shared state between agents violates this constraint.
- **Agent scripts must exit non-zero on failure.** The assurance agent calls `process.exit(1)` when `verdict === 'escalate'`. This is a required observable behaviour — not configurable. See DL-007 / S5 F2 fix.

### Skills Registry (`skills-registry.json`)

- **`skills-registry.json` at the repo root is the authority registry for all skill file paths.** Format: `{ "skill-name": "./relative/path/SKILL.md" }`. All agent scripts resolve skill paths from this registry — never by hardcoding a path.
- **Changing which file is `feature-dev`, `feature-review`, or `feature-assurance` requires updating `skills-registry.json`.** This makes skill version changes auditable. Hardcoded skill paths anywhere in `src/` are a violation.
- **Skills are read from the local filesystem only.** No API-based skill resolution, no network fetch, no dynamic download. The skill file at the configured path at invocation time is the governing version.

### Trace Log (`trace.jsonl`)

- **Trace log entries are append-only.** Use `fs.appendFileSync` — never `fs.writeFileSync` or any operation that truncates the log. The `emitAssuranceRecord()` and `emitTraceEntry()` functions must always append. `fs.appendFileSync` is the canonical reference (S4).
- **Trace entries conform to `src/types/trace.ts`.** All three agents emit trace entries that satisfy the shared TypeScript interface. Adding new fields requires updating the interface — never ad-hoc inline additions. The interface is validated by `tsc --strict`.
- **Every trace entry must contain all required fields: `agentIdentity`, `skillName`, `skillVersion`, `promptHash`, `hashAlgorithm`, `criteriaResults` (array), `decisionOutcome`, and `timestamp`.** Assurance entries additionally require `devHashMatch`, `reviewHashMatch`, `criteriaOutcomes[3]`, and `verdict`. Omitting a required field is a schema violation.
- **Prompt hash is SHA-256 over raw skill file bytes.** Hash algorithm must be recorded as `hashAlgorithm: 'sha256'` explicitly in each trace entry so it can be independently verified. Do not assume the algorithm — record it.
- **Field names in the trace are plain English, no abbreviations.** A non-engineer must be able to open the trace log and answer three governance questions without a data dictionary: (1) what policy governed this decision, (2) how was compliance verified, (3) who or what made the assurance call. Field names that require cross-referencing another document to interpret are a violation (M5 requirement).

### Type System (`src/types/`)

- **`src/types/trace.ts` is the canonical trace schema.** All agent trace entry types are defined here. Any new or modified trace entry type is a change to this file — not to the agent file directly.
- **TypeScript strict mode (`tsc --strict`) must pass with zero errors at all times.** No `any` types, no implicit `any`, no unchecked null access. `strict: true` is non-negotiable (discovery constraint). CI runs `tsc --strict --noEmit` before tests.
- **Return types must be explicit on all exported functions.** Inferred return types are permitted on file-local helpers only.

### Queue (`queue/`)

- **Queue semantics are folder-move atomics.** Tasks move from `inbox/` → `review/` → `quality-review/` → `done/` via `fs.renameSync`. No other queue implementation is permitted in the prototype phase. See ADR-005.
- **Every queue transition is recorded in `queue/history.jsonl`.** Task ID, from-folder, to-folder, and ISO timestamp are mandatory on every transition entry. Missing a transition entry is a data integrity defect.
- **Queue folders (`inbox/`, `review/`, `quality-review/`, `done/`) are created by `init-queue.js` only.** Agent scripts must not create queue folders on demand — they must fail if the queue is not initialised. This keeps the initialisation concern separated from the execution concern.

### Testing Discipline

- **Unit tests live in `tests/unit/`, integration tests in `tests/integration/`.** No mixing. Unit tests exercise pure functions in isolation. Integration tests exercise agent scripts via `spawnSync` against real filesystem fixtures.
- **Integration tests use real filesystem fixtures, not mocks.** Testing queue transitions with mock `fs` calls does not give confidence in real behaviour — use `tmp` directories and real `fs` operations. See S1 integration test pattern.
- **No test framework beyond Jest.** No Mocha, no Chai, no sinon. Jest's built-in matchers and `spawnSync` are sufficient for this prototype.
- **CI must pass (unit + integration) before any story branches are merged.** A branch that breaks the existing test suite requires a fix before merge — not a workaround.

---

## Prototype Anti-Patterns

| Anti-pattern | Reason | Approved alternative |
|---|---|---|
| Hardcoded skill file path in an agent script | Breaks auditability — changing the skill version leaves no trace | Resolve from `skills-registry.json` at runtime |
| `execSync` with shell string for agent invocation in tests | Path spaces cause arg splitting; `execSync` spawns a shell layer with unpredictable quoting | `spawnSync(process.execPath, [TS_NODE_BIN, agentFile])` |
| Agent `main()` executing at module import time | Crashes Jest workers before fixtures are set up | Guard with `if (require.main === module)` |
| `fs.writeFileSync` on the trace log | Truncates prior entries; destroys audit trail integrity | `fs.appendFileSync` only |
| Inline trace field definitions not in `src/types/trace.ts` | Schema diverges from the interface; `tsc` won't catch it | Define all trace types in `src/types/trace.ts`; import from there |
| Any `any` type | Defeats the purpose of TypeScript strict mode; hides governance logic errors | Use explicit types; if a type is genuinely unknown, use `unknown` and narrow it |
| Sharing state between agents via anything other than the trace log file | Violates cold-start independence; corrupts the isolation claim | Write to trace log; next agent reads from trace log only |
| Creating queue folders in agent scripts | Conflates initialisation with execution; makes agents non-idempotent on a cold machine | Call `init-queue.js` before running agents |
| Credentials, tokens, or org data in any committed file | Violates discovery constraint ("publicly shareable"); security risk | Use environment variables; document required env vars in README |

---

## Pattern Library

**N/A** — no external component library. The viz is intentionally self-contained (no npm dependencies at runtime).

---

## Style Guide

**Viz (`pipeline-viz.html`):**
- All styles live in the inline `<style>` block — no external CSS files
- CSS custom properties (`--var-name`) for all colours and spacing values
- No CSS frameworks (Bootstrap, Tailwind, etc.) — keep the file self-contained
- Class names use kebab-case (`.feature-card`, `.governance-gate`)

**Scripts (`.github/scripts/`):**
- Plain Node.js — no TypeScript, no transpilation
- No external npm dependencies in pre-commit hooks (must run with only `node` available)
- CommonJS modules (`require`) unless the whole repo adopts ESM (see ADR-001)

**Skill and template files (`.github/skills/`, `.github/templates/`):**
- Markdown only — no embedded HTML except HTML comments for instructions
- Follow the established section headings used in existing files
- No trailing whitespace; Unix line endings

---

## Reference Implementations

| Capability | Reference path | Notes |
|---|---|---|
| Feature card rendering | `.github/pipeline-viz.html` — `featureCardHTML()` | Pattern for how state fields map to UI elements |
| Governance gate evaluation | `.github/pipeline-viz.html` — `evaluateGate()` | Pattern for reading state fields and producing pass/warn/fail |
| JSON schema definition | `.github/pipeline-state.schema.json` | All new state fields must be added here before being used |
| Pre-commit validation | `.github/scripts/check-viz-syntax.js` | Pattern for adding new validators |
| Skill structural contracts | `.github/scripts/check-skill-contracts.js` | Defines required markers per skill; extend when adding structural invariants |
| Pipeline artefact path consistency | `.github/scripts/check-pipeline-artefact-paths.js` | Validates writer/reader path links across all skills; update PIPELINE_PATHS when a skill changes its output path |

---

## Approved Patterns

- **Viz architecture:** Single-file HTML — all JS, CSS, and markup inline in `pipeline-viz.html`. No build step. No external runtime dependencies.
- **State access in viz:** Read from the parsed `pipelineState` global — never fetch or import. State is loaded via `<script>` tag injection or `fetch('./pipeline-state.json')`.
- **Gate logic:** Gate pass/fail is determined by reading specific evidence fields from `pipeline-state.json` stories — not by checking `feature.stage` alone (see ADR-002).
- **Schema evolution:** Add new fields to `pipeline-state.schema.json` at the same time as adding them to any skill or viz code that reads or writes them. Schema and implementation stay in sync.
- **Config reading in skills:** Skills read `.github/context.yml` for org/tooling config. Never hardcode tool names, branch names, or org labels in skill instruction text — use `context.yml` fields.

---

## Anti-Patterns

| Anti-pattern | Reason | Approved alternative |
|---|---|---|
| Gate logic that only checks `feature.stage` | Stage can be manually set — produces false passes | Read specific evidence fields (`reviewStatus`, `dorStatus`, `dodStatus`, etc.) |
| Hardcoding org/tool names in skill files | Breaks when context changes; violates configurability | Use `context.yml` fields via the skill's config-reading step |
| External CDN dependencies in viz at runtime | Breaks offline use; supply chain risk | Bundle or inline, or omit |
| Adding fields used by viz/skills but not in schema | Schema becomes stale; validators miss them | Add to `pipeline-state.schema.json` simultaneously |
| Committing changes to `pipeline-viz.html` without passing `check-viz-syntax.js` | Breaks the pre-commit gate silently | Run `node .github/scripts/check-viz-syntax.js` locally before committing |
| Deleting or mutating pipeline artefacts in `pipeline-state.json` directly | Can corrupt feature history | Use skills to write state; manual edits only for scaffolding |

---

## Mandatory Constraints

### Correctness
- All new governance gate logic in the viz must read at least one evidence field from `pipeline-state.json` (not stage alone)
- Any field written to `pipeline-state.json` by a skill must exist in `pipeline-state.schema.json`
- Any field read by the viz from `pipeline-state.json` must exist in `pipeline-state.schema.json`

### Self-containment
- `pipeline-viz.html` must open and render correctly without any build step, server, or network access
- No npm `devDependencies` may be added to `pipeline-viz.html` at runtime; pre-commit scripts may use Node.js built-ins only

### Security
- No user-supplied content is ever injected into innerHTML without sanitisation
- No credentials, tokens, or personal data in `pipeline-state.json` or any committed artefact
- The viz reads local JSON only — no external fetch calls

### Consistency
- When a skill adds or removes a pipeline stage, the `stage` enum in `pipeline-state.schema.json` is updated in the same commit
- When a governance gate is added or removed from `GOVERNANCE_GATES` in the viz, the corresponding skill's SKILL.md is reviewed to confirm the gate criteria matches the skill's actual checks

### Accessibility
- All interactive elements in the viz must be keyboard-accessible
- Colour alone must not be the only indicator of gate pass/fail/warn status (icons or labels must also be present)

---

## Active Repo-Level ADRs

| # | Status | Title | Constrains |
|---|---|---|---|
| ADR-001 | Active | Single-file viz, no build step | `pipeline-viz.html` architecture |
| ADR-002 | Active | Gates must use evidence fields, not stage-proxy | All `evaluateGate()` implementations |
| ADR-003 | Active | Schema-first: fields defined before use | `pipeline-state.schema.json` evolution |
| ADR-004 | Active | `context.yml` is the single config source of truth | Skill files, viz config reading |
| ADR-005 | Active | Filesystem folder-move is the queue implementation | All agent queue interactions |
| ADR-006 | Active | Trace log is append-only; `fs.appendFileSync` is the only write path | `src/agents/*.ts`, `src/lib/*.ts` |
| ADR-007 | Active | TypeScript strict mode — mandatory, no exceptions | All `src/**/*.ts` files |

---

### ADR-001: Single-file viz, no build step

**Status:** Active
**Date:** 2026-03-22
**Decided by:** Repo owner

#### Context
The viz tool needs to be usable by anyone with a browser and a local clone — no Node, no npm install, no build step. It is a supporting tool for the pipeline, not a product.

#### Decision
`pipeline-viz.html` is a single self-contained file. All JS, CSS, and markup are inline. No external runtime npm dependencies. No bundler (webpack, vite, esbuild).

#### Consequences
**Easier:** Zero setup to open and use. No dependency drift. No build pipeline to maintain.
**Harder / constrained:** No TypeScript, no CSS modules, no component framework. File will be long — acceptable for a tool, not a product.
**Off the table:** React, Vue, Angular. Any approach that requires `npm install` to render.

#### Revisit trigger
If the viz grows beyond ~3000 lines and maintainability is significantly impacted, introduce a simple build step that still produces a single deployable `.html` output.

---

### ADR-002: Governance gates must use evidence fields, not stage-proxy

**Status:** Active
**Date:** 2026-03-22
**Decided by:** Repo owner

#### Context
Early gate implementations checked only `feature.stage >= X` to infer a gate was passed. This allows false passes when a stage is manually set without running the corresponding skill.

#### Decision
Each governance gate's `evaluateGate()` function must read at least one evidence field from the story or feature in `pipeline-state.json` (e.g. `reviewStatus`, `dorStatus`, `dodStatus`). Stage-only checks are permitted as a fallback for gates where no evidence field exists yet, but must be marked with a `// TODO: replace with evidence field` comment.

#### Consequences
**Easier:** Gates accurately reflect skill execution, not just stage progression.
**Harder / constrained:** Skills must write evidence fields. Schema must define them.
**Off the table:** Pure stage-proxy gate logic for any gate that has a corresponding evidence field in the schema.

#### Revisit trigger
If the evidence field approach creates too much write overhead for skills, re-evaluate a hybrid model.

---

### ADR-003: Schema-first — fields defined before use

**Status:** Active
**Date:** 2026-03-22
**Decided by:** Repo owner

#### Context
Audit found multiple fields used by the viz and skills that are absent from `pipeline-state.schema.json`, making them invisible to validators and IDE tooling.

#### Decision
Any new field written to `pipeline-state.json` by a skill, or read by the viz, must be added to `pipeline-state.schema.json` in the same commit. Schema is the contract between skills and viz.

#### Consequences
**Easier:** IDE autocomplete, JSON validation, and audit tooling all work correctly.
**Harder / constrained:** Small additional overhead when adding new state fields.
**Off the table:** Fields used in production code (skills, viz) that are not in the schema.

#### Revisit trigger
If the schema validation tooling is replaced with something not relying on JSON Schema, re-evaluate the schema-first constraint.

---

### ADR-004: `context.yml` is the single config source of truth

**Status:** Active
**Date:** 2026-03-22
**Decided by:** Repo owner

#### Context
Governance audit found org/tool names hardcoded in skill files and the viz having its own governance config disconnected from `context.yml`. Multiple "regulated" signals existed with no bridge.

#### Decision
`.github/context.yml` is the canonical config file. Skills read it for all org-specific labels, tool integrations, compliance frameworks, and regulated-flag status. The viz reads `pipeline-state.json` for feature-level state but must not hardcode values that belong in `context.yml`. Bridges between `context.yml` and the viz state (e.g. regulated default) should be implemented via the pipeline-state write path, not by the viz fetching `context.yml` directly.

#### Consequences
**Easier:** Switching from personal to work context requires one file copy. All downstream config flows from one place.
**Harder / constrained:** Skills need a config-reading step. Viz cannot directly read `context.yml` (browser YAML parsing adds complexity).
**Off the table:** Hardcoded org names, tool URLs, or compliance framework names in skill instruction text or viz JS constants.

#### Revisit trigger
If the viz gains a server-side rendering layer, direct `context.yml` reading becomes feasible and should be adopted.

---

### ADR-005: Filesystem folder-move is the queue implementation

**Status:** Active
**Date:** 2026-03-31
**Decided by:** Hamish (DL-006)

#### Context
The original prototype design used Mission Control as the queue mechanism. During S1 scoping, Mission Control's alpha instability and Docker dependency were evaluated as risks. A filesystem queue using folder-moves and JSON task files was chosen as the replacement — simpler, no external dependencies, one Docker Compose command to start the full stack.

#### Decision
Task lifecycle is expressed as atomic `fs.renameSync` moves between five folders: `inbox/` → `review/` → `quality-review/` → `done/` (reject path: any stage → `inbox/` on assurance escalate). Task files are JSON. Every transition is appended to `queue/history.jsonl`. There is no database, message broker, or HTTP queue.

#### Consequences
**Easier:** No external service dependencies in development. Queue state is inspectable with any text editor. Deterministic for test fixtures.
**Harder / constrained:** Not concurrent-safe (single-user prototype only). Not durable across system crashes. Not production-ready.
**Off the table:** Any queue mechanism that requires a running service (Redis, RabbitMQ, SQS) or persistent process (MC, Kafka) for the S1–S7 phase.

#### Revisit trigger
When the governance loop is proved end-to-end (S7 complete) and model calls are added (S8+), evaluate replacing the filesystem queue with Mission Control or a lightweight message broker if concurrency or durability is required by the next phase.

---

### ADR-006: Trace log is append-only; `fs.appendFileSync` is the only permitted write path

**Status:** Active
**Date:** 2026-03-31
**Decided by:** Hamish / Copilot (established in S4, formalised in S6)

#### Context
The governance claim depends on the integrity of the trace log. If prior trace entries can be silently modified after the assurance record is written, the audit trail is not trustworthy. This requires both a write-path constraint (how entries are added) and a tamper-evidence mechanism (how modification is detected). The write-path constraint is architectural; the tamper-evidence mechanism is an AC of S6.

#### Decision
All writes to any trace log file (`trace.jsonl`, `queue/history.jsonl`, or any file named `*.jsonl`) use `fs.appendFileSync` exclusively. `fs.writeFileSync`, `fs.createWriteStream` with flags other than `'a'`, and any method that truncates or overwrites are prohibited on trace files. Additionally, `criteriaResults` field-level integrity must be addressed by the S6 tamper-evidence mechanism — hash-only protection is insufficient (DL-010).

#### Consequences
**Easier:** Audit trail is structurally append-only; accidental truncation is prevented at the code level.
**Harder / constrained:** No in-place correction of trace entries — corrections must be new entries. Requires discipline in S8+ when model response is added to the trace (model response must be appended, never re-written).
**Off the table:** Any write operation that opens a trace file with mode `'w'` or equivalent.

#### Revisit trigger
If a formal cryptographic trace integrity mechanism is introduced (e.g. Merkle tree, hash chain, immutable append-only store), the `fs.appendFileSync` constraint can be relaxed in favour of the stronger mechanism — but only after that mechanism is in place and tested.

---

### ADR-007: TypeScript strict mode — mandatory, no exceptions

**Status:** Active
**Date:** 2026-03-30
**Decided by:** Hamish (discovery constraint)

#### Context
The governance prototype's value proposition depends on the implementation being verifiable and auditable. Loose typing makes function contracts ambiguous, hides implicit `any` in governance logic (criteria evaluation, hash verification, trace validation), and reduces the legibility of the codebase to future reviewers. Strict mode was a discovery-level constraint before the first story was written.

#### Decision
`tsconfig.json` must have `"strict": true`. CI runs `tsc --strict --noEmit` before any test run. A branch that introduces a TypeScript strict-mode error blocks CI. No `@ts-ignore` or `@ts-expect-error` suppressions are permitted without a code comment explaining why the suppression is necessary and a linked issue to remove it. `any` types in public function signatures (exported from a module) are a blocking review finding.

#### Consequences
**Easier:** The type system documents the governance logic contracts. Refactors are safer. Reviewers can read function signatures without tracing through implementation.
**Harder / constrained:** More upfront typing work. Third-party libraries without TypeScript types require `@types/` packages or explicit typed wrappers.
**Off the table:** JavaScript files (`.js`) under `src/`. Incremental migration mode (`allowJs`). `"strict": false` or partial-strict workarounds (`strictNullChecks: false`).

#### Revisit trigger
Not applicable. If TypeScript is replaced entirely (e.g. the prototype is ported to Python for an enterprise context), define equivalent static analysis requirements before dropping this constraint.

---

## Guardrails Registry

<!--
  GUARDRAILS_REGISTRY — Machine-parseable guardrail index.
  
  This block is read by:
  - pipeline-viz.html (Guardrails Compliance sub-panel in governance view)
  - /review skill (Category E checklist)
  - /definition-of-ready (H9 guardrail compliance check)
  - /trace (architecture compliance check)
  
  Each guardrail has a unique ID, category, and short label.
  Skills evaluate each applicable guardrail and write the result to
  feature.guardrails[] in pipeline-state.json.
  
  Categories:
    mandatory-constraint  — from Mandatory Constraints section above
    adr                   — from Active Repo-Level ADRs above
    pattern               — from Approved Patterns above
    anti-pattern          — from Anti-Patterns above
  
  NFR and compliance-framework items are NOT listed here — they come from
  artefacts/[feature]/nfr-profile.md and config.governance.complianceFrameworks
  respectively, and are added dynamically per feature.
  
  Format: YAML block fenced with ```yaml guardrails-registry / ```.
  The viz parses this block from the fetched .md file at runtime.
-->

```yaml guardrails-registry
- id: MC-SEC-01
  category: mandatory-constraint
  label: "No user-supplied content in innerHTML without sanitisation"
  section: Security

- id: MC-SEC-02
  category: mandatory-constraint
  label: "No credentials, tokens, or personal data in committed files"
  section: Security

- id: MC-SEC-03
  category: mandatory-constraint
  label: "Viz reads local JSON only — no external fetch calls"
  section: Security

- id: MC-CORRECT-01
  category: mandatory-constraint
  label: "Gate logic reads evidence fields from pipeline-state.json (not stage alone)"
  section: Correctness

- id: MC-CORRECT-02
  category: mandatory-constraint
  label: "Fields written to pipeline-state.json must exist in schema"
  section: Correctness

- id: MC-CORRECT-03
  category: mandatory-constraint
  label: "Fields read by viz from pipeline-state.json must exist in schema"
  section: Correctness

- id: MC-SELF-01
  category: mandatory-constraint
  label: "pipeline-viz.html renders without build step, server, or network"
  section: Self-containment

- id: MC-SELF-02
  category: mandatory-constraint
  label: "No npm devDependencies in pipeline-viz.html runtime"
  section: Self-containment

- id: MC-CONSIST-01
  category: mandatory-constraint
  label: "Stage enum in schema updated when skill adds/removes stage"
  section: Consistency

- id: MC-CONSIST-02
  category: mandatory-constraint
  label: "Gate add/remove synced with SKILL.md criteria"
  section: Consistency

- id: MC-A11Y-01
  category: mandatory-constraint
  label: "Interactive elements keyboard-accessible"
  section: Accessibility

- id: MC-A11Y-02
  category: mandatory-constraint
  label: "Colour not sole indicator of gate status (icons/labels present)"
  section: Accessibility

- id: ADR-001
  category: adr
  label: "Single-file viz, no build step"
  section: Active ADRs

- id: ADR-002
  category: adr
  label: "Gates must use evidence fields, not stage-proxy"
  section: Active ADRs

- id: ADR-003
  category: adr
  label: "Schema-first: fields defined before use"
  section: Active ADRs

- id: ADR-004
  category: adr
  label: "context.yml is the single config source of truth"
  section: Active ADRs

- id: PAT-01
  category: pattern
  label: "Single-file HTML viz architecture"
  section: Approved Patterns

- id: PAT-02
  category: pattern
  label: "State access via parsed pipelineState global"
  section: Approved Patterns

- id: PAT-03
  category: pattern
  label: "Gate pass/fail by evidence fields"
  section: Approved Patterns

- id: PAT-04
  category: pattern
  label: "Schema evolution: add fields simultaneously"
  section: Approved Patterns

- id: PAT-05
  category: pattern
  label: "Config reading via context.yml"
  section: Approved Patterns

- id: AP-01
  category: anti-pattern
  label: "Gate logic checking feature.stage only"
  section: Anti-Patterns

- id: AP-02
  category: anti-pattern
  label: "Hardcoded org/tool names in skill files"
  section: Anti-Patterns

- id: AP-03
  category: anti-pattern
  label: "External CDN dependencies in viz at runtime"
  section: Anti-Patterns

- id: AP-04
  category: anti-pattern
  label: "Fields used by viz/skills but not in schema"
  section: Anti-Patterns

- id: AP-05
  category: anti-pattern
  label: "Committing viz changes without passing check-viz-syntax.js"
  section: Anti-Patterns

- id: AP-06
  category: anti-pattern
  label: "Directly mutating pipeline-state.json outside skills"
  section: Anti-Patterns
```
