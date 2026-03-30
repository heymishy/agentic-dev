# Story: Assurance agent runs cold-start, validates both traces, confirms hashes, emits assurance record

**Epic reference:** `artefacts/2026-03-30-agentic-sdlc-prototype/epics/agent-loop-and-governance-layer.md`
**Discovery reference:** `artefacts/2026-03-30-agentic-sdlc-prototype/discovery.md`
**Benefit-metric reference:** `artefacts/2026-03-30-agentic-sdlc-prototype/benefit-metric.md`

## User Story

As an **external regulator**,
I want the assurance agent to be invoked with no access to the sessions in which the
dev and review agents ran — loading the same versioned skill files from the same
local filesystem, reading only the trace log, and independently validating both trace
entries against their respective skills before emitting a complete assurance record —
So that the governance loop is cryptographically closed: the assurance record proves
the same versioned policy documents that governed the original decisions also governed
the validation of those decisions, without any implicit shared context that would make
the assurance correlated rather than independent, directly closing M2 (traceability)
for all three legs of the loop and laying the foundation for M3 (failure detection)
in S5.

## Benefit Linkage

**Metric moved:** M2 — Per-decision traceability to versioned skill; M3 — Assurance
detects injected criterion failure (foundational — S5 tests failure modes; this story
establishes the independent validation mechanism those tests verify)
**How:** After this story, all three trace entries exist and the assurance record
confirms both prompt hashes match the registered skill versions. M2 is now 100%
measurable across the complete loop. M3 becomes testable in S5 because this story
provides the independent validation path S5's injection test will exercise.

## Architecture Constraints

- TypeScript strict mode (discovery constraint)
- **Cold-start independence is a hard architectural rule:** the assurance agent script
  must be invoked in a clean context — no shared in-memory state, no access to the
  session variables, conversation context, or execution environment of the dev or
  review agents; the trace log file is the only allowed input from prior agents
- Trace schema interface (`src/types/trace.ts` from S2) — assurance agent reads both
  prior trace entries and must validate them against the schema before processing
- The assurance agent loads skill files independently: it reads `feature-dev` SKILL.md
  and `feature-review` SKILL.md directly from the filesystem and computes their hashes
  independently — it does not use hashes computed by any prior agent
- Skills read from local filesystem only (discovery constraint)
- No external system connections; no credentials in code (discovery constraint)
- Fully open / publicly shareable (discovery constraint)
- Cold-start enforcement mechanism must be documented in the README as part of the
  governance record — the independence claim must be verifiable, not asserted

## Dependencies

- **Upstream:** S3 must be complete — the assurance agent requires both the dev trace
  (S2) and the review trace (S3) to be present in the trace log before it can proceed
- **Downstream:** S5 (injected failure detection) exercises the assurance path built
  in this story; this story must be complete before S5 can run its formal test protocol

## Acceptance Criteria

**AC1:** Given both the dev agent trace and the review agent trace exist in the trace
  log, When the assurance agent script is invoked, Then it reads both trace entries
  from the trace log file only — with no access to any prior agent's execution context
  — and confirms both entries conform to `src/types/trace.ts` before proceeding.

**AC2:** Given the assurance agent has read the dev agent's trace, When it validates
  the dev trace, Then it independently loads `feature-dev` SKILL.md from the local
  filesystem, computes SHA-256 of its raw bytes, and compares the result to the prompt
  hash in the dev trace — recording `dev-hash-match: true` or `dev-hash-match: false`
  explicitly in its assurance record.

**AC3:** Given the assurance agent has read the review agent's trace, When it validates
  the review trace, Then it independently loads `feature-review` SKILL.md from the
  local filesystem, computes its hash, compares it to the prompt hash in the review
  trace, confirms the review trace's hash-match result for the dev trace, and records
  both results in its assurance record.

**AC4:** Given both validations are complete and all hashes match, When the assurance
  agent emits its assurance record, Then the record contains: agent identity
  (`assurance`), `feature-assurance` skill name and version, assurance agent's own
  prompt hash, dev-hash-match result, review-hash-match result, summary of all criteria
  outcomes across both traces, overall assurance verdict (`closed` / `escalate`), and
  timestamp — and the task is moved to Done in Mission Control.

**AC5:** Given the assurance agent has completed its run, When the cold-start
  independence mechanism is inspected, Then there is a documented, verifiable mechanism
  (e.g. separate process invocation, no shared module-level state, explicit context
  boundary) that prevents the assurance agent from accessing the dev or review agents'
  execution context — and this mechanism is referenced in the README.

## Decisions Gate — must close during this story

> ⚠️ **[/decisions item — open before S4 implementation begins]**
> **Decision required: cold-start independence mechanism**
> AC5 defers the mechanism choice to implementation (separate process invocation /
> no shared module-level state / explicit context boundary). This decision must be
> logged via `/decisions` and closed **before S4 is marked done** — not at S7.
> Rationale: S7 README must describe the cold-start mechanism in plain language as
> the prototype's primary governance claim. If the mechanism is undecided when S7
> begins, the README will have a placeholder where the most important governance
> sentence should be. The decision is irreversible once S5 and S6 use it.

## Out of Scope

- Deliberate failure injection testing — that is S5; this story proves the happy path
  and establishes the mechanism; S5 proves it detects failures
- Automated hash resolution tooling — manual verification is sufficient for the
  prototype (M2 feedback loop note); no automated comparison script required here
- Escalation notification workflows — excluded per discovery out-of-scope item 5;
  `escalate` verdict is recorded in the assurance record but triggers no notification

## NFRs

- **Integrity:** The assurance agent must not write to or modify either prior trace
  entry; the trace log must be identical before and after assurance agent invocation
  except for the appended assurance record
- **Security:** No credentials or organisational data; all scripts runnable on a
  personal machine with only public tooling
- **Verifiability:** The cold-start independence mechanism must be described in enough
  detail in the README that a sceptical reviewer can verify it without running the code

## Complexity Rating

**Rating:** 2
**Scope stability:** Stable — the assurance agent's behaviour is fully specified.
The primary risk is the cold-start independence requirement: in a single-operator
environment using GitHub Copilot, implicit context contamination is possible if
all three agents are invoked within the same session. The architectural rule and
documentation requirement in AC5 address this, but it remains the most
conceptually sensitive constraint in the story.
