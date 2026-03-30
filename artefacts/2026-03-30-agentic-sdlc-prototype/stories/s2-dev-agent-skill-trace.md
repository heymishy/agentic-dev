# Story: Dev agent loads skill, self-checks against falsifiable criteria, emits trace

**Epic reference:** `artefacts/2026-03-30-agentic-sdlc-prototype/epics/agent-loop-and-governance-layer.md`
**Discovery reference:** `artefacts/2026-03-30-agentic-sdlc-prototype/discovery.md`
**Benefit-metric reference:** `artefacts/2026-03-30-agentic-sdlc-prototype/benefit-metric.md`

## User Story

As an **engineering lead**,
I want the dev agent to load the `feature-dev` skill from the local filesystem,
compute a SHA-256 hash of its content, check the completed work against every
falsifiable criterion defined in that skill, and emit a structured trace entry
containing the skill name, version, prompt hash, and per-criterion pass/fail results,
So that every implementation decision the dev agent makes is governed by an executable,
versioned policy — not a document — and the trace proves which policy version was
active at the time of execution, directly advancing M2 (per-decision traceability to
versioned skill).

## Benefit Linkage

**Metric moved:** M2 — Per-decision traceability to versioned skill
**How:** Prior to this story, no trace exists. After this story, the dev agent's trace
entry contains all three fields required by M2 (skill name, version, prompt hash that
resolves to a specific committed file). This is the first story that makes M2
measurable for the dev agent leg of the loop.

## Architecture Constraints

- TypeScript strict mode — mandatory (discovery constraint)
- Skills read from local filesystem only — the `feature-dev` skill file path must be
  configurable but defaults to the local skills-repo clone; no API-based skill
  resolution (discovery constraint)
- **Skills authority registry:** A `skills-registry.json` file at the repository root
  maps skill names (e.g. `feature-dev`, `feature-review`, `feature-assurance`) to their
  relative filesystem paths. Format: `{ "skill-name": "./relative/path/SKILL.md" }`. All
  agent scripts resolve skill file paths from this registry — never by hardcoding paths.
  This file is committed as part of the prototype repository. It is the authority
  registry: changing which file is `feature-dev` requires updating this file, making
  skill version changes auditable.
- Prompt hash must be computed using SHA-256 over the raw file bytes; hash algorithm
  must be documented explicitly in the trace entry and in the README so it can be
  independently verified
- Trace entries are append-only — S6 will formally verify this; this story must not
  introduce any mechanism that modifies a written trace entry
- Trace schema must be defined in a TypeScript interface (strict mode) and committed
  as `src/types/trace.ts` — all subsequent agent trace entries must conform to the
  same interface
- No external system connections; no credentials in code (discovery constraint)
- Fully open / publicly shareable (discovery constraint)

## Dependencies

- **Upstream:** S1 must be complete — this story builds on the confirmed agent
  invocation pattern and queue semantics proved in S1
- **Downstream:** S3 (Review agent) reads and validates the trace this story produces;
  S4 (Assurance agent) independently verifies it

## Acceptance Criteria

**AC1:** Given the `feature-dev` SKILL.md file exists at the configured local path,
  When the dev agent script is invoked, Then it reads the file, computes a SHA-256 hash
  of its raw bytes, and stores both the hash and the file path in memory before
  performing any work.

**AC2:** Given the dev agent has completed its implementation work (producing an
  implementation file, a test file, and a changelog entry), When it evaluates its
  output against the falsifiable criteria in the `feature-dev` skill, Then it produces
  a per-criterion result list where each entry contains: criterion text, result (pass /
  fail / not-applicable), and — for any fail — a reason string.

**AC3:** Given the criteria evaluation is complete, When the dev agent emits its trace
  entry, Then the trace entry contains all of: agent identity (`dev`), skill name,
  skill version (from a `version:` field in the SKILL.md frontmatter or filename
  convention), prompt hash (SHA-256 hex string), hash algorithm identifier (`sha256`),
  criteria results array, overall decision outcome (`proceed` / `reject`), and ISO 8601
  timestamp.

**AC4:** Given the trace entry has been written, When the raw trace file is opened and
  the prompt hash is independently verified by computing SHA-256 on the current
  `feature-dev` SKILL.md file on disk, Then the hashes match — confirming the trace
  records the exact policy content that governed the decision.

**AC5:** Given a `feature-dev` SKILL.md that contains at least one criterion the
  completed work does not satisfy, When the dev agent evaluates its output, Then the
  criterion appears as `fail` in the criteria results and the decision outcome is
  `reject` — the agent does not proceed to move the task to Review when a criterion
  fails.

**AC6:** Given the prototype repository is cloned and the skills-repo is present at
  the path specified in `skills-registry.json`, When `skills-registry.json` exists at
  the repository root and maps `feature-dev`, `feature-review`, and `feature-assurance`
  to their respective SKILL.md paths, Then all three agents resolve skill file paths
  by reading this registry — not from hardcoded paths — and `skills-registry.json`
  is committed to the repository as an explicit deliverable.

## Out of Scope

- Review of the dev agent's trace by any other agent — that is S3 (Review agent)
- Assurance validation — that is S4
- Automated hash verification tooling — manual independent verification is sufficient
  for this story; automation is a next-phase hardening item (per M2 feedback loop note)
- Changes to the criteria defined in `feature-dev` SKILL.md — the skill content is
  fixed for this story; evolving skill content is a post-prototype concern
- Trace tamper-evidence mechanism — established in S6

## NFRs

- **Security:** No credentials or organisational data in any script or trace entry;
  trace files must not contain anything that couldn't be shared publicly
- **Performance:** Skill file hashing and criteria evaluation complete in under 2
  seconds on a standard laptop
- **Integrity:** The trace schema TypeScript interface (`src/types/trace.ts`) is
  committed and all required fields are non-optional — the TypeScript compiler
  enforces completeness at build time

## Complexity Rating

**Rating:** 2
**Scope stability:** Stable — skill loading, hashing, and trace emission are
well-specified. The only unknown is whether the criteria in `feature-dev` SKILL.md are
genuinely machine-checkable by the agent without human judgement (discovery assumption
4). If any criterion requires interpretation, it must be rewritten before this story
can pass AC2.
